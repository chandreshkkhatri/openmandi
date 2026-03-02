export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(143,149,49,0.12)_0%,_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Welcome to the digital bazaar
        </p>

        <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-7xl">
          Trade Grandpa&apos;s Shiny Rocks.
          <br />
          <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            At Web3 Speed.
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
          We took the oldest money on earth and put it on rails. 
          Trade gold and silver futures directly with your USDC. 
          No suits, no banking delays, no haggling required.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/signup"
            className="rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-primary-light"
          >
            Enter the Market
          </a>
          <a
            href="#features"
            className="rounded-full border border-primary px-8 py-3.5 text-base font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Show me around
          </a>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <span>Leave paperwork in 1995</span>
          <span className="text-primary/50">&middot;</span>
          <span>Open 24/7</span>
          <span className="text-primary/50">&middot;</span>
          <span>No suits allowed</span>
        </div>
      </div>
    </section>
  );
}
