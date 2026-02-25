export default function CallToAction() {
  return (
    <section
      id="early-access"
      className="relative scroll-mt-20 border-t border-border bg-black py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(245,166,35,0.08)_0%,_transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          Start Now
        </p>
        <h2 className="mb-6 text-3xl font-bold text-white md:text-5xl">
          Ready to Trade?
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-zinc-400">
          Sign up and start trading gold and silver futures with USDC collateral.
          Zero maker fees and up to 50x leverage.
        </p>
        <a
          href="/signup"
          className="animate-pulse-glow inline-block rounded-full bg-gold px-10 py-4 text-lg font-semibold text-black transition-colors hover:bg-gold-light"
        >
          Create Account
        </a>
        <p className="mt-6 text-xs text-zinc-600">
          Free to sign up. Start trading in minutes.
        </p>
      </div>
    </section>
  );
}
