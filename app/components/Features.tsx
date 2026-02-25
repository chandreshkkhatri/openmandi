const features = [
  {
    icon: "\u26A1",
    title: "Lightning-Fast Settlement",
    description:
      "Crypto-native settlement eliminates traditional T+2 delays. Your futures contracts settle in minutes, not days.",
  },
  {
    icon: "🪙",
    title: "USDC-Native Collateral",
    description:
      "Trade gold and silver perpetual futures with USDC as the single collateral and settlement asset.",
  },
  {
    icon: "\uD83D\uDEE1\uFE0F",
    title: "Secure by Design",
    description:
      "Server-side session verification, authenticated API routes, and secure credential handling protect your account and assets.",
  },
  {
    icon: "\uD83D\uDCCA",
    title: "Real-Time Price Discovery",
    description:
      "Live gold and silver spot prices feed directly into our futures engine, ensuring accurate and fair market pricing.",
  },
  {
    icon: "\uD83C\uDF10",
    title: "Global Access",
    description:
      "Trade from anywhere in the world. No geographic restrictions, no banking intermediaries, no barriers to entry.",
  },
  {
    icon: "\uD83D\uDCB0",
    title: "Low Fees, High Leverage",
    description:
      "Competitive fee structure with flexible leverage options. Keep more of your profits with minimized trading costs.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-border bg-black py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Why Open Mandi
          </p>
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            Built for the Modern Trader
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Combining the stability of precious metals with the innovation of
            cryptocurrency.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-surface p-8 transition-colors hover:border-gold/30 hover:bg-surface-light"
            >
              <div className="mb-4 text-3xl">{feature.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
