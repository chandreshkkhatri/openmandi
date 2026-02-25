import { NextResponse } from "next/server";
import { getIndexPrices, getMarkPrice } from "@/lib/services/prices";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const indexPrices = await getIndexPrices();
    const [xauMark, xagMark] = await Promise.all([
      getMarkPrice("XAU-PERP"),
      getMarkPrice("XAG-PERP"),
    ]);
    return NextResponse.json({
      success: true,
      gold: xauMark,
      silver: xagMark,
      fetchedAt: indexPrices.timestamp,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
