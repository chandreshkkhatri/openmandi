import { getSession } from "@/lib/auth/session";
import {
  getUserWallets,
  getTotalBalance,
  getRecentTransactions,
} from "@/lib/db/queries/wallet";
import { getUserPositions, getUserOpenOrders } from "@/lib/db/queries/trading";
import { getIndexPrices } from "@/lib/services/prices";
import { calculateUnrealizedPnl } from "@/lib/services/margin";
import { PAIRS } from "@/lib/trading/constants";
import type { FuturesPair } from "@/lib/trading/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TX_TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  withdrawal_fee: "Withdrawal Fee",
  trade_debit: "Trade",
  trade_credit: "Trade",
  fee: "Trading Fee",
  margin_lock: "Margin Lock",
  margin_release: "Margin Release",
  liquidation: "Liquidation",
  funding: "Funding",
};

export default async function Dashboard() {
  const user = await getSession();
  if (!user) return null;

  const { usdc } = await getUserWallets(user.id);
  const totalBalance = getTotalBalance(usdc?.balance ?? null);
  const recentTxns = await getRecentTransactions(user.id, 5);
  const [openPositions, openOrders, prices] = await Promise.all([
    getUserPositions(user.id, "open"),
    getUserOpenOrders(user.id),
    getIndexPrices(),
  ]);

  // Calculate total unrealized PnL
  let totalPnl = 0;
  for (const pos of openPositions) {
    const contract = pos.contract as FuturesPair;
    const pairConfig = PAIRS[contract];
    const markPrice = contract === "XAU-PERP" ? prices.gold : prices.silver;
    totalPnl += calculateUnrealizedPnl(
      pos.side as "long" | "short",
      pos.entryPrice,
      markPrice.toString(),
      pos.quantity,
      pairConfig.contractSize
    );
  }

  const canDeposit = totalBalance < 5;
  const canWithdraw = totalBalance >= 10;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Dashboard</h1>
      <p className="mb-8 text-zinc-400">
        Welcome back. Here&apos;s your account overview.
      </p>

      {/* Total Balance Hero */}
      <div className="mb-8 rounded-2xl border border-primary/20 bg-surface p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Total Account Value
        </p>
        <p className="mt-2 font-mono text-4xl font-bold text-white">
          ${totalBalance.toFixed(2)}
        </p>
        <p className="mt-1 text-sm text-zinc-500">USD equivalent</p>
      </div>

      {/* Wallet Balances */}
      <div className="mb-8 grid gap-4 sm:grid-cols-1">
        <div className="rounded-2xl border border-border bg-surface p-6 max-w-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-silver">
            USDC
          </h2>
          <p className="font-mono text-2xl text-white">
            ${parseFloat(usdc?.balance ?? "0").toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Available: $
            {parseFloat(usdc?.availableBalance ?? "0").toFixed(2)}
          </p>
        </div>
      </div>

      {/* Market Prices + Positions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-xs text-zinc-500">Gold (XAU)</p>
          <p className="mt-1 font-mono text-lg font-semibold text-primary">
            ${prices.gold.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-xs text-zinc-500">Silver (XAG)</p>
          <p className="mt-1 font-mono text-lg font-semibold text-silver">
            ${prices.silver.toFixed(3)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-xs text-zinc-500">Positions / Orders</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {openPositions.length} / {openOrders.length}
          </p>
          {openPositions.length > 0 && (
            <p
              className={`mt-0.5 font-mono text-xs ${
                totalPnl >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              PnL: {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(4)}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/exchange/deposit"
          className="rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-primary/30"
        >
          <p className="text-sm font-semibold text-primary">Deposit</p>
          <p className="mt-1 text-xs text-zinc-500">
            {canDeposit ? "Add funds to your account" : "Balance must be < $5"}
          </p>
        </Link>
        <Link
          href="/exchange/withdraw"
          className="rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-primary/30"
        >
          <p className="text-sm font-semibold text-primary">Withdraw</p>
          <p className="mt-1 text-xs text-zinc-500">
            {canWithdraw
              ? "Withdraw available funds"
              : "Need $10+ to withdraw"}
          </p>
        </Link>
        <Link
          href="/exchange/trade/gold"
          className="rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-primary/30"
        >
          <p className="text-sm font-semibold text-primary">Trade</p>
          <p className="mt-1 text-xs text-zinc-500">Gold & silver futures</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Recent Activity
          </h2>
          <Link
            href="/exchange/wallet"
            className="text-xs text-zinc-500 transition-colors hover:text-primary"
          >
            View all &rarr;
          </Link>
        </div>
        {recentTxns.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No activity yet. Make your first deposit to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-zinc-500">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Currency</th>
                  <th className="pb-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50">
                    <td className="py-3 text-sm capitalize text-zinc-300">
                      {TX_TYPE_LABELS[tx.type] ?? tx.type.replace("_", " ")}
                    </td>
                    <td
                      className={`py-3 font-mono text-sm ${
                        parseFloat(tx.amount) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {parseFloat(tx.amount) >= 0 ? "+" : ""}
                      {parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 text-sm text-zinc-400">
                      {tx.currency}
                    </td>
                    <td className="py-3 text-right text-sm text-zinc-500">
                      {tx.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
