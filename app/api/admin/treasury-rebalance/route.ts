import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth/admin";
import {
  getInternalWallets,
  createInternalTransfer,
  getRecentInternalTransfers,
} from "@/lib/db/queries/internal-wallets";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET — view recent internal transfers + current wallet balances
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const [wallets, transfers] = await Promise.all([
      getInternalWallets(),
      getRecentInternalTransfers(50),
    ]);

    return NextResponse.json({
      success: true,
      wallets: wallets.map((w) => ({
        id: w.id,
        role: w.role,
        currency: w.currency,
        address: w.address,
        label: w.label,
        ledgerBalance: w.ledgerBalance,
        lastOnChainBalance: w.lastOnChainBalance,
        lastReconciledAt: w.lastReconciledAt,
      })),
      recentTransfers: transfers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch rebalance data";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — initiate a ledger transfer between internal wallets
//
// This records the intent and adjusts ledger balances immediately.
// The actual on-chain transfer is executed externally (e.g. multisig signer).
// Once the on-chain tx is confirmed, PATCH can be used to attach the txHash.
// ---------------------------------------------------------------------------

const transferSchema = z.object({
  fromRole: z.string(),
  toRole: z.string(),
  currency: z.literal("USDC"),
  amount: z.string().refine((v) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0;
  }, "Amount must be > 0"),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const { fromRole, toRole, currency, amount, txHash, note } =
      transferSchema.parse(body);

    if (fromRole === toRole) {
      return NextResponse.json(
        { success: false, error: "Source and destination must be different" },
        { status: 400 }
      );
    }

    // Resolve wallets by role
    const allWallets = await getInternalWallets();
    const fromWallet = allWallets.find(
      (w) => w.role === fromRole && w.currency === currency
    );
    const toWallet = allWallets.find(
      (w) => w.role === toRole && w.currency === currency
    );

    if (!fromWallet) {
      return NextResponse.json(
        { success: false, error: `No active ${currency} wallet found for role '${fromRole}'` },
        { status: 400 }
      );
    }
    if (!toWallet) {
      return NextResponse.json(
        { success: false, error: `No active ${currency} wallet found for role '${toRole}'` },
        { status: 400 }
      );
    }

    // Check source has sufficient ledger balance
    const sourceBalance = parseFloat(fromWallet.ledgerBalance);
    const transferAmount = parseFloat(amount);
    if (transferAmount > sourceBalance) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient ledger balance in ${fromRole}. Available: $${sourceBalance.toFixed(2)}, Requested: $${transferAmount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const transfer = await createInternalTransfer({
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      currency,
      amount,
      txHash,
      note: note ?? `Rebalance ${fromRole} → ${toRole}`,
      initiatedBy: auth.email,
    });

    return NextResponse.json({ success: true, transfer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rebalance failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
