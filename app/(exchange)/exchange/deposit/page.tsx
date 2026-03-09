import { getSession } from "@/lib/auth/session";
import { getUserWallets, getTotalBalance, getWeeklyDepositTotal } from "@/lib/db/queries/wallet";
import DepositForm from "@/app/components/DepositForm";

export default async function Deposit() {
  const user = await getSession();
  if (!user) return null;

  const { usdc } = await getUserWallets(user.id);
  const totalBalance = getTotalBalance(usdc?.balance ?? null);
  const weeklyDepositTotal = await getWeeklyDepositTotal(user.id);

  const balanceEligible = totalBalance < 5;
  const weeklyEligible = weeklyDepositTotal < 100;
  const eligible = balanceEligible && weeklyEligible;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-white">Deposit</h1>
      <p className="mb-8 text-zinc-400">
        Request your deposit address, send funds on-chain, then submit the transaction hash for verification.
      </p>

      {/* Balance Summary */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Current Balances
        </h2>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-400">USDC</dt>
            <dd className="font-mono text-sm text-white">
              ${parseFloat(usdc?.balance ?? "0").toFixed(2)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-sm font-medium text-zinc-300">Total</dt>
            <dd className="font-mono text-sm font-medium text-white">
              ${totalBalance.toFixed(2)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-4">
            <dt className="text-sm text-zinc-400">Weekly Deposits</dt>
            <dd className="font-mono text-sm text-white">
              ${weeklyDepositTotal.toFixed(2)} / $100.00
            </dd>
          </div>
        </dl>
      </div>

      {/* Eligibility Gate */}
      {!eligible ? (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <h3 className="mb-2 text-sm font-semibold text-yellow-400">
            Deposits Unavailable
          </h3>
          {!balanceEligible && (
            <p className="text-sm text-zinc-400 mb-2">
              Your total balance is ${totalBalance.toFixed(2)}. Deposits are only
              available when your combined balance is below $5.00. Trade or
              withdraw funds to become eligible again.
            </p>
          )}
          {!weeklyEligible && (
            <p className="text-sm text-zinc-400">
              You have reached your weekly deposit limit of $100.00. Please wait
              until your rolling 7-day limit resets to make more deposits.
            </p>
          )}
        </div>
      ) : (
        <DepositForm />
      )}
    </div>
  );
}
