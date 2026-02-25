#!/usr/bin/env npx tsx
/**
 * Open Mandi — Binance Hedger
 *
 * Monitors fills against the market-maker system user and
 * automatically hedges exposure on Binance Futures.
 *
 * Usage:
 *   npx tsx scripts/hedger.ts
 *   npx tsx scripts/hedger.ts --tag=aws-1      # match MM instance tag
 *   npx tsx scripts/hedger.ts --dry-run         # log but don't place orders
 *   npx tsx scripts/hedger.ts --testnet         # use Binance Futures testnet
 *
 * Env:
 *   POSTGRES_URL         — Neon / Postgres connection string (required)
 *   BINANCE_API_KEY      — Binance API key (required unless --dry-run)
 *   BINANCE_API_SECRET   — Binance API secret (required unless --dry-run)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
    pgTable,
    uuid,
    text,
    timestamp,
    decimal,
} from "drizzle-orm/pg-core";
import { eq, and, or, gt, like } from "drizzle-orm";
import { createHmac } from "crypto";

// ─── CLI args ────────────────────────────────────────────────────────────────
const TAG =
    process.argv.find((a) => a.startsWith("--tag="))?.split("=")[1] ?? "local";
const DRY_RUN = process.argv.includes("--dry-run");
const TESTNET = process.argv.includes("--testnet");

// ─── Env check ───────────────────────────────────────────────────────────────
if (!process.env.POSTGRES_URL) {
    console.error("❌  POSTGRES_URL is not set. Add it to .env.local");
    process.exit(1);
}
if (!DRY_RUN && (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET)) {
    console.error("❌  BINANCE_API_KEY and BINANCE_API_SECRET required (or use --dry-run)");
    process.exit(1);
}

const BINANCE_API_KEY = process.env.BINANCE_API_KEY!;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET!;
const BINANCE_BASE = TESTNET
    ? "https://testnet.binancefuture.com"
    : "https://fapi.binance.com";

// ─── DB setup (same pattern as market-maker.ts) ──────────────────────────────
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

// ─── Inline schema (portable, no @/ imports) ─────────────────────────────────
const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    firebaseUid: text("firebase_uid").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const trades = pgTable("trades", {
    id: uuid("id").primaryKey().defaultRandom(),
    pair: text("pair").notNull(),
    makerOrderId: uuid("maker_order_id").notNull(),
    takerOrderId: uuid("taker_order_id").notNull(),
    makerUserId: uuid("maker_user_id").notNull(),
    takerUserId: uuid("taker_user_id").notNull(),
    price: decimal("price", { precision: 18, scale: 8 }).notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    makerFee: decimal("maker_fee", { precision: 18, scale: 8 }).notNull(),
    takerFee: decimal("taker_fee", { precision: 18, scale: 8 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

const orders = pgTable("orders", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    pair: text("pair").notNull(),
    side: text("side").notNull(),
    type: text("type").notNull(),
    price: decimal("price", { precision: 18, scale: 8 }),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    filledQuantity: decimal("filled_quantity", { precision: 18, scale: 8 }).notNull(),
    status: text("status").notNull(),
    collateralCurrency: text("collateral_currency"),
    leverage: decimal("leverage", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Contract mapping ────────────────────────────────────────────────────────
// Our exchange contract → Binance symbol + conversion factor
// Each contract on our exchange = contractSize oz of metal
// Binance trades in oz directly for XAUUSDT / XAGUSDT
const BINANCE_QUOTE_ASSET = "USDT";
const PAIR_MAP: Record<
    string,
    {
        binanceSymbol: string;
        contractSize: number; // oz per contract
        quantityPrecision: number; // decimal places for Binance qty
        minNotional: number; // minimum quote-asset value per order
    }
> = {
    "XAU-PERP": {
        binanceSymbol: "XAUUSDT",
        contractSize: 0.001,
        quantityPrecision: 2,
        minNotional: 5,
    },
    "XAG-PERP": {
        binanceSymbol: "XAGUSDT",
        contractSize: 0.1,
        quantityPrecision: 1,
        minNotional: 5,
    },
};

// ─── Binance API helpers ─────────────────────────────────────────────────────

function signQuery(query: string): string {
    const signature = createHmac("sha256", BINANCE_API_SECRET)
        .update(query)
        .digest("hex");
    return `${query}&signature=${signature}`;
}

async function binanceRequest(
    method: "GET" | "POST" | "DELETE",
    path: string,
    params: Record<string, string> = {}
): Promise<unknown> {
    params.timestamp = Date.now().toString();
    params.recvWindow = "5000";
    const query = new URLSearchParams(params).toString();
    const signed = signQuery(query);
    const url = `${BINANCE_BASE}${path}?${signed}`;

    const res = await fetch(url, {
        method,
        headers: { "X-MBX-APIKEY": BINANCE_API_KEY },
    });

    const body = await res.json();
    if (!res.ok) {
        throw new Error(`Binance API error: ${JSON.stringify(body)}`);
    }
    return body;
}

async function placeBinanceOrder(
    symbol: string,
    side: "BUY" | "SELL",
    quantity: string
): Promise<{ orderId: number; avgPrice: string }> {
    const result = (await binanceRequest("POST", "/fapi/v1/order", {
        symbol,
        side,
        type: "MARKET",
        quantity,
    })) as { orderId: number; avgPrice: string };
    return result;
}

async function checkBinanceBalance(): Promise<void> {
    const result = (await binanceRequest("GET", "/fapi/v2/balance")) as Array<{
        asset: string;
        availableBalance: string;
    }>;
    const quoteAssetBalance = result.find((a) => a.asset === BINANCE_QUOTE_ASSET);
    console.log(
        `Binance quote-asset balance (${BINANCE_QUOTE_ASSET}): ${quoteAssetBalance ? quoteAssetBalance.availableBalance : "NOT FOUND"}`
    );
}

// ─── Main loop ───────────────────────────────────────────────────────────────

const POLL_INTERVAL = 3000; // 3 seconds
let lastProcessedTradeTime: Date | null = null;
let processedTradeIds = new Set<string>();

async function pollAndHedge(systemUserIds: string[]) {
    // Find new trades where a system user is the maker (counterparty to real users)
    // We also check where the system user is taker, in case of edge cases

    const recentTrades = lastProcessedTradeTime
        ? await db
            .select()
            .from(trades)
            .where(
                and(
                    gt(trades.createdAt, lastProcessedTradeTime),
                    or(
                        ...systemUserIds.map((id) => eq(trades.makerUserId, id)),
                        ...systemUserIds.map((id) => eq(trades.takerUserId, id))
                    )
                )
            )
        : // First run: look back 1 minute to catch recent trades
        await db
            .select()
            .from(trades)
            .where(
                and(
                    gt(trades.createdAt, new Date(Date.now() - 60_000)),
                    or(
                        ...systemUserIds.map((id) => eq(trades.makerUserId, id)),
                        ...systemUserIds.map((id) => eq(trades.takerUserId, id))
                    )
                )
            );

    if (recentTrades.length === 0) return;

    // Filter out already processed trades
    const newTrades = recentTrades.filter((t) => !processedTradeIds.has(t.id));
    if (newTrades.length === 0) return;

    // Aggregate exposure change per pair
    // When the MM SELLS to a user, MM is SHORT → hedge by SELLING on Binance
    // When the MM BUYS from a user, MM is LONG → hedge by BUYING on Binance
    const exposureByPair: Record<string, number> = {};

    for (const trade of newTrades) {
        const pairConfig = PAIR_MAP[trade.pair];
        if (!pairConfig) continue;

        // Find the maker's order to determine the MM's side on this trade
        const [makerOrder] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, trade.makerOrderId));

        if (!makerOrder) continue;

        const isSystemMaker = systemUserIds.includes(trade.makerUserId);
        const isSystemTaker = systemUserIds.includes(trade.takerUserId);

        let mmSide: "buy" | "sell";
        if (isSystemMaker) {
            mmSide = makerOrder.side as "buy" | "sell";
        } else if (isSystemTaker) {
            // Taker is opposite of maker
            mmSide = makerOrder.side === "buy" ? "sell" : "buy";
        } else {
            continue;
        }

        // Convert contracts to oz
        const contracts = parseFloat(trade.quantity);
        const ozAmount = contracts * pairConfig.contractSize;

        if (!exposureByPair[trade.pair]) exposureByPair[trade.pair] = 0;

        // MM bought → positive exposure (need to buy on Binance to be flat)
        // Wait — the logic should mirror the MM's position:
        // If MM BOUGHT contracts, it's LONG → hedge by SELLING on Binance
        // If MM SOLD contracts, it's SHORT → hedge by BUYING on Binance
        // Actually NO — we want to REPLICATE the MM's position on Binance to be hedged:
        // If MM is SHORT on our exchange, we SHORT on Binance to replicate and net = flat
        // Wait, that doubles the risk. The correct hedge is:
        // If MM is SHORT on our exchange (sold to user), we BUY on Binance (long)
        // Net: short on our exchange + long on Binance = delta neutral
        if (mmSide === "sell") {
            // MM sold contracts → short on our exchange → BUY on Binance to hedge
            exposureByPair[trade.pair] += ozAmount;
        } else {
            // MM bought contracts → long on our exchange → SELL on Binance to hedge
            exposureByPair[trade.pair] -= ozAmount;
        }
    }

    // Place hedge orders on Binance
    for (const [pair, netOz] of Object.entries(exposureByPair)) {
        if (Math.abs(netOz) < 1e-8) continue;

        const pairConfig = PAIR_MAP[pair];
        if (!pairConfig) continue;

        const side = netOz > 0 ? "BUY" : "SELL";
        const absOz = Math.abs(netOz);

        // Round to Binance precision
        const quantity = absOz.toFixed(pairConfig.quantityPrecision);

        // Check minimum notional (price × qty must be ≥ $5)
        // We'll estimate with the trade price
        const lastTrade = newTrades.find((t) => t.pair === pair);
        const estPrice = lastTrade ? parseFloat(lastTrade.price) : 0;
        const notional = absOz * estPrice;

        if (notional < pairConfig.minNotional) {
            console.log(
                `[${pair}] Skipping hedge: notional $${notional.toFixed(2)} < min $${pairConfig.minNotional}`
            );
            continue;
        }

        if (DRY_RUN) {
            console.log(
                `[DRY RUN] Would ${side} ${quantity} ${pairConfig.binanceSymbol} (notional: $${notional.toFixed(2)})`
            );
        } else {
            try {
                const result = await placeBinanceOrder(
                    pairConfig.binanceSymbol,
                    side,
                    quantity
                );
                console.log(
                    `✅ Hedged: ${side} ${quantity} ${pairConfig.binanceSymbol} → Binance orderId: ${result.orderId}, avgPrice: ${result.avgPrice}`
                );
            } catch (err) {
                console.error(
                    `❌ Hedge failed for ${pair}: ${err instanceof Error ? err.message : err}`
                );
            }
        }
    }

    // Mark trades as processed
    for (const trade of newTrades) {
        processedTradeIds.add(trade.id);
        if (!lastProcessedTradeTime || trade.createdAt > lastProcessedTradeTime) {
            lastProcessedTradeTime = trade.createdAt;
        }
    }

    // Keep processed set from growing unbounded (keep last 1000)
    if (processedTradeIds.size > 1000) {
        const arr = Array.from(processedTradeIds);
        processedTradeIds = new Set(arr.slice(arr.length - 500));
    }

    console.log(
        `Processed ${newTrades.length} trades, hedged ${Object.keys(exposureByPair).length} pairs`
    );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
    console.log("Starting Binance Hedger...");
    console.log(`  Tag:      ${TAG}`);
    console.log(`  Dry Run:  ${DRY_RUN}`);
    console.log(`  Testnet:  ${TESTNET}`);
    console.log(`  Endpoint: ${BINANCE_BASE}`);
    console.log(`  Matching: system_mm_*@openmandi.com`);

    // Verify Binance connectivity (skip in dry run)
    if (!DRY_RUN) {
        try {
            await checkBinanceBalance();
        } catch (err) {
            console.error(
                `❌ Binance connection failed: ${err instanceof Error ? err.message : err}`
            );
            console.error("   Check BINANCE_API_KEY and BINANCE_API_SECRET");
            process.exit(1);
        }
    }

    // Find system user IDs
    const systemUsers = await db
        .select()
        .from(users)
        .where(like(users.email, "system_mm_%@openmandi.com"));

    if (systemUsers.length === 0) {
        console.error("❌ No system market maker users found. Start market-maker.ts first.");
        process.exit(1);
    }

    const systemUserIds = systemUsers.map((u) => u.id);
    console.log(`  Found ${systemUsers.length} MM user(s): ${systemUsers.map((u) => u.email).join(", ")}`);
    console.log(`  Polling every ${POLL_INTERVAL / 1000}s...\n`);

    // Poll loop
    const tick = async () => {
        try {
            await pollAndHedge(systemUserIds);
        } catch (err) {
            console.error(`Poll error: ${err instanceof Error ? err.message : err}`);
        }
    };

    await tick();
    setInterval(tick, POLL_INTERVAL);
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
