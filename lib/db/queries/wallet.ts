import { db } from "@/lib/db";
import { wallets, transactions, depositClaims, withdrawalRequests } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getUserWallets(userId: string) {
  const userWallets = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId));

  return {
    usdc: userWallets.find((w) => w.currency === "USDC") ?? null,
  };
}

export function getTotalBalance(usdcBalance: string | null): number {
  return parseFloat(usdcBalance ?? "0");
}

export async function getRecentTransactions(
  userId: string,
  limit: number = 10
) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function getRecentDepositClaims(userId: string, limit: number = 10) {
  return db
    .select()
    .from(depositClaims)
    .where(eq(depositClaims.userId, userId))
    .orderBy(desc(depositClaims.createdAt))
    .limit(limit);
}

export async function getRecentWithdrawalRequests(userId: string, limit: number = 10) {
  return db
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.userId, userId))
    .orderBy(desc(withdrawalRequests.createdAt))
    .limit(limit);
}
