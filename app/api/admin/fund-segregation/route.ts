import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { requireAdmin, isErrorResponse } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { wallets, transactions } from "@/lib/db/schema";
import { getInternalWallets } from "@/lib/db/queries/internal-wallets";

// ---------------------------------------------------------------------------
// GET — fund segregation report
//
// Separates user-liability funds from exchange fee/revenue funds and
// shows how internal wallets map to each bucket.
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    // 1. Total user-liability: sum of all user wallet balances
    const [userLiability] = await db
      .select({
        totalBalance: sql<string>`COALESCE(SUM(${wallets.balance}::decimal), 0)`,
        totalAvailable: sql<string>`COALESCE(SUM(${wallets.availableBalance}::decimal), 0)`,
        held: sql<string>`COALESCE(SUM((${wallets.balance} - ${wallets.availableBalance})::decimal), 0)`,
        walletCount: sql<number>`COUNT(*)::int`,
      })
      .from(wallets);

    // 2. Revenue breakdown from transactions
    const [feeRevenue] = await db
      .select({
        totalWithdrawalFees: sql<string>`COALESCE(SUM(ABS(${transactions.amount}::decimal)), 0)`,
        feeCount: sql<number>`COUNT(*)::int`,
      })
      .from(transactions)
      .where(eq(transactions.type, "withdrawal_fee"));

    const [tradingFees] = await db
      .select({
        totalMakerFees: sql<string>`COALESCE(SUM(ABS(${transactions.amount}::decimal)), 0)`,
        feeCount: sql<number>`COUNT(*)::int`,
      })
      .from(transactions)
      .where(eq(transactions.type, "trading_fee"));

    // 3. Internal wallet breakdown by role
    const internalWalletList = await getInternalWallets();

    const userFacingRoles = ["hot_wallet", "reserve_wallet"];
    const revenueRoles = ["fee_wallet", "treasury"];

    const userFacingWallets = internalWalletList.filter((w) =>
      userFacingRoles.includes(w.role)
    );
    const revenueWallets = internalWalletList.filter((w) =>
      revenueRoles.includes(w.role)
    );

    const userFacingTotal = userFacingWallets.reduce(
      (sum, w) => sum + parseFloat(w.ledgerBalance),
      0
    );
    const revenueTotal = revenueWallets.reduce(
      (sum, w) => sum + parseFloat(w.ledgerBalance),
      0
    );

    const totalUserLiabilityNum = parseFloat(userLiability?.totalBalance ?? "0");
    const coverageRatio =
      totalUserLiabilityNum > 0
        ? +((userFacingTotal / totalUserLiabilityNum) * 100).toFixed(2)
        : null;

    return NextResponse.json({
      success: true,
      segregation: {
        timestamp: new Date().toISOString(),
        userLiability: {
          totalBalance: userLiability?.totalBalance ?? "0",
          totalAvailable: userLiability?.totalAvailable ?? "0",
          held: userLiability?.held ?? "0",
          walletCount: userLiability?.walletCount ?? 0,
        },
        revenue: {
          totalWithdrawalFees: feeRevenue?.totalWithdrawalFees ?? "0",
          withdrawalFeeCount: feeRevenue?.feeCount ?? 0,
          totalTradingFees: tradingFees?.totalMakerFees ?? "0",
          tradingFeeCount: tradingFees?.feeCount ?? 0,
        },
        internalWallets: {
          userFacing: {
            roles: userFacingRoles,
            wallets: userFacingWallets.map((w) => ({
              id: w.id,
              role: w.role,
              label: w.label,
              ledgerBalance: w.ledgerBalance,
            })),
            total: userFacingTotal.toFixed(8),
          },
          revenueOperational: {
            roles: revenueRoles,
            wallets: revenueWallets.map((w) => ({
              id: w.id,
              role: w.role,
              label: w.label,
              ledgerBalance: w.ledgerBalance,
            })),
            total: revenueTotal.toFixed(8),
          },
        },
        coverageRatio,
        coverageNote:
          coverageRatio !== null
            ? coverageRatio >= 100
              ? "User-facing wallets fully cover user liabilities"
              : "User-facing wallets do not fully cover user liabilities — action required"
            : "No user liabilities to cover",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Fund segregation report failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
