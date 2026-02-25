import { NextRequest, NextResponse } from "next/server";
import { getRecentTrades } from "@/lib/db/queries/trading";

export const dynamic = "force-dynamic";

const VALID_PAIRS = ["XAU-PERP", "XAG-PERP"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    const { pair } = await params;

    if (!VALID_PAIRS.includes(pair)) {
      return NextResponse.json(
        { success: false, error: `Invalid pair: ${pair}` },
        { status: 400 }
      );
    }

    const limit = parseInt(
      request.nextUrl.searchParams.get("limit") ?? "50",
      10
    );
    const trades = await getRecentTrades(pair, Math.min(limit, 100));

    return NextResponse.json({ success: true, trades }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}
