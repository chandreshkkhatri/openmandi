export default function CallToAction() {
  return (
    <section
      id="early-access"
      className="relative scroll-mt-20 border-t border-border bg-background py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(143,149,49,0.08)_0%,_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Enough Scrolling
        </p>
        <h2 className="mb-6 text-3xl font-bold text-white md:text-5xl">
          Get in the Game
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-zinc-400">
          Sign up with Google in literally 3 seconds. 
          Deposit USDC. Start trading gold and silver like a degenerate, or 
          play it safe and provide liquidity for zero fees. 
        </p>
        <a
          href="/signup"
          className="inline-block rounded-full bg-primary px-10 py-4 text-lg font-semibold text-white transition-transform hover:scale-105 hover:bg-primary-light"
        >
          Open an Account →
        </a>
        <p className="mt-6 text-xs text-zinc-600">
          It&apos;s free, fast, and entirely on your terms.
        </p>
      </div>
    </section>
  );
}
