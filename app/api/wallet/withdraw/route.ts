import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { wallets, withdrawalRequests } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { checkWithdrawalPolicy } from "@/lib/services/reserve-policy";

const WITHDRAWAL_FEE = 0.1;
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const withdrawSchema = z.object({
  currency: z.literal("USDC"),
  destinationAddress: z
    .string()
    .regex(ETH_ADDRESS_REGEX, "Destination address must be a valid ETH address"),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be greater than $0"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currency, amount, destinationAddress } = withdrawSchema.parse(body);
    const withdrawAmount = parseFloat(amount);

    // Reserve-policy gate (pause, threshold, hourly cap, hot-wallet floor)
    const policy = await checkWithdrawalPolicy(withdrawAmount);
    if (!policy.allowed) {
      return NextResponse.json(
        { success: false, error: policy.reason },
        { status: 403 }
      );
    }

    const result = await db.transaction(async (tx) => {
      // Lock wallet rows for this user to prevent concurrent balance updates
      const userWallets = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, user.id))
        .for("update");

      const usdcWallet = userWallets.find((w) => w.currency === "USDC");
      const targetWallet = usdcWallet;

      if (!targetWallet) {
        throw new Error("Wallet not found");
      }

      // Eligibility: total balance >= $10
      const totalBalance = parseFloat(usdcWallet?.balance ?? "0");

      if (totalBalance < 10) {
        throw new Error(
          `Withdrawals require a total balance of at least $10.00. Your current total balance is $${totalBalance.toFixed(2)}.`
        );
      }

      // Check sufficient balance for amount + fee
      const totalDebit = withdrawAmount + WITHDRAWAL_FEE;
      const availableBalance = parseFloat(targetWallet.availableBalance);

      if (totalDebit > availableBalance) {
        throw new Error(
          `Insufficient ${currency} balance. You need $${totalDebit.toFixed(2)} ($${withdrawAmount.toFixed(2)} + $${WITHDRAWAL_FEE.toFixed(2)} fee) but only have $${availableBalance.toFixed(2)} available.`
        );
      }

      // Atomic balance update using SQL arithmetic on DECIMAL columns
      const totalDebitStr = totalDebit.toFixed(8);
      await tx
        .update(wallets)
        .set({
          availableBalance: sql`${wallets.availableBalance} - ${totalDebitStr}::decimal`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, targetWallet.id));

      const [requestRecord] = await tx
        .insert(withdrawalRequests)
        .values({
          userId: user.id,
          walletId: targetWallet.id,
          currency,
          network: "ETH",
          destinationAddress: destinationAddress.toLowerCase(),
          amount: withdrawAmount.toFixed(8),
          fee: WITHDRAWAL_FEE.toFixed(8),
          totalDebit: totalDebit.toFixed(8),
          status: "pending",
        })
        .returning();

      return {
        ...requestRecord,
        fee: WITHDRAWAL_FEE.toFixed(2),
        netAmount: withdrawAmount.toFixed(2),
      };
    });

    return NextResponse.json({ success: true, request: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Withdrawal request failed";
    const isValidation =
      message.includes("Withdrawals require") ||
      message.includes("Insufficient") ||
      message.includes("Wallet not found") ||
      message.includes("Destination address") ||
      message.includes("paused") ||
      message.includes("manual review") ||
      message.includes("payout limit") ||
      message.includes("reserve constraints");
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
