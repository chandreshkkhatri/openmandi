import { NextResponse } from "next/server";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { requireAdmin, isErrorResponse } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { depositClaims, withdrawalRequests } from "@/lib/db/schema";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const staleMinutes = Number(process.env.WALLET_MONITOR_STALE_MINUTES ?? "30");
    const staleCutoff = new Date(Date.now() - staleMinutes * 60_000);

    const [
      rejectedClaims,
      rejectedWithdrawals,
      stalePendingClaims,
      stalePendingWithdrawals,
      staleProcessingWithdrawals,
    ] = await Promise.all([
      db
        .select()
        .from(depositClaims)
        .where(eq(depositClaims.status, "rejected"))
        .orderBy(desc(depositClaims.updatedAt))
        .limit(50),
      db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.status, "rejected"))
        .orderBy(desc(withdrawalRequests.updatedAt))
        .limit(50),
      db
        .select()
        .from(depositClaims)
        .where(
          and(
            eq(depositClaims.status, "pending"),
            lt(depositClaims.createdAt, staleCutoff)
          )
        )
        .orderBy(asc(depositClaims.createdAt))
        .limit(50),
      db
        .select()
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.status, "pending"),
            lt(withdrawalRequests.createdAt, staleCutoff)
          )
        )
        .orderBy(asc(withdrawalRequests.createdAt))
        .limit(50),
      db
        .select()
        .from(withdrawalRequests)
        .where(
          and(
            eq(withdrawalRequests.status, "processing"),
            lt(withdrawalRequests.updatedAt, staleCutoff)
          )
        )
        .orderBy(asc(withdrawalRequests.updatedAt))
        .limit(50),
    ]);

    const [claimCountResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(depositClaims)
      .where(eq(depositClaims.status, "pending"));

    const [withdrawPendingCountResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, "pending"));

    const [withdrawProcessingCountResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, "processing"));

    return NextResponse.json({
      success: true,
      staleThresholdMinutes: staleMinutes,
      summary: {
        pendingDepositClaims: claimCountResult.count,
        pendingWithdrawalRequests: withdrawPendingCountResult.count,
        processingWithdrawalRequests: withdrawProcessingCountResult.count,
        rejectedDepositClaims: rejectedClaims.length,
        rejectedWithdrawalRequests: rejectedWithdrawals.length,
      },
      alerts: {
        rejectedDepositClaims: rejectedClaims,
        rejectedWithdrawalRequests: rejectedWithdrawals,
        stalePendingDepositClaims: stalePendingClaims,
        stalePendingWithdrawalRequests: stalePendingWithdrawals,
        staleProcessingWithdrawalRequests: staleProcessingWithdrawals,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet monitor failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
