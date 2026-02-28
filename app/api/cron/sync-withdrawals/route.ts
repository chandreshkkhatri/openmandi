import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, wallets, withdrawalRequests } from "@/lib/db/schema";
import {
  broadcastWithdrawalViaWebhook,
  parseTokenAmount,
  sendErc20Transfer,
  verifyErc20TransferInTx,
} from "@/lib/services/onchain";

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

async function rejectAndReleaseHold(params: {
  requestId: string;
  reason: string;
}) {
  await db.transaction(async (tx) => {
    const [lockedRequest] = await tx
      .select()
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.id, params.requestId),
          sql`${withdrawalRequests.status} IN ('pending', 'processing')`
        )
      )
      .for("update");

    if (!lockedRequest) return;

    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.id, lockedRequest.walletId))
      .for("update");

    if (wallet) {
      await tx
        .update(wallets)
        .set({
          availableBalance: sql`${wallets.availableBalance} + ${lockedRequest.totalDebit}::decimal`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));
    }

    await tx
      .update(withdrawalRequests)
      .set({
        status: "rejected",
        rejectionReason: params.reason,
        updatedAt: new Date(),
      })
      .where(eq(withdrawalRequests.id, lockedRequest.id));
  });
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

    const minConfirmations = Number(
      process.env.WITHDRAWAL_MIN_CONFIRMATIONS ?? "3"
    );

    const broadcasterUrl = process.env.WITHDRAWAL_BROADCAST_URL;
    const broadcasterToken = process.env.WITHDRAWAL_BROADCAST_TOKEN;
    const hotWalletKey = process.env.HOT_WALLET_PRIVATE_KEY;

    const pending = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, "pending"))
      .orderBy(withdrawalRequests.createdAt)
      .limit(100);

    const processing = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, "processing"))
      .orderBy(withdrawalRequests.updatedAt)
      .limit(100);

    let submittedToChain = 0;
    let completed = 0;
    let rejected = 0;
    let stillPending = 0;
    let skippedBroadcast = 0;

    for (const req of pending) {
      const currency = req.currency as "USDC";
      const config = CURRENCY_CONFIG[currency];
      if (!config) {
        await rejectAndReleaseHold({
          requestId: req.id,
          reason: `Unsupported currency ${req.currency}`,
        });
        rejected++;
        continue;
      }

      let txHash: string | null = null;

      try {
        if (broadcasterUrl) {
          // Mode 1: External broadcaster webhook
          const result = await broadcastWithdrawalViaWebhook({
            endpoint: broadcasterUrl,
            authToken: broadcasterToken,
            body: {
              requestId: req.id,
              currency: req.currency,
              network: req.network,
              destinationAddress: req.destinationAddress,
              amount: req.amount,
            },
          });
          txHash = result.txHash;
        } else if (hotWalletKey) {
          // Mode 2: Direct on-chain transfer from hot wallet
          const amountRaw = parseTokenAmount(req.amount, config.tokenDecimals);
          const result = await sendErc20Transfer({
            rpcUrl,
            privateKey: hotWalletKey,
            tokenContract: config.tokenContract,
            toAddress: req.destinationAddress,
            amountRaw,
          });
          txHash = result.txHash;
        } else {
          // No broadcast method configured
          skippedBroadcast++;
          continue;
        }
      } catch (err) {
        console.error(
          `[sync-withdrawals] Failed to broadcast ${req.id}:`,
          err instanceof Error ? err.message : err
        );
        stillPending++;
        continue;
      }

      if (!txHash) {
        stillPending++;
        continue;
      }

      await db
        .update(withdrawalRequests)
        .set({
          status: "processing",
          payoutTxHash: txHash,
          processedAt: new Date(),
          rejectionReason: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(withdrawalRequests.id, req.id),
            eq(withdrawalRequests.status, "pending")
          )
        );

      submittedToChain++;
    }

    const allProcessing = processing.concat(
      await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.status, "processing"))
        .orderBy(withdrawalRequests.updatedAt)
        .limit(100)
    );

    const seen = new Set<string>();
    for (const req of allProcessing) {
      if (seen.has(req.id)) continue;
      seen.add(req.id);

      if (!req.payoutTxHash) {
        await rejectAndReleaseHold({
          requestId: req.id,
          reason: "Missing payout transaction hash",
        });
        rejected++;
        continue;
      }

      const currency = req.currency as "USDC";
      const config = CURRENCY_CONFIG[currency];
      if (!config) {
        await rejectAndReleaseHold({
          requestId: req.id,
          reason: `Unsupported currency ${req.currency}`,
        });
        rejected++;
        continue;
      }

      const verification = await verifyErc20TransferInTx({
        txHash: req.payoutTxHash,
        rpcUrl,
        minConfirmations,
        tokenContract: config.tokenContract,
        expectedToAddress: req.destinationAddress,
        tokenDecimals: config.tokenDecimals,
        minAmountRaw: parseTokenAmount(req.amount, config.tokenDecimals),
      });

      if (verification.status === "pending") {
        stillPending++;
        continue;
      }

      if (verification.status === "failed") {
        await rejectAndReleaseHold({
          requestId: req.id,
          reason: verification.reason,
        });
        rejected++;
        continue;
      }

      await db.transaction(async (tx) => {
        const [lockedReq] = await tx
          .select()
          .from(withdrawalRequests)
          .where(
            and(
              eq(withdrawalRequests.id, req.id),
              eq(withdrawalRequests.status, "processing")
            )
          )
          .for("update");

        if (!lockedReq) return;

        const [wallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.id, lockedReq.walletId))
          .for("update");

        if (!wallet) {
          await tx
            .update(withdrawalRequests)
            .set({
              status: "rejected",
              rejectionReason: "Wallet not found while finalizing withdrawal",
              updatedAt: new Date(),
            })
            .where(eq(withdrawalRequests.id, lockedReq.id));
          return;
        }

        const [updatedWallet] = await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} - ${lockedReq.totalDebit}::decimal`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning({ balance: wallets.balance });

        const balanceAfterWithdrawal = (
          parseFloat(updatedWallet.balance) + parseFloat(lockedReq.fee)
        ).toFixed(8);

        await tx.insert(transactions).values({
          userId: lockedReq.userId,
          walletId: lockedReq.walletId,
          type: "withdrawal",
          currency: lockedReq.currency,
          amount: `-${lockedReq.amount}`,
          balanceAfter: balanceAfterWithdrawal,
          referenceId: lockedReq.id,
          referenceType: "withdrawal_request",
          description: `On-chain withdrawal ${lockedReq.currency}`,
        });

        await tx.insert(transactions).values({
          userId: lockedReq.userId,
          walletId: lockedReq.walletId,
          type: "withdrawal_fee",
          currency: lockedReq.currency,
          amount: `-${lockedReq.fee}`,
          balanceAfter: updatedWallet.balance,
          referenceId: lockedReq.id,
          referenceType: "withdrawal_request",
          description: "Withdrawal fee",
        });

        await tx
          .update(withdrawalRequests)
          .set({
            status: "completed",
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(withdrawalRequests.id, lockedReq.id));
      });

      completed++;
    }

    return NextResponse.json({
      success: true,
      pendingScanned: pending.length,
      processingScanned: allProcessing.length,
      submittedToChain,
      completed,
      rejected,
      stillPending,
      skippedBroadcast,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Withdrawal sync failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
