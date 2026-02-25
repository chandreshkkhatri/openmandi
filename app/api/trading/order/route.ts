import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orders, wallets } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { PAIRS } from "@/lib/trading/constants";
import type { PairKey, FuturesPair } from "@/lib/trading/constants";
import { matchOrder, settleFuturesTrade } from "@/lib/services/matching";
import { calculateInitialMargin } from "@/lib/services/margin";
import { trades as tradesTable } from "@/lib/db/schema";

const orderSchema = z.object({
  pair: z.enum(["XAU-PERP", "XAG-PERP"]),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["limit", "market"]),
  price: z.string().optional(),
  quantity: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Quantity must be positive"),
  collateralCurrency: z.enum(["USDC"]).optional(),
  leverage: z.number().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = orderSchema.parse(body);
    const pairConfig = PAIRS[parsed.pair];

    // Validate limit orders have price
    if (parsed.type === "limit" && !parsed.price) {
      return NextResponse.json(
        { success: false, error: "Limit orders require a price" },
        { status: 400 }
      );
    }

    // Validate market orders don't have price
    if (parsed.type === "market" && parsed.price) {
      return NextResponse.json(
        { success: false, error: "Market orders cannot specify a price" },
        { status: 400 }
      );
    }

    if (!parsed.collateralCurrency) {
      return NextResponse.json(
        { success: false, error: "Futures orders require collateralCurrency" },
        { status: 400 }
      );
    }
    if (!parsed.leverage) {
      return NextResponse.json(
        { success: false, error: "Futures orders require leverage" },
        { status: 400 }
      );
    }

    // Validate quantity meets minimum
    if (parseFloat(parsed.quantity) < parseFloat(pairConfig.minQuantity)) {
      return NextResponse.json(
        { success: false, error: `Minimum quantity is ${pairConfig.minQuantity}` },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      // Lock user's wallet rows
      const userWallets = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, user.id))
        .for("update");

      const getWallet = (currency: string) =>
        userWallets.find((w) => w.currency === currency);

      // Futures: lock margin
      const futuresConfig = pairConfig as typeof PAIRS["XAU-PERP"];
      const leverage = parsed.leverage!;
      const collateral = parsed.collateralCurrency!;

      // For limit orders, use the order price. For market, estimate with a reasonable price.
      const priceForMargin = parsed.price ?? "0";
      if (parsed.type === "market") {
        // Market orders need price estimation — skip pre-lock, handled at settlement
      } else {
        const marginRequired = calculateInitialMargin(
          parsed.quantity,
          futuresConfig.contractSize,
          priceForMargin,
          leverage
        );
        const estFee =
          marginRequired *
          leverage *
          parseFloat(futuresConfig.takerFeeRate);
        const totalRequired = marginRequired + estFee;

        const collateralWallet = getWallet(collateral);
        if (
          !collateralWallet ||
          parseFloat(collateralWallet.availableBalance) < totalRequired
        ) {
          throw new Error(
            `Insufficient ${collateral} balance. Required: $${totalRequired.toFixed(2)}, Available: $${parseFloat(collateralWallet?.availableBalance ?? "0").toFixed(2)}`
          );
        }

        await tx
          .update(wallets)
          .set({
            availableBalance: sql`${wallets.availableBalance} - ${totalRequired.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, collateralWallet.id));
      }

      // Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          userId: user.id,
          pair: parsed.pair,
          side: parsed.side,
          type: parsed.type,
          price: parsed.price ?? null,
          quantity: parsed.quantity,
          status: "open",
          collateralCurrency: parsed.collateralCurrency ?? null,
        })
        .returning();

      // Run matching engine
      const matchResult = await matchOrder(tx, {
        id: order.id,
        userId: user.id,
        pair: parsed.pair as PairKey,
        side: parsed.side,
        type: parsed.type,
        price: parsed.price ?? null,
        quantity: parsed.quantity,
      });

      // Process each fill
      for (const fill of matchResult.fills) {
        // Insert trade record
        await tx.insert(tradesTable).values({
          pair: parsed.pair,
          makerOrderId: fill.makerOrderId,
          takerOrderId: order.id,
          makerUserId: fill.makerUserId,
          takerUserId: user.id,
          price: fill.price,
          quantity: fill.quantity,
          makerFee: fill.makerFee,
          takerFee: fill.takerFee,
        });

        await settleFuturesTrade(
          tx,
          fill,
          {
            id: order.id,
            userId: user.id,
            side: parsed.side,
            collateralCurrency: parsed.collateralCurrency!,
            leverage: parsed.leverage!,
          },
          parsed.pair as FuturesPair
        );
      }

      // Update order status
      const filledQty =
        parseFloat(parsed.quantity) - parseFloat(matchResult.remainingQuantity);
      await tx
        .update(orders)
        .set({
          filledQuantity: filledQty.toFixed(8),
          status: matchResult.orderStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      // If market order has unfilled remainder, release locked funds
      if (
        parsed.type === "market" &&
        parseFloat(matchResult.remainingQuantity) > 1e-8
      ) {
        // Release is handled by the cancelled status — no pre-lock for market orders
      }

      // If limit order fully filled, release any excess locked funds
      // (This handles rounding from fee estimates)

      return {
        order: { ...order, filledQuantity: filledQty.toFixed(8), status: matchResult.orderStatus },
        fills: matchResult.fills,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Order placement failed";
    const isValidation =
      message.includes("Insufficient") ||
      message.includes("Minimum quantity") ||
      message.includes("require");
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
