import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth/admin";
import {
  getInternalWallets,
  upsertInternalWallet,
} from "@/lib/db/queries/internal-wallets";
import { z } from "zod";

const VALID_ROLES = ["hot_wallet", "treasury", "fee_wallet", "reserve_wallet"] as const;

const upsertSchema = z.object({
  role: z.enum(VALID_ROLES),
  currency: z.literal("USDC"),
  network: z.literal("ETH"),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid ETH address"),
  label: z.string().optional(),
});

/** GET — list all active internal wallets */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const wallets = await getInternalWallets();
    return NextResponse.json({ success: true, wallets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list internal wallets";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** POST — create or update an internal wallet */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const data = upsertSchema.parse(body);
    const wallet = await upsertInternalWallet(data);

    return NextResponse.json({ success: true, wallet });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert internal wallet";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
