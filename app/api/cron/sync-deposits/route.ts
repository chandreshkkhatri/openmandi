import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { depositClaims, transactions, wallets } from "@/lib/db/schema";
import { verifyErc20Deposit } from "@/lib/services/onchain";
import { getWeeklyDepositTotal } from "@/lib/db/queries/wallet";

const CURRENCY_CONFIG = {
  USDC: {
    tokenContract:
      process.env.ETH_USDC_CONTRACT ?? "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    tokenDecimals: 6,
  },
} as const;

function getCronSecretFromHeader(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7);
}

export async function GET(request: NextRequest) {
  try {
    const configuredSecret = process.env.CRON_SECRET;
    if (!configuredSecret) {
      return NextResponse.json(
        { success: false, error: "CRON_SECRET is not configured" },
        { status: 503 }
      );
    }

    const providedSecret = getCronSecretFromHeader(request);
    if (!providedSecret || providedSecret !== configuredSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rpcUrl = process.env.ETH_RPC_URL;
    if (!rpcUrl) {
      return NextResponse.json(
        { success: false, error: "ETH_RPC_URL is not configured" },
        { status: 503 }
      );
    }

    const minConfirmations = Number(process.env.DEPOSIT_MIN_CONFIRMATIONS ?? "3");

    const pendingClaims = await db
      .select()
      .from(depositClaims)
      .where(eq(depositClaims.status, "pending"))
      .orderBy(depositClaims.createdAt)
      .limit(100);

    let confirmedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    for (const claim of pendingClaims) {
      const currency = claim.currency as "USDC";
      const config = CURRENCY_CONFIG[currency];

      if (!config) {
        await db
          .update(depositClaims)
          .set({
            status: "rejected",
            rejectionReason: `Missing deposit configuration for ${claim.currency}`,
            updatedAt: new Date(),
          })
          .where(eq(depositClaims.id, claim.id));
        rejectedCount++;
        continue;
      }

      // Verify against this user's unique deposit address (stored on the claim)
      if (!claim.toAddress) {
        await db
          .update(depositClaims)
          .set({
            status: "rejected",
            rejectionReason: "No deposit address associated with this claim",
            updatedAt: new Date(),
          })
          .where(eq(depositClaims.id, claim.id));
        rejectedCount++;
        continue;
      }

      const verification = await verifyErc20Deposit({
        txHash: claim.txHash,
        tokenContract: config.tokenContract,
        expectedToAddress: claim.toAddress,
        tokenDecimals: config.tokenDecimals,
        minConfirmations,
        rpcUrl,
      });

      if (verification.status === "pending") {
        await db
          .update(depositClaims)
          .set({
            confirmations: verification.confirmations,
            updatedAt: new Date(),
          })
          .where(eq(depositClaims.id, claim.id));
        pendingCount++;
        continue;
      }

      if (verification.status === "rejected") {
        await db
          .update(depositClaims)
          .set({
            status: "rejected",
            confirmations: verification.confirmations,
            rejectionReason: verification.reason,
            updatedAt: new Date(),
          })
          .where(eq(depositClaims.id, claim.id));
        rejectedCount++;
        continue;
      }

      await db.transaction(async (tx) => {
        const [lockedClaim] = await tx
          .select()
          .from(depositClaims)
          .where(and(eq(depositClaims.id, claim.id), eq(depositClaims.status, "pending")))
          .for("update");

        if (!lockedClaim) return;

        const [wallet] = await tx
          .select()
          .from(wallets)
          .where(and(eq(wallets.userId, lockedClaim.userId), eq(wallets.currency, lockedClaim.currency)))
          .for("update");

        if (!wallet) {
          await tx
            .update(depositClaims)
            .set({
              status: "rejected",
              confirmations: verification.confirmations,
              rejectionReason: "Wallet not found for user/currency",
              updatedAt: new Date(),
            })
            .where(eq(depositClaims.id, lockedClaim.id));
          rejectedCount++;
          return;
        }

        const creditAmount = verification.amountFormatted;
        const currentBalance = parseFloat(wallet.balance ?? "0");
        const depositAmountNum = parseFloat(creditAmount);

        // Limit Rule 1: Max transaction amount is $20
        if (depositAmountNum > 20) {
          await tx
            .update(depositClaims)
            .set({
              status: "rejected",
              confirmations: verification.confirmations,
              rejectionReason: "Deposit exceeds maximum allowed amount of $20.00",
              updatedAt: new Date(),
            })
            .where(eq(depositClaims.id, lockedClaim.id));
          rejectedCount++;
          return;
        }

        // Limit Rule 2: Balance must be below $5 before crediting
        if (currentBalance >= 5) {
          await tx
            .update(depositClaims)
            .set({
              status: "rejected",
              confirmations: verification.confirmations,
              rejectionReason: "User balance is already $5.00 or higher",
              updatedAt: new Date(),
            })
            .where(eq(depositClaims.id, lockedClaim.id));
          rejectedCount++;
          return;
        }

        // Limit Rule 3: Weekly deposit limit of $100
        const weeklyDepositTotal = await getWeeklyDepositTotal(lockedClaim.userId, tx);
        if (weeklyDepositTotal + depositAmountNum > 100) {
          await tx
            .update(depositClaims)
            .set({
              status: "rejected",
              confirmations: verification.confirmations,
              rejectionReason: "Deposit would exceed weekly limit of $100.00",
              updatedAt: new Date(),
            })
            .where(eq(depositClaims.id, lockedClaim.id));
          rejectedCount++;
          return;
        }

        const [updatedWallet] = await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${creditAmount}::decimal`,
            availableBalance: sql`${wallets.availableBalance} + ${creditAmount}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning({ balance: wallets.balance });

        await tx.insert(transactions).values({
          userId: lockedClaim.userId,
          walletId: wallet.id,
          type: "deposit",
          currency: lockedClaim.currency,
          amount: creditAmount,
          balanceAfter: updatedWallet.balance,
          referenceId: lockedClaim.id,
          referenceType: "deposit_claim",
          description: `On-chain deposit ${lockedClaim.currency}`,
        });

        await tx
          .update(depositClaims)
          .set({
            status: "confirmed",
            fromAddress: verification.fromAddress,
            toAddress: verification.toAddress,
            amount: creditAmount,
            confirmations: verification.confirmations,
            confirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(depositClaims.id, lockedClaim.id));

        confirmedCount++;
      });
    }

    return NextResponse.json({
      success: true,
      scanned: pendingClaims.length,
      confirmed: confirmedCount,
      rejected: rejectedCount,
      stillPending: pendingCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
