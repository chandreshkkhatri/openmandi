const features = [
  {
    icon: "\u26A1",
    title: "Skip the Middleman",
    description:
      "T+2 settlement? Try T+2 seconds. Your trades settle instantly on our high-performance matching engine.",
  },
  {
    icon: "🪙",
    title: "One Coin to Rule Them",
    description:
      "Your USDC is all you need. Deposit, take massive leverage on gold, and withdraw your profits. Simple as that.",
  },
  {
    icon: "\uD83D\uDEE1\uFE0F",
    title: "Your Keys, Your Metals",
    description:
      "We keep the bad actors out with server-side auth, but we don't hold your funds captive. Secure, fast, and yours.",
  },
  {
    icon: "\uD83C\uDFAF",
    title: "No Made-Up Numbers",
    description:
      "Live spot prices stream straight from the real world into our matching engine. If gold moves in London, you see it here immediately.",
  },
  {
    icon: "\uD83C\uDF10",
    title: "The Bazaar is Always Open",
    description:
      "Got Wi-Fi? You're in. Trade from anywhere, anytime, without needing a bank's permission.",
  },
  {
    icon: "\uD83D\uDCB0",
    title: "The House Doesn't Always Win",
    description:
      "Provide liquidity and you pay absolutely zero fees. Taking a market order? Just a tiny 0.05% fee.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-border bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            The Good Stuff
          </p>
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            Why you&apos;ll actually like it here
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            We combined the unshakeable stability of precious metals with the degenerate speed of crypto.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-surface p-8 transition-colors hover:border-primary/30 hover:bg-surface-light"
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
