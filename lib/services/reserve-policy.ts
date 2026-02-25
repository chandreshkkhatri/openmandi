import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withdrawalRequests } from "@/lib/db/schema";
import {
  getSetting,
  getSettingBool,
  getSettingNumber,
  SETTING_WITHDRAWALS_PAUSED,
  SETTING_WITHDRAWALS_PAUSED_REASON,
  SETTING_MAX_PAYOUT_PER_HOUR,
  SETTING_MIN_HOT_WALLET_BALANCE,
  SETTING_MANUAL_REVIEW_THRESHOLD,
} from "@/lib/db/queries/exchange-settings";
import { getInternalWalletByRole } from "@/lib/db/queries/internal-wallets";

// ---------------------------------------------------------------------------
// Reserve Policy — pre-withdrawal checks
// ---------------------------------------------------------------------------

export type PolicyCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Run all reserve-policy checks before allowing a new withdrawal request.
 *
 * @param requestedAmount  USDC value the user wants to withdraw (excluding fee)
 */
export async function checkWithdrawalPolicy(
  requestedAmount: number
): Promise<PolicyCheckResult> {
  // 1. Global withdrawal pause
  const paused = await getSettingBool(SETTING_WITHDRAWALS_PAUSED, false);
  if (paused) {
    const pauseReason = await getSetting(SETTING_WITHDRAWALS_PAUSED_REASON);
    return {
      allowed: false,
      reason: pauseReason
        ? `Withdrawals are temporarily paused: ${pauseReason}`
        : "Withdrawals are temporarily paused for maintenance.",
    };
  }

  // 2. Manual-review threshold (block; admin must approve out-of-band)
  const manualThreshold = await getSettingNumber(
    SETTING_MANUAL_REVIEW_THRESHOLD,
    Infinity
  );
  if (requestedAmount > manualThreshold) {
    return {
      allowed: false,
      reason: `Withdrawals above $${manualThreshold.toFixed(2)} require manual review. Please contact support.`,
    };
  }

  // 3. Hourly payout cap
  const maxPerHour = await getSettingNumber(SETTING_MAX_PAYOUT_PER_HOUR, Infinity);
  if (maxPerHour !== Infinity) {
    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const [row] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${withdrawalRequests.amount}::decimal), 0)`,
      })
      .from(withdrawalRequests)
      .where(
        sql`${withdrawalRequests.status} IN ('pending','processing','completed')
            AND ${withdrawalRequests.createdAt} >= ${oneHourAgo}`
      );
    const recentTotal = parseFloat(row?.total ?? "0");
    if (recentTotal + requestedAmount > maxPerHour) {
      return {
        allowed: false,
        reason: `Hourly payout limit ($${maxPerHour.toFixed(2)}) would be exceeded. Please try again later.`,
      };
    }
  }

  // 4. Hot wallet minimum balance
  const minHotBalance = await getSettingNumber(
    SETTING_MIN_HOT_WALLET_BALANCE,
    0
  );
  if (minHotBalance > 0) {
    const hotWallet = await getInternalWalletByRole("hot_wallet", "USDC");
    if (hotWallet) {
      const hotBalance = parseFloat(hotWallet.ledgerBalance);
      if (hotBalance - requestedAmount < minHotBalance) {
        return {
          allowed: false,
          reason:
            "Withdrawal temporarily unavailable due to reserve constraints. Please try again later.",
        };
      }
    }
  }

  return { allowed: true };
}
