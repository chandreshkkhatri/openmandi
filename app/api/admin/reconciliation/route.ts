import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireAdmin, isErrorResponse } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import {
  getInternalWallets,
  setOnChainBalance,
} from "@/lib/db/queries/internal-wallets";

// ---------------------------------------------------------------------------
// Helpers — ERC-20 balanceOf via raw JSON-RPC
// ---------------------------------------------------------------------------

const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";

async function getErc20Balance(params: {
  rpcUrl: string;
  tokenContract: string;
  walletAddress: string;
  tokenDecimals: number;
}): Promise<{ raw: bigint; formatted: string }> {
  const paddedAddress = params.walletAddress
    .toLowerCase()
    .replace("0x", "")
    .padStart(64, "0");
  const callData = `${ERC20_BALANCE_OF_SELECTOR}${paddedAddress}`;

  const response = await fetch(params.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        { to: params.tokenContract, data: callData },
        "latest",
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`RPC error ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || "RPC error");

  const hexResult = json.result && json.result.length > 2 ? json.result : "0x0";
  const raw = BigInt(hexResult);
  const base = BigInt(10) ** BigInt(params.tokenDecimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(params.tokenDecimals, "0");
  const formatted = `${whole}.${fraction.slice(0, 8).padEnd(8, "0")}`;

  return { raw, formatted };
}

// ---------------------------------------------------------------------------
// GET — reconciliation report
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const rpcUrl = process.env.ETH_RPC_URL;
    const tokenContract =
      process.env.ETH_USDC_CONTRACT ?? "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const tokenDecimals = 6;

    const internalWalletList = await getInternalWallets();

    // Fetch on-chain balances for every internal wallet (skip if no RPC)
    const walletReports = await Promise.all(
      internalWalletList.map(async (iw) => {
        let onChainBalance: string | null = null;
        let onChainError: string | null = null;

        if (rpcUrl) {
          try {
            const result = await getErc20Balance({
              rpcUrl,
              tokenContract,
              walletAddress: iw.address,
              tokenDecimals,
            });
            onChainBalance = result.formatted;

            // Persist last on-chain balance
            await setOnChainBalance(iw.id, result.formatted);
          } catch (err) {
            onChainError =
              err instanceof Error ? err.message : "Balance fetch failed";
          }
        } else {
          onChainError = "ETH_RPC_URL not configured";
        }

        const ledger = parseFloat(iw.ledgerBalance);
        const onChain = onChainBalance ? parseFloat(onChainBalance) : null;
        const discrepancy =
          onChain !== null ? +(onChain - ledger).toFixed(8) : null;

        return {
          id: iw.id,
          role: iw.role,
          currency: iw.currency,
          address: iw.address,
          ledgerBalance: iw.ledgerBalance,
          onChainBalance,
          discrepancy,
          discrepancyPercent:
            discrepancy !== null && ledger > 0
              ? +((discrepancy / ledger) * 100).toFixed(4)
              : null,
          lastReconciledAt: iw.lastReconciledAt,
          onChainError,
        };
      })
    );

    // Aggregate user-liability total (sum of all user wallet balances)
    const [userLiabilityRow] = await db
      .select({
        totalBalance: sql<string>`COALESCE(SUM(${wallets.balance}::decimal), 0)`,
        totalAvailable: sql<string>`COALESCE(SUM(${wallets.availableBalance}::decimal), 0)`,
        walletCount: sql<number>`COUNT(*)::int`,
      })
      .from(wallets);

    const totalUserLiability = parseFloat(userLiabilityRow?.totalBalance ?? "0");
    const totalInternalLedger = walletReports.reduce(
      (sum, w) => sum + parseFloat(w.ledgerBalance),
      0
    );
    const totalOnChain = walletReports
      .filter((w) => w.onChainBalance !== null)
      .reduce((sum, w) => sum + parseFloat(w.onChainBalance!), 0);

    return NextResponse.json({
      success: true,
      reconciliation: {
        timestamp: new Date().toISOString(),
        wallets: walletReports,
        summary: {
          totalInternalLedger: totalInternalLedger.toFixed(8),
          totalOnChain: totalOnChain.toFixed(8),
          totalUserLiability: totalUserLiability.toFixed(8),
          reserveRatio:
            totalUserLiability > 0
              ? +((totalOnChain / totalUserLiability) * 100).toFixed(2)
              : null,
          userWalletCount: userLiabilityRow?.walletCount ?? 0,
        },
        hasDiscrepancies: walletReports.some(
          (w) => w.discrepancy !== null && Math.abs(w.discrepancy) > 0.01
        ),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reconciliation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
