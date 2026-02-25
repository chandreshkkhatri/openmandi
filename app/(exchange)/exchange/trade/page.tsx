import { getIndexPrices } from "@/lib/services/prices";
import MarketOverviewCard from "@/app/components/MarketOverviewCard";

export default async function TradingHub() {
  const prices = await getIndexPrices();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Trading Hub</h1>
      <p className="mb-8 text-zinc-400">
        Choose a market to view order books and place trades.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <MarketOverviewCard
          name="Gold Futures"
          pair="XAU-PERP"
          price={prices.gold.toFixed(2)}
          href="/exchange/trade/gold"
        />
        <MarketOverviewCard
          name="Silver Futures"
          pair="XAG-PERP"
          price={prices.silver.toFixed(3)}
          href="/exchange/trade/silver"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          Market Information
        </h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-zinc-500">Futures Fees</dt>
            <dd className="text-sm text-zinc-300">
              Maker 0.02% / Taker 0.05%
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Max Leverage</dt>
            <dd className="text-sm text-zinc-300">50x (Futures)</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
