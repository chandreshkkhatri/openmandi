export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,166,35,0.15)_0%,_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          The Future of Commodities Trading
        </p>

        <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-7xl">
          Trade{" "}
          <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
            Gold &amp; Silver
          </span>{" "}
          Futures with Crypto
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
          Open Mandi bridges cryptocurrency and precious metals markets.
          Access gold and silver futures contracts with the speed, capital efficiency,
          and security of blockchain technology.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/signup"
            className="animate-pulse-glow rounded-full bg-gold px-8 py-3.5 text-base font-semibold text-black transition-colors hover:bg-gold-light"
          >
            Start Trading
          </a>
          <a
            href="#features"
            className="rounded-full border border-gold px-8 py-3.5 text-base font-semibold text-gold transition-colors hover:bg-gold/10"
          >
            Learn More
          </a>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <span>USDC-Native</span>
          <span className="text-gold/50">{"\u25C6"}</span>
          <span>24/7 Trading</span>
          <span className="text-gold/50">{"\u25C6"}</span>
          <span>Institutional Grade</span>
        </div>
      </div>
    </section>
  );
}
