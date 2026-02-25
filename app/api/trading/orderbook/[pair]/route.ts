import { NextRequest, NextResponse } from "next/server";
import { getOrderBook } from "@/lib/db/queries/trading";

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

    const depth = parseInt(
      request.nextUrl.searchParams.get("depth") ?? "20",
      10
    );
    const orderBook = await getOrderBook(pair, Math.min(depth, 50));

    return NextResponse.json({ success: true, ...orderBook }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Orderbook fetch error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch order book", 
        details: error instanceof Error ? error.message : String(error),
        cause:
          error instanceof Error && "cause" in error
            ? (error as { cause?: unknown }).cause
            : undefined,
      },
      { status: 500 }
    );
  }
}
