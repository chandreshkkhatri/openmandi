import { eq, and, sql, asc, desc } from "drizzle-orm";
import { orders, wallets, transactions, positions } from "@/lib/db/schema";
import { PAIRS } from "@/lib/trading/constants";
import type { PairKey, FuturesPair } from "@/lib/trading/constants";
import type { Fill, MatchResult, OrderStatus } from "@/lib/trading/types";
import {
  calculateInitialMargin,
  calculateLiquidationPrice,
  calculateNotional,
} from "./margin";

type Tx = Parameters<Parameters<typeof import("@/lib/db").db.transaction>[0]>[0];

/**
 * Match an incoming order against resting orders in the book.
 * Runs within a DB transaction — the caller wraps this.
 */
export async function matchOrder(
  tx: Tx,
  incoming: {
    id: string;
    userId: string;
    pair: PairKey;
    side: "buy" | "sell";
    type: "limit" | "market";
    price: string | null;
    quantity: string;
  }
): Promise<MatchResult> {
  const opposingSide = incoming.side === "buy" ? "sell" : "buy";

  // For buy: match against cheapest asks first (ASC)
  // For sell: match against highest bids first (DESC)
  const priceOrder = incoming.side === "buy" ? asc(orders.price) : desc(orders.price);

  const restingOrders = await tx
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.pair, incoming.pair),
        eq(orders.side, opposingSide),
        sql`${orders.status} IN ('open', 'partial')`,
        sql`${orders.price} IS NOT NULL`
      )
    )
    .orderBy(priceOrder, asc(orders.createdAt))
    .for("update");

  const fills: Fill[] = [];
  let remainingQty = parseFloat(incoming.quantity);
  const pairConfig = PAIRS[incoming.pair];

  for (const resting of restingOrders) {
    if (remainingQty <= 0) break;

    // Self-trade prevention
    if (resting.userId === incoming.userId) continue;

    const restingPrice = parseFloat(resting.price!);

    // Price check for limit orders
    if (incoming.type === "limit" && incoming.price !== null) {
      const incomingPrice = parseFloat(incoming.price);
      if (incoming.side === "buy" && restingPrice > incomingPrice) break;
      if (incoming.side === "sell" && restingPrice < incomingPrice) break;
    }

    // Fill at maker's price
    const restingRemaining =
      parseFloat(resting.quantity) - parseFloat(resting.filledQuantity);
    const fillQty = Math.min(remainingQty, restingRemaining);
    const executePrice = restingPrice;

    // Calculate fees (all pairs are futures with contractSize)
    const feeBase = calculateNotional(
      fillQty.toString(),
      pairConfig.contractSize,
      executePrice.toString()
    );

    const makerFee = feeBase * parseFloat(pairConfig.makerFeeRate);
    const takerFee = feeBase * parseFloat(pairConfig.takerFeeRate);

    fills.push({
      makerOrderId: resting.id,
      makerUserId: resting.userId,
      price: executePrice.toFixed(8),
      quantity: fillQty.toFixed(8),
      makerFee: makerFee.toFixed(8),
      takerFee: takerFee.toFixed(8),
    });

    // Update resting order
    const newFilledQty = parseFloat(resting.filledQuantity) + fillQty;
    const restingFullyFilled =
      Math.abs(newFilledQty - parseFloat(resting.quantity)) < 1e-8;

    await tx
      .update(orders)
      .set({
        filledQuantity: newFilledQty.toFixed(8),
        status: restingFullyFilled ? "filled" : "partial",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, resting.id));

    remainingQty -= fillQty;
  }

  // Determine incoming order status
  const filledQty = parseFloat(incoming.quantity) - remainingQty;
  let orderStatus: OrderStatus;
  if (remainingQty < 1e-8) {
    orderStatus = "filled";
  } else if (filledQty > 1e-8 && incoming.type === "limit") {
    orderStatus = "partial";
  } else if (incoming.type === "market") {
    orderStatus = remainingQty > 1e-8 ? "cancelled" : "filled";
  } else {
    orderStatus = "open";
  }

  return {
    fills,
    remainingQuantity: remainingQty.toFixed(8),
    orderStatus,
  };
}

/**
 * Settle a futures trade: create/update positions and lock margin.
 */
export async function settleFuturesTrade(
  tx: Tx,
  fill: Fill,
  takerOrder: {
    id: string;
    userId: string;
    side: "buy" | "sell";
    collateralCurrency: string;
    leverage: number;
  },
  pair: FuturesPair
): Promise<void> {
  const pairConfig = PAIRS[pair];
  const fillQty = fill.quantity;
  const fillPrice = fill.price;

  // Process both taker and maker
  const participants = [
    {
      userId: takerOrder.userId,
      side: takerOrder.side,
      fee: fill.takerFee,
      collateralCurrency: takerOrder.collateralCurrency,
      leverage: takerOrder.leverage,
      isTaker: true,
      orderId: takerOrder.id,
    },
    {
      userId: fill.makerUserId,
      side: fill.makerUserId === takerOrder.userId ? takerOrder.side : (takerOrder.side === "buy" ? "sell" : "buy"),
      fee: fill.makerFee,
      // Maker's collateral currency — look up from the resting order
      collateralCurrency: takerOrder.collateralCurrency, // We'll fix this from the order
      leverage: takerOrder.leverage,
      isTaker: false,
      orderId: fill.makerOrderId,
    },
  ];

  // Look up maker's order for correct collateral info
  const [makerOrder] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, fill.makerOrderId));

  if (makerOrder) {
    participants[1].collateralCurrency = makerOrder.collateralCurrency || "USDC";
  }

  for (const p of participants) {
    const positionSide = p.side === "buy" ? "long" : "short";

    // Check for existing opposing position (reduces/closes it)
    const opposingSide = positionSide === "long" ? "short" : "long";
    const [opposingPos] = await tx
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.userId, p.userId),
          eq(positions.contract, pair),
          eq(positions.side, opposingSide),
          eq(positions.status, "open")
        )
      )
      .for("update");

    if (opposingPos) {
      // Close or reduce the opposing position
      const closeQty = Math.min(
        parseFloat(fillQty),
        parseFloat(opposingPos.quantity)
      );

      // Calculate PnL
      const entryNotional = calculateNotional(
        closeQty.toString(),
        pairConfig.contractSize,
        opposingPos.entryPrice
      );
      const exitNotional = calculateNotional(
        closeQty.toString(),
        pairConfig.contractSize,
        fillPrice
      );
      const pnl =
        opposingSide === "long"
          ? exitNotional - entryNotional
          : entryNotional - exitNotional;

      // Release proportional margin
      const marginRelease =
        (closeQty / parseFloat(opposingPos.quantity)) *
        parseFloat(opposingPos.margin);

      const remainingQty = parseFloat(opposingPos.quantity) - closeQty;

      if (remainingQty < 1e-8) {
        // Fully close position
        await tx
          .update(positions)
          .set({
            quantity: "0",
            status: "closed",
            realizedPnl: sql`${positions.realizedPnl} + ${pnl.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(positions.id, opposingPos.id));
      } else {
        // Partially close
        const remainingMargin = parseFloat(opposingPos.margin) - marginRelease;
        await tx
          .update(positions)
          .set({
            quantity: remainingQty.toFixed(8),
            margin: remainingMargin.toFixed(8),
            realizedPnl: sql`${positions.realizedPnl} + ${pnl.toFixed(8)}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(positions.id, opposingPos.id));
      }

      // Credit PnL + margin release to wallet
      const totalCredit = pnl + marginRelease;
      await updateWalletBalance(
        tx,
        p.userId,
        opposingPos.collateralCurrency,
        totalCredit.toFixed(8),
        "margin_release",
        p.orderId
      );

      // If fill quantity exceeds opposing position, create new position for remainder
      const excessQty = parseFloat(fillQty) - closeQty;
      if (excessQty > 1e-8) {
        await createNewPosition(
          tx,
          p,
          pair,
          pairConfig,
          excessQty.toString(),
          fillPrice
        );
      }
    } else {
      // Check for existing same-side position to add to
      const [existingPos] = await tx
        .select()
        .from(positions)
        .where(
          and(
            eq(positions.userId, p.userId),
            eq(positions.contract, pair),
            eq(positions.side, positionSide),
            eq(positions.status, "open")
          )
        )
        .for("update");

      if (existingPos) {
        // Average into existing position
        const existingNotional =
          parseFloat(existingPos.quantity) * parseFloat(existingPos.entryPrice);
        const newNotional = parseFloat(fillQty) * parseFloat(fillPrice);
        const totalQty = parseFloat(existingPos.quantity) + parseFloat(fillQty);
        const avgEntry = (existingNotional + newNotional) / totalQty;

        const additionalMargin = calculateInitialMargin(
          fillQty,
          pairConfig.contractSize,
          fillPrice,
          p.leverage
        );

        const newTotalMargin =
          parseFloat(existingPos.margin) + additionalMargin;
        const newLiqPrice = calculateLiquidationPrice(
          avgEntry.toString(),
          positionSide as "long" | "short",
          p.leverage,
          pairConfig.maintenanceMarginRate
        );

        await tx
          .update(positions)
          .set({
            quantity: totalQty.toFixed(8),
            entryPrice: avgEntry.toFixed(8),
            margin: newTotalMargin.toFixed(8),
            liquidationPrice: newLiqPrice.toFixed(8),
            updatedAt: new Date(),
          })
          .where(eq(positions.id, existingPos.id));

        // Taker's margin was pre-locked at order placement; maker's too
        // Deduct fee
        if (parseFloat(p.fee) > 0) {
          await updateWalletBalance(
            tx,
            p.userId,
            p.collateralCurrency,
            `-${p.fee}`,
            "fee",
            p.orderId
          );
        }
      } else {
        // Create new position
        await createNewPosition(
          tx,
          p,
          pair,
          pairConfig,
          fillQty,
          fillPrice
        );
      }
    }
  }
}

async function createNewPosition(
  tx: Tx,
  participant: {
    userId: string;
    side: string;
    fee: string;
    collateralCurrency: string;
    leverage: number;
    orderId: string;
  },
  pair: FuturesPair,
  pairConfig: {
    contractSize: string;
    maintenanceMarginRate: string;
  },
  quantity: string,
  price: string
): Promise<void> {
  const positionSide = participant.side === "buy" ? "long" : "short";

  const margin = calculateInitialMargin(
    quantity,
    pairConfig.contractSize,
    price,
    participant.leverage
  );

  const liqPrice = calculateLiquidationPrice(
    price,
    positionSide as "long" | "short",
    participant.leverage,
    pairConfig.maintenanceMarginRate
  );

  await tx.insert(positions).values({
    userId: participant.userId,
    contract: pair,
    side: positionSide,
    entryPrice: parseFloat(price).toFixed(8),
    quantity: parseFloat(quantity).toFixed(8),
    margin: margin.toFixed(8),
    collateralCurrency: participant.collateralCurrency,
    leverage: participant.leverage.toFixed(2),
    liquidationPrice: liqPrice.toFixed(8),
  });

  // Deduct fee from wallet
  if (parseFloat(participant.fee) > 0) {
    await updateWalletBalance(
      tx,
      participant.userId,
      participant.collateralCurrency,
      `-${participant.fee}`,
      "fee",
      participant.orderId
    );
  }
}

/**
 * Helper: update wallet balance with SQL arithmetic and record a transaction.
 */
async function updateWalletBalance(
  tx: Tx,
  userId: string,
  currency: string,
  amount: string,
  type: string,
  referenceId: string
): Promise<void> {
  const [wallet] = await tx
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.currency, currency)))
    .for("update");

  if (!wallet) return;

  await tx
    .update(wallets)
    .set({
      balance: sql`${wallets.balance} + ${amount}::decimal`,
      availableBalance: sql`${wallets.availableBalance} + ${amount}::decimal`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, wallet.id));

  // Read back for balanceAfter
  const [updated] = await tx
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.id, wallet.id));

  await tx.insert(transactions).values({
    userId,
    walletId: wallet.id,
    type,
    currency,
    amount,
    balanceAfter: updated.balance,
    referenceId,
    referenceType: type === "fee" ? "trade" : type === "margin_release" ? "position" : "trade",
    description: `${type.replace("_", " ")} — ${currency}`,
  });
}
