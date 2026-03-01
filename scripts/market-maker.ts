#!/usr/bin/env npx tsx
/**
 * Open Mandi — Market Maker Bot
 *
 * Mirrors Binance gold/silver prices into the local order book,
 * placing 5 levels per side with increasing spread and size.
 *
 * Usage:
 *   npx tsx scripts/market-maker.ts                # default tag "local"
 *   npx tsx scripts/market-maker.ts --tag=aws-1    # custom tag for multi-instance
 *
 * Env:
 *   OPENMANDI_DATABASE_URL or POSTGRES_URL  — Neon / Postgres connection string (required)
 */

import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
    pgTable,
    uuid,
    text,
    timestamp,
    decimal,
    unique,
} from "drizzle-orm/pg-core";
import { eq, and, gt, or } from "drizzle-orm";
import { createHmac } from "crypto";

import { matchOrder, settleFuturesTrade } from "../lib/services/matching";
import { calculateInitialMargin } from "../lib/services/margin";
import { trades as tradesTable } from "../lib/db/schema";
import type { PairKey, FuturesPair } from "../lib/trading/constants";
import { sql } from "drizzle-orm";

// ─── Env check ───────────────────────────────────────────────────────────────
const DATABASE_URL: string = process.env.OPENMANDI_DATABASE_URL || process.env.POSTGRES_URL || (() => {
    console.error("❌  OPENMANDI_DATABASE_URL or POSTGRES_URL is not set. Add it to .env or .env.local");
    process.exit(1);
})();

// ─── CLI args ────────────────────────────────────────────────────────────────
const TAG =
    process.argv.find((a) => a.startsWith("--tag="))?.split("=")[1] ?? "local";
const DRY_RUN_HEDGE = process.argv.includes("--dry-run-hedge");
const TESTNET       = process.argv.includes("--testnet");

// ─── Binance hedge credentials ────────────────────────────────────────────────
const BINANCE_API_KEY    = process.env.BINANCE_API_KEY ?? "";
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET ?? "";
const BINANCE_FUTURES_BASE = TESTNET
    ? "https://testnet.binancefuture.com"
    : "https://fapi.binance.com";

// ─── Inline schema (no @/ imports — portable) ───────────────────────────────
const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    firebaseUid: text("firebase_uid").unique().notNull(),
    email: text("email").unique().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const wallets = pgTable(
    "wallets",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .references(() => users.id)
            .notNull(),
        currency: text("currency").notNull(),
        balance: decimal("balance", { precision: 18, scale: 8 })
            .default("0")
            .notNull(),
        availableBalance: decimal("available_balance", { precision: 18, scale: 8 })
            .default("0")
            .notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => [unique("wallets_user_currency").on(table.userId, table.currency)]
);

const orders = pgTable("orders", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    pair: text("pair").notNull(),
    side: text("side").notNull(),
    type: text("type").notNull(),
    price: decimal("price", { precision: 18, scale: 8 }),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    filledQuantity: decimal("filled_quantity", { precision: 18, scale: 8 })
        .default("0")
        .notNull(),
    status: text("status").default("open").notNull(),
    collateralCurrency: text("collateral_currency"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const mmOrderStats = pgTable("mm_order_stats", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    pair: text("pair").notNull(),
    side: text("side").notNull(),
    cancelledCount: decimal("cancelled_count").default("0").notNull(),
    cancelledQuantity: decimal("cancelled_quantity", { precision: 18, scale: 8 }).default("0").notNull(),
    avgPrice: decimal("avg_price", { precision: 18, scale: 8 }),
    minPrice: decimal("min_price", { precision: 18, scale: 8 }),
    maxPrice: decimal("max_price", { precision: 18, scale: 8 }),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    deletedCount: decimal("deleted_count").default("0").notNull(),
    retainedCount: decimal("retained_count").default("0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── DB connection ───────────────────────────────────────────────────────────
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool });
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Configuration ───────────────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = 5_000; // 5 seconds

// Spread levels: [spreadPercent, qtyMultiplier]
const LEVELS: [number, number][] = [
    [0.0005, 1], // 0.05%  — 1x
    [0.0010, 2], // 0.10%  — 2x
    [0.0020, 3], // 0.20%  — 3x
    [0.0040, 5], // 0.40%  — 5x
    [0.0080, 8], // 0.80%  — 8x
];

const BASE_QTY_XAU = 10;
const BASE_QTY_XAG = 10;
const LEVERAGE = 10;

// If an existing order's price is within this fraction of the desired price,
// keep it instead of replacing.  E.g. 0.0002 = 0.02% = ~$1 on gold.
const REPRICE_THRESHOLD: Record<string, number> = {
    "XAU-PERP": 0.0002,
    "XAG-PERP": 0.0003,
};

const PAIR_CONFIG = {
    "XAU-PERP": { binanceSymbol: "XAUUSDT", type: "futures", contracts: "0.001", spread: 0.0005, priceDec: 2, takerFeeRate: "0.0005", baseQty: BASE_QTY_XAU },
    "XAG-PERP": { binanceSymbol: "XAGUSDT", type: "futures", contracts: "0.1", spread: 0.001, priceDec: 3, takerFeeRate: "0.0005", baseQty: BASE_QTY_XAG },
} as const;
type PairConfig = (typeof PAIR_CONFIG)[keyof typeof PAIR_CONFIG];

const SYSTEM_EMAIL = `system_mm_${TAG}@openmandi.com`;

// ─── Hedge configuration ─────────────────────────────────────────────────────
const HEDGE_PAIR_MAP: Record<string, {
    binanceSymbol: string;
    contractSize: number;  // oz per contract on our exchange
    qtyPrecision: number;  // Binance qty decimal places
    minNotional: number;   // USD minimum notional per Binance order
}> = {
    "XAU-PERP": { binanceSymbol: "XAUUSDT", contractSize: 0.001, qtyPrecision: 2, minNotional: 5 },
    "XAG-PERP": { binanceSymbol: "XAGUSDT", contractSize: 0.1,   qtyPrecision: 1, minNotional: 5 },
};

// Flush accumulated exposure every N MM ticks (60 × 5s = 5 min)
const HEDGE_FLUSH_EVERY = 60;

// Tracks the last hedge time so we only query new trades since then.
// Initialized to "now" on startup — we don't hedge historical trades.
let lastHedgeTime: Date = new Date();

// Residual unhedged oz per pair (carried over when below min notional)
const residualHedgeOz: Record<string, number> = {};

// Last known mid-prices per pair, updated each tick for notional estimation
const lastHedgePrices: Record<string, number> = {};

// ─── Binance Futures helpers (hedging) ──────────────────────────────────────

function signBinanceQuery(query: string): string {
    return createHmac("sha256", BINANCE_API_SECRET).update(query).digest("hex");
}

async function placeBinanceFuturesMarketOrder(
    symbol: string,
    side: "BUY" | "SELL",
    quantity: string
): Promise<{ orderId: number; avgPrice: string }> {
    const params = new URLSearchParams({
        symbol, side, type: "MARKET", quantity,
        timestamp: Date.now().toString(),
        recvWindow: "5000",
    });
    const signature = signBinanceQuery(params.toString());
    params.append("signature", signature);
    const res = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/order?${params}`, {
        method: "POST",
        headers: { "X-MBX-APIKEY": BINANCE_API_KEY },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Binance Futures error: ${JSON.stringify(body)}`);
    return body as { orderId: number; avgPrice: string };
}

// ─── Hedge: DB-based flush ────────────────────────────────────────────────────

/**
 * Query the trades table for all fills involving the MM since lastHedgeTime,
 * aggregate net oz exposure per pair, and place hedge orders on Binance.
 *
 * This catches ALL fills — whether the MM was taker (order placed by this script)
 * or maker (user's order filled against a resting MM order via the web API).
 *
 * Sub-minimum-notional amounts are carried in residualHedgeOz for the next flush.
 * Failed Binance orders also carry over.
 */
async function flushHedge(mmUserId: string) {
    const flushStart = new Date();

    // 1. Query all trades involving the MM since last hedge
    const recentTrades = await db
        .select()
        .from(tradesTable)
        .where(
            and(
                gt(tradesTable.createdAt, lastHedgeTime),
                or(
                    eq(tradesTable.makerUserId, mmUserId),
                    eq(tradesTable.takerUserId, mmUserId)
                )
            )
        );

    // 2. Aggregate net oz per pair
    //    For each trade, determine the MM's side by looking up the relevant order.
    const exposureByPair: Record<string, number> = {};

    // Start with any residual from previous flush
    for (const [pair, oz] of Object.entries(residualHedgeOz)) {
        if (Math.abs(oz) > 1e-8) exposureByPair[pair] = oz;
    }

    for (const trade of recentTrades) {
        const cfg = HEDGE_PAIR_MAP[trade.pair];
        if (!cfg) continue; // skip non-hedgeable pairs (e.g. USDT-USDC)

        const contracts = parseFloat(trade.quantity);
        const oz = contracts * cfg.contractSize;

        // Look up the maker order to determine sides
        const [makerOrder] = await db
            .select({ side: orders.side })
            .from(orders)
            .where(eq(orders.id, trade.makerOrderId));

        if (!makerOrder) continue;

        const isSystemMaker = trade.makerUserId === mmUserId;
        let mmSide: "buy" | "sell";
        if (isSystemMaker) {
            mmSide = makerOrder.side as "buy" | "sell";
        } else {
            // MM is taker → opposite side of the maker
            mmSide = makerOrder.side === "buy" ? "sell" : "buy";
        }

        if (!exposureByPair[trade.pair]) exposureByPair[trade.pair] = 0;
        // MM bought → long → needs to SELL on Binance (positive)
        // MM sold  → short → needs to BUY  on Binance (negative)
        exposureByPair[trade.pair] += mmSide === "buy" ? oz : -oz;
    }

    // 3. Place hedge orders
    const pairsToHedge = Object.entries(exposureByPair).filter(([, oz]) => Math.abs(oz) > 1e-8);
    if (pairsToHedge.length === 0 && recentTrades.length === 0) {
        lastHedgeTime = flushStart;
        return;
    }

    if (pairsToHedge.length > 0) {
        console.log(`\n[HEDGE] Flushing ${recentTrades.length} trade(s) since ${lastHedgeTime.toISOString().slice(11, 19)}...`);
    }

    for (const [pair, netOz] of pairsToHedge) {
        const cfg = HEDGE_PAIR_MAP[pair];
        if (!cfg) continue;

        const side = netOz > 0 ? "SELL" : "BUY";
        const absOz = Math.abs(netOz);
        const qty = absOz.toFixed(cfg.qtyPrecision);
        const midPrice = lastHedgePrices[pair] ?? 0;
        const notional = absOz * midPrice;

        if (notional < cfg.minNotional) {
            console.log(`[HEDGE] ${pair}: carrying over ${side} ${qty} ${cfg.binanceSymbol} (notional $${notional.toFixed(2)} < min $${cfg.minNotional})`);
            residualHedgeOz[pair] = netOz; // carry over
            continue;
        }

        if (DRY_RUN_HEDGE) {
            console.log(`[HEDGE DRY RUN] Would ${side} ${qty} ${cfg.binanceSymbol} (~$${notional.toFixed(2)})`);
            residualHedgeOz[pair] = 0;
            continue;
        }

        if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
            console.warn(`[HEDGE] ${pair}: skipped — BINANCE_API_KEY/SECRET not set`);
            continue;
        }

        try {
            const result = await placeBinanceFuturesMarketOrder(cfg.binanceSymbol, side, qty);
            console.log(`[HEDGE] ✅ ${side} ${qty} ${cfg.binanceSymbol} → orderId: ${result.orderId}, avgPrice: ${result.avgPrice}`);
            residualHedgeOz[pair] = 0;
        } catch (err) {
            console.error(`[HEDGE] ❌ ${pair} failed (will retry next flush): ${err instanceof Error ? err.message : err}`);
            residualHedgeOz[pair] = netOz; // carry over failed amount
        }
    }

    // 4. Advance the hedge watermark
    lastHedgeTime = flushStart;
}

// ─── Binance API ────────────────────────────────────────────────────────────────────
const BINANCE_FUTURES_BOOK_TICKER_API = "https://fapi.binance.com/fapi/v1/ticker/bookTicker";
async function getBinancePrice(symbol: string) {
    try {
        const res = await fetch(`${BINANCE_FUTURES_BOOK_TICKER_API}?symbol=${symbol}`);
        if (!res.ok) throw new Error(`Binance Futures ${res.status}`);
        const data = await res.json();
        return {
            bid: parseFloat(data.bidPrice),
            ask: parseFloat(data.askPrice),
            mid: (parseFloat(data.bidPrice) + parseFloat(data.askPrice)) / 2,
        };
    } catch (err) {
        console.error(`  ⚠  Failed to fetch futures price for ${symbol}:`, (err as Error).message);
        return null;
    }
}

// ─── System user bootstrap ───────────────────────────────────────────────────
async function ensureSystemUser() {
    let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, SYSTEM_EMAIL));

    if (!user) {
        console.log(`  Creating system user: ${SYSTEM_EMAIL}`);
        [user] = await db
            .insert(users)
            .values({
                email: SYSTEM_EMAIL,
                firebaseUid: `system_mm_${TAG}_${Date.now()}`,
            })
            .returning();

        await db.insert(wallets).values([
            {
                userId: user.id,
                currency: "USDC",
                balance: "100",
                availableBalance: "100",
            },
        ]);
    }

    return user;
}

// ─── Core: Place a single MM limit order via matching engine ─────────────────

async function placeMMLimitOrder(
  userId: string,
  pair: PairKey,
  side: "buy" | "sell",
  price: string,
  quantity: string
): Promise<boolean> {
  const config = PAIR_CONFIG[pair as keyof typeof PAIR_CONFIG];
  
  try {
    await db.transaction(async (tx) => {
      // 1. Lock wallet balance
      const userWallets = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .for("update");

      const margin = calculateInitialMargin(
        quantity,
        config.contracts.toString(),
        price,
        LEVERAGE
      );
      const estFee = margin * LEVERAGE * parseFloat(config.takerFeeRate);
      const needed = margin + estFee;
      const wallet = userWallets.find((w) => w.currency === "USDC");

      if (!wallet || parseFloat(wallet.availableBalance) < needed) {
        throw new Error("SKIP: insufficient balance");
      }
      await tx
        .update(wallets)
        .set({
          availableBalance: sql`${wallets.availableBalance} - ${needed.toFixed(8)}::decimal`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // 2. Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          pair,
          side,
          type: "limit",
          price,
          quantity,
          status: "open",
          collateralCurrency: "USDC",
        })
        .returning();

      // 3. Match Order
      const matchResult = await matchOrder(tx as Parameters<typeof matchOrder>[0], {
        id: order.id,
        userId,
        pair,
        side,
        type: "limit",
        price,
        quantity,
      });


      // 4. Settle Fills
      for (const fill of matchResult.fills) {
        await tx.insert(tradesTable).values({
          pair,
          makerOrderId: fill.makerOrderId,
          takerOrderId: order.id,
          makerUserId: fill.makerUserId,
          takerUserId: userId,
          price: fill.price,
          quantity: fill.quantity,
          makerFee: fill.makerFee,
          takerFee: fill.takerFee,
        });

        await settleFuturesTrade(
          tx as Parameters<typeof settleFuturesTrade>[0],
          fill,
          {
            id: order.id,
            userId,
            side,
            collateralCurrency: "USDC",
            leverage: LEVERAGE,
          },
          pair as FuturesPair
        );
      }

      // 5. Update Order Status
      const filledQty = parseFloat(quantity) - parseFloat(matchResult.remainingQuantity);
      await tx
        .update(orders)
        .set({
          filledQuantity: filledQty.toFixed(8),
          status: matchResult.orderStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("SKIP:")) return false; 
    console.error(`Error matching order for ${pair}:`, err);
    return false;
  }
}

// ─── Core: Release locked funds when cancelling an order ─────────────────────

async function releaseCancelledFunds(
  tx: DbTransaction,
  order: ExistingOrder,
  pairConfig: PairConfig
) {
  const remainingQty = parseFloat(order.quantity) - parseFloat(order.filledQuantity);
  if (remainingQty <= 0) return;

  const margin = calculateInitialMargin(remainingQty.toString(), pairConfig.contracts.toString(), order.price ?? "0", LEVERAGE);
  const estFee = margin * LEVERAGE * parseFloat(pairConfig.takerFeeRate);
  const releaseAmount = margin + estFee;

  if (releaseAmount > 0) {
    await tx.update(wallets)
      .set({ availableBalance: sql`${wallets.availableBalance} + ${releaseAmount.toFixed(8)}::decimal` })
      .where(and(eq(wallets.userId, order.userId), eq(wallets.currency, "USDC")));
  }
}

// ─── Incremental rebalance: diff-based order management ──────────────────────

interface DesiredLevel {
  pair: string;
  side: "buy" | "sell";
  price: string;
  quantity: string;
}

interface ExistingOrder {
  id: string;
  pair: string;
  side: string;
  price: string | null;
  quantity: string;
  filledQuantity: string;
  status: string;
  userId: string;
}

/**
 * Build the desired grid of orders for a single pair given the mid price.
 */
function buildDesiredGrid(pair: keyof typeof PAIR_CONFIG, midPrice: number): DesiredLevel[] {
  const cfg = PAIR_CONFIG[pair];
  const grid: DesiredLevel[] = [];

  for (const [spread, qtyMul] of LEVELS) {
    const bidPrice = (midPrice * (1 - spread)).toFixed(cfg.priceDec);
    const askPrice = (midPrice * (1 + spread)).toFixed(cfg.priceDec);
    const qty = (cfg.baseQty * qtyMul).toString();

    grid.push({ pair, side: "buy",  price: bidPrice, quantity: qty });
    grid.push({ pair, side: "sell", price: askPrice, quantity: qty });
  }

  return grid;
}

/**
 * Diff existing orders against desired grid.
 * Returns: { toCancel: orders to remove, toPlace: levels to add, kept: count }
 *
 * Algorithm: For each desired level, find the best matching existing order
 * (same side, price within threshold, same quantity). If found, keep it.
 * Any existing order not claimed → cancel. Any desired level not matched → place.
 */
function diffOrders(
  pair: string,
  existing: ExistingOrder[],
  desired: DesiredLevel[]
): { toCancel: ExistingOrder[]; toPlace: DesiredLevel[]; kept: number } {
  const threshold = REPRICE_THRESHOLD[pair] ?? 0.0003;
  const claimed = new Set<string>(); // order IDs we keep
  const matched = new Set<number>();  // desired indices that matched

  for (let di = 0; di < desired.length; di++) {
    const d = desired[di];
    const dPrice = parseFloat(d.price);

    // Find closest existing order on the same side that's within threshold
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let ei = 0; ei < existing.length; ei++) {
      const e = existing[ei];
      if (claimed.has(e.id)) continue;
      if (e.side !== d.side) continue;
      if (!e.price) continue;

      const ePrice = parseFloat(e.price);
      const dist = Math.abs(ePrice - dPrice) / dPrice;

      // Also check quantity matches (unfilled portion)
      const remainingQty = parseFloat(e.quantity) - parseFloat(e.filledQuantity);
      const desiredQty = parseFloat(d.quantity);
      const qtyMatch = Math.abs(remainingQty - desiredQty) / desiredQty < 0.01;

      if (dist < threshold && qtyMatch && dist < bestDist) {
        bestDist = dist;
        bestIdx = ei;
      }
    }

    if (bestIdx >= 0) {
      claimed.add(existing[bestIdx].id);
      matched.add(di);
    }
  }

  const toCancel = existing.filter((e) => !claimed.has(e.id));
  const toPlace = desired.filter((_, i) => !matched.has(i));

  return { toCancel, toPlace, kept: claimed.size };
}

/**
 * Cancel a batch of orders in a single transaction, releasing locked funds.
 * Then aggregate metadata into mm_order_stats and hard-delete unfilled cancelled orders.
 */
async function cancelOrders(orderList: ExistingOrder[]): Promise<number> {
  if (orderList.length === 0) return 0;

  await db.transaction(async (tx) => {
    // Lock wallets for all affected users (should be just the MM user)
    const userIds = [...new Set(orderList.map((o) => o.userId))];
    for (const uid of userIds) {
      await tx.select().from(wallets).where(eq(wallets.userId, uid)).for("update");
    }

    for (const order of orderList) {
      await tx
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(orders.id, order.id));

      const config = PAIR_CONFIG[order.pair as keyof typeof PAIR_CONFIG];
      if (config) {
        await releaseCancelledFunds(tx, order, config);
      }
    }

    // Aggregate cancelled orders into stats, then delete
    await aggregateAndDeleteCancelled(tx, orderList);
  });

  return orderList.length;
}

/**
 * Aggregate cancelled order metadata into mm_order_stats, then hard-delete
 * orders that had zero fills. Orders with partial fills are retained (FK refs from trades).
 */
async function aggregateAndDeleteCancelled(tx: DbTransaction, orderList: ExistingOrder[]) {
  // Group by pair + side
  const groups = new Map<string, ExistingOrder[]>();
  for (const order of orderList) {
    const key = `${order.pair}|${order.side}`;
    const arr = groups.get(key) ?? [];
    arr.push(order);
    groups.set(key, arr);
  }

  const now = new Date();
  const toDeleteIds: string[] = [];

  for (const [key, grp] of groups) {
    const [pair, side] = key.split("|");
    const prices = grp.filter((o) => o.price).map((o) => parseFloat(o.price!));
    const quantities = grp.map((o) => parseFloat(o.quantity));

    const unfilled = grp.filter((o) => parseFloat(o.filledQuantity) === 0);
    const retained = grp.filter((o) => parseFloat(o.filledQuantity) > 0);

    // Compute time range
    // Note: ExistingOrder doesn't have createdAt, so use "now" as period boundary
    const totalQty = quantities.reduce((a, b) => a + b, 0);
    const avgPrice = prices.length > 0
      ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(8)
      : null;
    const minPrice = prices.length > 0 ? Math.min(...prices).toFixed(8) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices).toFixed(8) : null;

    await tx.insert(mmOrderStats).values({
      userId: grp[0].userId,
      pair,
      side,
      cancelledCount: grp.length.toString(),
      cancelledQuantity: totalQty.toFixed(8),
      avgPrice,
      minPrice,
      maxPrice,
      periodStart: now,
      periodEnd: now,
      deletedCount: unfilled.length.toString(),
      retainedCount: retained.length.toString(),
    });

    // Collect unfilled order IDs for hard deletion
    for (const o of unfilled) {
      toDeleteIds.push(o.id);
    }
  }

  // Hard-delete unfilled cancelled orders (no FK references in trades)
  if (toDeleteIds.length > 0) {
    await tx.delete(orders).where(
      sql`${orders.id} IN (${sql.join(toDeleteIds.map(id => sql`${id}::uuid`), sql`, `)})`
    );
  }
}

// ─── Tick: incremental rebalance ─────────────────────────────────────────────

let tickCount = 0;
const BULK_CLEANUP_EVERY = 360; // every ~30 min at 5s intervals

/**
 * Periodic bulk cleanup: delete old cancelled MM orders that predate
 * the inline cleanup (e.g. from before this feature was added).
 * Only deletes orders with zero fills to respect trade FK references.
 */
async function bulkCleanupCancelledOrders(userId: string) {
    const result = await db.execute(sql`
      WITH to_delete AS (
        SELECT id FROM ${orders}
        WHERE ${orders.userId} = ${userId}::uuid
          AND ${orders.status} = 'cancelled'
          AND ${orders.filledQuantity} = '0'
        LIMIT 5000
      )
      DELETE FROM ${orders}
      WHERE id IN (SELECT id FROM to_delete)
      RETURNING id
    `);
    const deleted = result.rows?.length ?? 0;
    if (deleted > 0) {
        console.log(`  🧹 Bulk cleanup: deleted ${deleted} stale cancelled orders`);
    }
}

async function tick(userId: string) {
    tickCount++;
    const ts = new Date().toISOString().slice(11, 19);
    process.stdout.write(`[${ts}] `);

    // Periodic bulk cleanup of old cancelled orders
    if (tickCount % BULK_CLEANUP_EVERY === 0) {
        await bulkCleanupCancelledOrders(userId);
    }

    // 1. Fetch prices in parallel
    const [xau, xag] = await Promise.all([
        getBinancePrice("XAUUSDT"),
        getBinancePrice("XAGUSDT"),
    ]);

    if (!xau || !xag) {
        console.log("skipped (price fetch failed)");
        return;
    }

    const midPrices: Record<string, number> = {
        "XAU-PERP": xau.mid,
        "XAG-PERP": xag.mid,
    };
    // Keep hedge prices current for notional estimation during flush
    lastHedgePrices["XAU-PERP"] = xau.mid;
    lastHedgePrices["XAG-PERP"] = xag.mid;

    // 2. Build desired grid for all pairs
    const allDesired: DesiredLevel[] = [];
    for (const pair of Object.keys(PAIR_CONFIG) as (keyof typeof PAIR_CONFIG)[]) {
        allDesired.push(...buildDesiredGrid(pair, midPrices[pair]));
    }

    // 3. Load current MM orders from DB
    const existingOrders = await db
        .select({
            id: orders.id,
            pair: orders.pair,
            side: orders.side,
            price: orders.price,
            quantity: orders.quantity,
            filledQuantity: orders.filledQuantity,
            status: orders.status,
            userId: orders.userId,
        })
        .from(orders)
        .where(
            and(
                eq(orders.userId, userId),
                sql`${orders.status} IN ('open', 'partial')`
            )
        );

    // 4. Diff per pair
    let totalCancelled = 0;
    let totalPlaced = 0;
    let totalKept = 0;

    for (const pair of Object.keys(PAIR_CONFIG) as (keyof typeof PAIR_CONFIG)[]) {
        const pairExisting = existingOrders.filter((o) => o.pair === pair);
        const pairDesired = allDesired.filter((d) => d.pair === pair);

        const { toCancel, toPlace, kept } = diffOrders(pair, pairExisting as ExistingOrder[], pairDesired);

        // 5a. Cancel stale orders (single batch transaction)
        totalCancelled += await cancelOrders(toCancel as ExistingOrder[]);
        totalKept += kept;

        // 5b. Place missing orders
        for (const level of toPlace) {
            const ok = await placeMMLimitOrder(
                userId,
                level.pair as PairKey,
                level.side,
                level.price,
                level.quantity
            );
            if (ok) totalPlaced++;
        }
    }

    console.log(
        `kept ${totalKept} | placed ${totalPlaced} | cancelled ${totalCancelled} | ` +
        `XAU ${xau.mid.toFixed(2)} | XAG ${xag.mid.toFixed(3)}`
    );

    // Flush hedge exposure every 5 minutes
    if (tickCount % HEDGE_FLUSH_EVERY === 0) {
        await flushHedge(userId);
    }
}

// ─── Entry point ─────────────────────────────────────────────────────────────
async function main() {
    const dbHost = DATABASE_URL.match(/@([^/]+)\//)?.[1] ?? "unknown";
    const hedgeMode = DRY_RUN_HEDGE ? "dry-run" : BINANCE_API_KEY ? (TESTNET ? "testnet" : "mainnet") : "disabled (no key)";
    console.log(`\n🤖 Open Mandi Market Maker (incremental rebalance)`);
    console.log(`   Tag:       ${TAG}`);
    console.log(`   DB Host:   ${dbHost}`);
    console.log(`   User:      ${SYSTEM_EMAIL}`);
    console.log(`   Levels:    ${LEVELS.length} per side × 2 pairs = ${LEVELS.length * 2 * 2} target orders`);
    console.log(`   Interval:  ${REFRESH_INTERVAL_MS / 1000}s`);
    console.log(`   Threshold: XAU ${(REPRICE_THRESHOLD["XAU-PERP"] * 100).toFixed(2)}% | XAG ${(REPRICE_THRESHOLD["XAG-PERP"] * 100).toFixed(2)}%`);
    console.log(`   Hedge:     every ${HEDGE_FLUSH_EVERY * REFRESH_INTERVAL_MS / 60000} min | ${hedgeMode}\n`);

    const user = await ensureSystemUser();
    console.log(`   User ID:   ${user.id}`);

    // One-time cleanup of legacy cancelled orders from before inline deletion
    console.log(`   Startup:   cleaning up legacy cancelled orders...`);
    let totalCleaned = 0;
    let batchCleaned: number;
    do {
        const result = await db.execute(sql`
          WITH to_delete AS (
            SELECT id FROM ${orders}
            WHERE ${orders.userId} = ${user.id}::uuid
              AND ${orders.status} = 'cancelled'
              AND ${orders.filledQuantity} = '0'
            LIMIT 10000
          )
          DELETE FROM ${orders}
          WHERE id IN (SELECT id FROM to_delete)
          RETURNING id
        `);
        batchCleaned = result.rows?.length ?? 0;
        totalCleaned += batchCleaned;
        if (batchCleaned > 0) {
            process.stdout.write(`   ...deleted ${totalCleaned} so far\n`);
        }
    } while (batchCleaned > 0);
    console.log(`   Startup:   purged ${totalCleaned} legacy cancelled orders\n`);

    // Initial tick
    await tick(user.id);

    // Loop safely without overlapping executions
    const loop = async () => {
        try {
            await tick(user.id);
        } catch (err) {
            console.error("Error in tick loop:", err);
        }
        setTimeout(loop, REFRESH_INTERVAL_MS);
    };

    setTimeout(loop, REFRESH_INTERVAL_MS);
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
