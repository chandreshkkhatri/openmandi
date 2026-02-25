const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description:
      "Sign up with Google in seconds. No crypto wallet needed — just a Google account to get started.",
  },
  {
    number: "02",
    title: "Fund Your Account",
    description:
      "Deposit USDC to your trading wallet. Quick, simple, and ready to trade in minutes.",
  },
  {
    number: "03",
    title: "Choose Your Market",
    description:
      "Go long and short on gold and silver perpetual futures with up to 50x leverage.",
  },
  {
    number: "04",
    title: "Start Trading",
    description:
      "Place market or limit orders with real-time matching. Provide liquidity and earn zero maker fees.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-border bg-surface py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Getting Started
          </p>
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            How It Works
          </h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold font-mono text-xl font-bold text-gold">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
