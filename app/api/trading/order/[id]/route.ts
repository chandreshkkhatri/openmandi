import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orders, wallets } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { PAIRS } from "@/lib/trading/constants";
import type { PairKey } from "@/lib/trading/constants";
import { calculateInitialMargin } from "@/lib/services/margin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.userId, user.id)))
        .for("update");

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status !== "open" && order.status !== "partial") {
        throw new Error("Only open or partial orders can be cancelled");
      }

      const pairConfig = PAIRS[order.pair as PairKey];
      const unfilledQty =
        parseFloat(order.quantity) - parseFloat(order.filledQuantity);

      // Futures: release locked margin
      const futuresConfig = pairConfig as typeof PAIRS["XAU-PERP"];
      if (order.price) {
        const marginLocked = calculateInitialMargin(
          unfilledQty.toString(),
          futuresConfig.contractSize,
          order.price,
          50
        );
        const estFee =
          marginLocked * 50 * parseFloat(futuresConfig.takerFeeRate);
        const totalRelease = marginLocked + estFee;

        const collateral = order.collateralCurrency || "USDC";
        await tx
          .update(wallets)
          .set({
            availableBalance: sql`${wallets.availableBalance} + ${totalRelease.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(wallets.userId, user.id),
              eq(wallets.currency, collateral)
            )
          );
      }

      // Cancel the order
      const [cancelled] = await tx
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      return cancelled;
    });

    return NextResponse.json({ success: true, order: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cancel failed";
    const isValidation =
      message.includes("not found") || message.includes("Only open");
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
