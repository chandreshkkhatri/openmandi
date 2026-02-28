import { getSession } from "@/lib/auth/session";
import {
  getUserWallets,
  getTotalBalance,
  getRecentWithdrawalRequests,
  getPendingWithdrawalTotal,
} from "@/lib/db/queries/wallet";
import WithdrawForm from "@/app/components/WithdrawForm";
import CopyButton from "@/app/components/CopyButton";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", label: "Pending" },
  processing: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", label: "Processing" },
  completed: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "Completed" },
  rejected: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "Rejected" },
  cancelled: { bg: "bg-zinc-500/10 border-zinc-500/30", text: "text-zinc-400", label: "Cancelled" },
};

export default async function Withdraw() {
  const user = await getSession();
  if (!user) return null;

  const [{ usdc }, pendingInfo, recentWithdrawals] = await Promise.all([
    getUserWallets(user.id),
    getPendingWithdrawalTotal(user.id),
    getRecentWithdrawalRequests(user.id, 10),
  ]);

  const totalBalance = getTotalBalance(usdc?.balance ?? null);
  const availableBalance = parseFloat(usdc?.availableBalance ?? "0");
  const lockedAmount = pendingInfo.totalLocked;
  const eligible = totalBalance >= 10;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-white">Withdraw</h1>
      <p className="mb-8 text-zinc-400">
        Submit an on-chain withdrawal request to your destination address.
      </p>

      {/* Balance Summary */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          Balance Breakdown
        </h2>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-400">Total Balance</dt>
            <dd className="font-mono text-sm text-white">
              ${totalBalance.toFixed(2)}
            </dd>
          </div>
          {lockedAmount > 0 && (
            <div className="flex justify-between">
              <dt className="text-sm text-yellow-400">
                Locked (pending withdrawals)
              </dt>
              <dd className="font-mono text-sm text-yellow-400">
                -${lockedAmount.toFixed(2)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-sm font-medium text-zinc-300">
              Available to Withdraw
            </dt>
            <dd className="font-mono text-sm font-medium text-white">
              ${availableBalance.toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Eligibility Gate */}
      {!eligible ? (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <h3 className="mb-2 text-sm font-semibold text-yellow-400">
            Withdrawals Unavailable
          </h3>
          <p className="text-sm text-zinc-400">
            Your total balance is ${totalBalance.toFixed(2)}. Withdrawals
            require a combined balance of at least $10.00. Continue trading to
            grow your balance.
          </p>
        </div>
      ) : availableBalance <= 0 && lockedAmount > 0 ? (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <h3 className="mb-2 text-sm font-semibold text-yellow-400">
            Funds Locked
          </h3>
          <p className="text-sm text-zinc-400">
            Your entire balance is locked in {pendingInfo.count} pending
            withdrawal{pendingInfo.count !== 1 ? "s" : ""}. New withdrawals can
            be made once current requests are processed or cancelled.
          </p>
        </div>
      ) : (
        <WithdrawForm
          usdcAvailable={availableBalance}
        />
      )}

      {/* Recent Withdrawal Requests */}
      {recentWithdrawals.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Withdrawal History
          </h2>
          <div className="space-y-3">
            {recentWithdrawals.map((req) => {
              const style = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending;
              return (
                <div
                  key={req.id}
                  className="rounded-lg border border-border bg-black px-4 py-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm text-white">
                        ${parseFloat(req.amount).toFixed(2)} {req.currency}
                      </p>
                      <p className="mt-0.5 flex items-center font-mono text-xs text-zinc-500">
                        <span>To: {req.destinationAddress.slice(0, 10)}...{req.destinationAddress.slice(-6)}</span>
                        <CopyButton text={req.destinationAddress} />
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                    >
                      {style.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      Fee: ${parseFloat(req.fee).toFixed(2)} &bull; Total debit: ${parseFloat(req.totalDebit).toFixed(2)}
                    </span>
                    <span>
                      {req.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {req.payoutTxHash && (
                    <p className="mt-1 flex items-center font-mono text-xs text-zinc-500">
                      <span>Tx: {req.payoutTxHash.slice(0, 14)}...{req.payoutTxHash.slice(-8)}</span>
                      <CopyButton text={req.payoutTxHash} />
                    </p>
                  )}
                  {req.rejectionReason && (
                    <p className="mt-1 text-xs text-red-400">
                      {req.rejectionReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
