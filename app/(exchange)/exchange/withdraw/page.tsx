import { getSession } from "@/lib/auth/session";
import { getUserWallets, getTotalBalance } from "@/lib/db/queries/wallet";
import WithdrawForm from "@/app/components/WithdrawForm";

export default async function Withdraw() {
  const user = await getSession();
  if (!user) return null;

  const { usdc } = await getUserWallets(user.id);
  const totalBalance = getTotalBalance(usdc?.balance ?? null);

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
      ) : (
        <WithdrawForm
          usdcAvailable={parseFloat(usdc?.availableBalance ?? "0")}
        />
      )}
    </div>
  );
}
