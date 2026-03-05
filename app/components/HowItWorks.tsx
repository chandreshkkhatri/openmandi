const steps = [
  {
    number: "01",
    title: "Walk In",
    description:
      "One-click Google login. No KYC selfies, no uploading utility bills from 2004. You're instantaneously in.",
  },
  {
    number: "02",
    title: "Bring Your Wallet",
    description:
      "Drop some USDC into your account to fund your trading balance. Fast, secure, and ready to go.",
  },
  {
    number: "03",
    title: "Pick Your Fighter",
    description:
      "Gold for the purists. Silver for the thrill-seekers. Crank up the leverage if you're feeling spicy.",
  },
  {
    number: "04",
    title: "Make Your Move",
    description:
      "Long it, short it, or provide liquidity. The market is yours for the taking.",
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
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Speedrun Setup
          </p>
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            Four Steps to Glory
          </h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary font-mono text-xl font-bold text-primary">
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
