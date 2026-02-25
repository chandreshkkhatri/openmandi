"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DepositForm() {
  const router = useRouter();
  const currency = "USDC" as const;
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [depositInfo, setDepositInfo] = useState<{
    network: string;
    tokenContract: string;
    address: string;
    minConfirmations: number;
    note: string;
  } | null>(null);

  const isValidTxHash = /^0x[a-fA-F0-9]{64}$/.test(txHash.trim());

  async function handleGetInstructions(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch deposit instructions");
      }

      setDepositInfo(data.deposit);
      setSuccess(`Deposit instructions ready for ${currency}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch deposit instructions");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitClaim(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoadingClaim(true);

    try {
      const res = await fetch("/api/wallet/deposit/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, txHash: txHash.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Deposit claim failed");
      }

      setSuccess(
        `Deposit claim submitted. Funds will be credited after ${depositInfo?.minConfirmations ?? 3} confirmations.`
      );
      setTxHash("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit claim failed");
    } finally {
      setLoadingClaim(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Make a Deposit
      </h2>

      <form onSubmit={handleGetInstructions} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Currency
          </label>
          <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-medium text-gold">
            USDC
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gold px-4 py-2.5 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Fetching deposit instructions..." : `Get ${currency} Deposit Address`}
        </button>
      </form>

      {depositInfo && (
        <div className="mt-4 space-y-4 rounded-lg border border-border bg-black p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Network</p>
            <p className="text-sm text-white">{depositInfo.network}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Deposit Address</p>
            <p className="break-all font-mono text-sm text-white">{depositInfo.address}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Token Contract</p>
            <p className="break-all font-mono text-xs text-zinc-300">{depositInfo.tokenContract}</p>
          </div>
          <p className="text-xs text-zinc-400">{depositInfo.note}</p>

          <form onSubmit={handleSubmitClaim} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">
                Transaction Hash
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-gold/50"
              />
            </div>
            <button
              type="submit"
              disabled={loadingClaim || !isValidTxHash}
              className="w-full rounded-lg border border-gold/50 px-4 py-2.5 font-semibold text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
            >
              {loadingClaim ? "Submitting claim..." : "Submit Deposit Claim"}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        Deposits are credited only after on-chain confirmation and claim verification.
      </p>
    </div>
  );
}
