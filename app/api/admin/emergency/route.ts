import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth/admin";
import {
  getSetting,
  setSetting,
  getAllSettings,
  SETTING_WITHDRAWALS_PAUSED,
  SETTING_WITHDRAWALS_PAUSED_REASON,
  SETTING_MAX_PAYOUT_PER_HOUR,
  SETTING_MIN_HOT_WALLET_BALANCE,
  SETTING_MANUAL_REVIEW_THRESHOLD,
} from "@/lib/db/queries/exchange-settings";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GET — current emergency-control status
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const [
      paused,
      pauseReason,
      maxPerHour,
      minHotBalance,
      manualThreshold,
    ] = await Promise.all([
      getSetting(SETTING_WITHDRAWALS_PAUSED),
      getSetting(SETTING_WITHDRAWALS_PAUSED_REASON),
      getSetting(SETTING_MAX_PAYOUT_PER_HOUR),
      getSetting(SETTING_MIN_HOT_WALLET_BALANCE),
      getSetting(SETTING_MANUAL_REVIEW_THRESHOLD),
    ]);

    const allSettings = await getAllSettings();

    return NextResponse.json({
      success: true,
      controls: {
        withdrawalsPaused: paused === "true",
        withdrawalsPausedReason: pauseReason,
        maxPayoutPerHour: maxPerHour ? parseFloat(maxPerHour) : null,
        minHotWalletBalance: minHotBalance ? parseFloat(minHotBalance) : null,
        manualReviewThreshold: manualThreshold ? parseFloat(manualThreshold) : null,
      },
      allSettings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read controls";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — update emergency controls
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  action: z.enum([
    "pause_withdrawals",
    "resume_withdrawals",
    "set_max_payout_per_hour",
    "set_min_hot_wallet_balance",
    "set_manual_review_threshold",
    "set_custom",
  ]),
  value: z.string().optional(),
  reason: z.string().optional(),
  key: z.string().optional(),        // only for set_custom
  description: z.string().optional(), // only for set_custom
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    const { action, value, reason, key, description } = updateSchema.parse(body);

    switch (action) {
      case "pause_withdrawals":
        await setSetting({
          key: SETTING_WITHDRAWALS_PAUSED,
          value: "true",
          description: "Global withdrawal pause",
          updatedBy: auth.email,
        });
        if (reason) {
          await setSetting({
            key: SETTING_WITHDRAWALS_PAUSED_REASON,
            value: reason,
            description: "Reason for withdrawal pause",
            updatedBy: auth.email,
          });
        }
        break;

      case "resume_withdrawals":
        await setSetting({
          key: SETTING_WITHDRAWALS_PAUSED,
          value: "false",
          description: "Global withdrawal pause",
          updatedBy: auth.email,
        });
        await setSetting({
          key: SETTING_WITHDRAWALS_PAUSED_REASON,
          value: "",
          description: "Reason for withdrawal pause",
          updatedBy: auth.email,
        });
        break;

      case "set_max_payout_per_hour":
        if (!value) throw new Error("value required");
        await setSetting({
          key: SETTING_MAX_PAYOUT_PER_HOUR,
          value,
          description: "Max USDC payout per rolling hour",
          updatedBy: auth.email,
        });
        break;

      case "set_min_hot_wallet_balance":
        if (!value) throw new Error("value required");
        await setSetting({
          key: SETTING_MIN_HOT_WALLET_BALANCE,
          value,
          description: "Minimum USDC balance for hot wallet",
          updatedBy: auth.email,
        });
        break;

      case "set_manual_review_threshold":
        if (!value) throw new Error("value required");
        await setSetting({
          key: SETTING_MANUAL_REVIEW_THRESHOLD,
          value,
          description: "Withdrawal amount above which manual review is required",
          updatedBy: auth.email,
        });
        break;

      case "set_custom":
        if (!key || !value) throw new Error("key and value required");
        await setSetting({
          key,
          value,
          description,
          updatedBy: auth.email,
        });
        break;
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update controls";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
