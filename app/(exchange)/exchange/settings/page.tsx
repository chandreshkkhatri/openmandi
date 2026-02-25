import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function Settings() {
  const user = await getSession();

  if (!user) return null;

  const userWallets = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, user.id));

  const usdcWallet = userWallets.find((w) => w.currency === "USDC");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Account Settings</h1>
      <p className="mb-8 text-zinc-400">
        Your account information and wallet balances.
      </p>

      <div className="space-y-6">
        {/* Account Info */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Account
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-400">Email</dt>
              <dd className="text-sm text-white">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-400">Member since</dt>
              <dd className="text-sm text-white">
                {user.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-400">Account ID</dt>
              <dd className="font-mono text-sm text-zinc-500">
                {user.id.slice(0, 8)}...
              </dd>
            </div>
          </dl>
        </div>

        {/* Wallet Balances */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Wallets
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-400">USDC Balance</dt>
              <dd className="font-mono text-sm text-white">
                ${usdcWallet?.balance ?? "0.00"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
