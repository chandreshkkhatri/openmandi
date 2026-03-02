const markets = [
  {
    symbol: "Au",
    name: "Gold Futures",
    pair: "XAU-PERP",
    price: "$2,847.50",
    change: "+1.24%",
    color: "gold" as const,
    tagline: "The OG safe haven. Now tradable 24/7 without the dusty vault.",
  },
  {
    symbol: "Ag",
    name: "Silver Futures",
    pair: "XAG-PERP",
    price: "$31.42",
    change: "+0.87%",
    color: "silver" as const,
    tagline: "Gold's scrappy younger sibling. Highly volatile, highly fun.",
  },
];

export default function MarketPreview() {
  return (
    <section
      id="markets"
      className="scroll-mt-20 border-t border-border bg-background py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            On the Menu
          </p>
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            Choose Your Asset
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Trade the two assets that have survived every financial crisis since the dawn of humanity.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {markets.map((market) => (
            <div
              key={market.symbol}
              className="group rounded-2xl border border-border bg-surface p-8 md:p-10 transition-colors hover:border-primary/30"
            >
              <div className="mb-6 flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full font-mono text-xl font-bold transition-transform group-hover:scale-110 ${
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
              <p className="mb-4 text-sm text-zinc-400">{market.tagline}</p>
              <div className="mb-6 flex items-baseline gap-3">
                <span className="font-mono text-4xl font-bold text-white">
                  {market.price}
                </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {market.change}
                </span>
              </div>
              <div className="flex gap-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                <span>Go Long/Short</span>
                <span className="text-zinc-700">|</span>
                <span>Max 50x</span>
                <span className="text-zinc-700">|</span>
                <span>Never Sleeps</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
