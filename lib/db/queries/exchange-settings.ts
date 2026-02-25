import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { exchangeSettings } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Get / Set Individual Settings
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(exchangeSettings)
    .where(eq(exchangeSettings.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const val = await getSetting(key);
  if (val === null) return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

export async function getSettingBool(key: string, fallback = false): Promise<boolean> {
  const val = await getSetting(key);
  if (val === null) return fallback;
  return val === "true" || val === "1";
}

export async function setSetting(params: {
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
}) {
  const [row] = await db
    .insert(exchangeSettings)
    .values({
      key: params.key,
      value: params.value,
      description: params.description,
      updatedBy: params.updatedBy,
    })
    .onConflictDoUpdate({
      target: exchangeSettings.key,
      set: {
        value: params.value,
        description: params.description,
        updatedBy: params.updatedBy,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

// ---------------------------------------------------------------------------
// Bulk Listing
// ---------------------------------------------------------------------------

export async function getAllSettings() {
  return db
    .select()
    .from(exchangeSettings)
    .orderBy(desc(exchangeSettings.updatedAt));
}

// ---------------------------------------------------------------------------
// Well-Known Setting Keys
// ---------------------------------------------------------------------------

/** If 'true', all withdrawal requests are blocked. */
export const SETTING_WITHDRAWALS_PAUSED = "withdrawals_paused";
/** Human-readable reason for the pause. */
export const SETTING_WITHDRAWALS_PAUSED_REASON = "withdrawals_paused_reason";
/** Max total payout (USDC) allowed per rolling hour. */
export const SETTING_MAX_PAYOUT_PER_HOUR = "max_payout_per_hour";
/** Minimum USDC balance for the hot wallet before new payouts are blocked. */
export const SETTING_MIN_HOT_WALLET_BALANCE = "min_hot_wallet_balance";
/** Individual withdrawal amount (USDC) above which manual review is required. */
export const SETTING_MANUAL_REVIEW_THRESHOLD = "manual_review_threshold";
