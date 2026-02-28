import { getSession } from "@/lib/auth/session";
import {
  getUserWallets,
  getTotalBalance,
  getRecentTransactions,
  getRecentDepositClaims,
  getRecentWithdrawalRequests,
  getPendingWithdrawalTotal,
} from "@/lib/db/queries/wallet";
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

export default async function Wallet() {
  const user = await getSession();
  if (!user) return null;

  const { usdc } = await getUserWallets(user.id);
  const totalBalance = getTotalBalance(usdc?.balance ?? null);
  const availableBalance = parseFloat(usdc?.availableBalance ?? "0");
  const [recentTxns, recentClaims, recentWithdrawals, pendingInfo] = await Promise.all([
    getRecentTransactions(user.id, 20),
    getRecentDepositClaims(user.id, 10),
    getRecentWithdrawalRequests(user.id, 10),
    getPendingWithdrawalTotal(user.id),
  ]);
  const lockedAmount = pendingInfo.totalLocked;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Wallet</h1>
      <p className="mb-8 text-zinc-400">
        Your USDC balance and transaction history.
      </p>

      {/* Balance Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-silver">
            USDC
          </h2>
          <p className="font-mono text-2xl text-white">
            ${parseFloat(usdc?.balance ?? "0").toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Available: $
            {availableBalance.toFixed(2)}
            {lockedAmount > 0 && (
              <span className="ml-2 text-yellow-400">
                (${lockedAmount.toFixed(2)} locked)
              </span>
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gold/20 bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Total Balance
          </h2>
          <p className="font-mono text-2xl text-white">
            ${totalBalance.toFixed(2)}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/exchange/deposit"
              className="rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Deposit
            </Link>
            <Link
              href="/exchange/withdraw"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:text-white"
            >
              Withdraw
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Deposit Claims
          </h2>
          {recentClaims.length === 0 ? (
            <p className="text-sm text-zinc-500">No deposit claims yet.</p>
          ) : (
            <div className="space-y-2">
              {recentClaims.map((claim) => (
                <div key={claim.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                  <p className="font-mono text-zinc-300">{claim.txHash.slice(0, 12)}...{claim.txHash.slice(-8)}</p>
                  <p className="text-zinc-500">
                    {claim.currency} • {claim.status} • {claim.confirmations} conf
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Withdrawal Requests
          </h2>
          {recentWithdrawals.length === 0 ? (
            <p className="text-sm text-zinc-500">No withdrawal requests yet.</p>
          ) : (
            <div className="space-y-2">
              {recentWithdrawals.map((request) => {
                const isPending = request.status === "pending" || request.status === "processing";
                const isCompleted = request.status === "completed";
                const isRejected = request.status === "rejected" || request.status === "cancelled";
                const statusColor = isPending
                  ? "text-yellow-400"
                  : isCompleted
                    ? "text-green-400"
                    : isRejected
                      ? "text-red-400"
                      : "text-zinc-400";
                return (
                  <div key={request.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-zinc-300">
                        ${parseFloat(request.amount).toFixed(2)} {request.currency}
                      </p>
                      <span className={`font-medium capitalize ${statusColor}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-zinc-500">
                      To: {request.destinationAddress.slice(0, 10)}...{request.destinationAddress.slice(-6)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          Transaction History
        </h2>
        {recentTxns.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No transactions yet. Make your first deposit to get started.
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
                        year: "numeric",
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
