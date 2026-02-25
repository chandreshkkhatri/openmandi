const markets = [
  {
    symbol: "Au",
    name: "Gold Futures",
    pair: "XAU-PERP",
    price: "$2,847.50",
    change: "+1.24%",
    color: "gold" as const,
  },
  {
    symbol: "Ag",
    name: "Silver Futures",
    pair: "XAG-PERP",
    price: "$31.42",
    change: "+0.87%",
    color: "silver" as const,
  },
];

export default function MarketPreview() {
  return (
    <section
      id="markets"
      className="scroll-mt-20 border-t border-border bg-black py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Live Markets
          </p>
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            Trade Precious Metals
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Access the world&apos;s most trusted stores of value through
            crypto-native futures contracts.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {markets.map((market) => (
            <div
              key={market.symbol}
              className="rounded-2xl border border-border bg-surface p-8 md:p-10"
            >
              <div className="mb-6 flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full font-mono text-xl font-bold ${
                    market.color === "gold"
                      ? "bg-gold/20 text-gold"
                      : "bg-silver/20 text-silver"
                  }`}
                >
                  {market.symbol}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {market.name}
                  </h3>
                  <p className="text-sm text-zinc-500">{market.pair}</p>
                </div>
              </div>
              <div className="mb-6 flex items-baseline gap-3">
                <span className="font-mono text-4xl font-bold text-white">
                  {market.price}
                </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {market.change}
                </span>
              </div>
              <div className="flex gap-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                <span>Long &amp; Short</span>
                <span className="text-zinc-700">|</span>
                <span>Up to 50x Leverage</span>
                <span className="text-zinc-700">|</span>
                <span>24/7 Markets</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
