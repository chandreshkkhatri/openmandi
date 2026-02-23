import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Extract just the host from the connection string (no credentials)
    const connStr = process.env.OPENMANDI_DATABASE_URL || process.env.POSTGRES_URL || "";
    const hostMatch = connStr.match(/@([^/]+)\//);
    const dbHost = hostMatch ? hostMatch[1] : "unknown";
    const envVarUsed = process.env.OPENMANDI_DATABASE_URL ? "OPENMANDI_DATABASE_URL" : "POSTGRES_URL";

    // Run a live count query to confirm DB connectivity
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(sql`${orders.status} IN ('open', 'partial')`);

    // Get XAU-PERP bid/ask snapshot for comparison
    const [topBid] = await db
      .select({ price: orders.price })
      .from(orders)
      .where(
        sql`${orders.pair} = 'XAU-PERP' AND ${orders.side} = 'buy' AND ${orders.status} IN ('open', 'partial') AND ${orders.price} IS NOT NULL`
      )
      .orderBy(sql`${orders.price} DESC`)
      .limit(1);

    const [topAsk] = await db
      .select({ price: orders.price })
      .from(orders)
      .where(
        sql`${orders.pair} = 'XAU-PERP' AND ${orders.side} = 'sell' AND ${orders.status} IN ('open', 'partial') AND ${orders.price} IS NOT NULL`
      )
      .orderBy(sql`${orders.price} ASC`)
      .limit(1);

    // ── Who owns the open orders? ────────────────────────────────────────
    const orderOwners = await db.execute(sql`
      SELECT u.email,
             count(*)::int AS open_orders,
             min(o.created_at) AS oldest_order,
             max(o.created_at) AS newest_order
      FROM ${orders} o
      JOIN ${users} u ON u.id = o.user_id
      WHERE o.status IN ('open', 'partial')
      GROUP BY u.email
      ORDER BY open_orders DESC
    `);

    // Check if any system market-maker users exist
    const mmUsers = await db.execute(sql`
      SELECT email, created_at
      FROM ${users}
      WHERE email LIKE 'system_mm_%@openmandi.com'
      ORDER BY created_at
    `);

    return NextResponse.json(
      {
        dbHost,
        envVarUsed,
        openOrderCount: result.count,
        xauPerp: {
          topBid: topBid?.price ?? null,
          topAsk: topAsk?.price ?? null,
        },
        orderOwners: orderOwners.rows,
        marketMakerUsers: mmUsers.rows,
        timestamp: new Date().toISOString(),
        envKeys: Object.keys(process.env)
          .filter((k) => k.includes("POSTGRES") || k.includes("DATABASE") || k.includes("PG"))
          .sort(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        dbHost: ((process.env.OPENMANDI_DATABASE_URL || process.env.POSTGRES_URL) ?? "").match(/@([^/]+)\//)?.[1] ?? "unknown",
      },
      { status: 500 }
    );
  }
}
