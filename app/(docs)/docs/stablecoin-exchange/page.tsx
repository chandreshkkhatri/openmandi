export default function StablecoinExchange() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-gold hover:prose-a:text-gold-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Using the Exchange
      </p>
      <h1>Stablecoin Exchange (Retired)</h1>

      <p className="lead">
        The internal stablecoin exchange feature has been removed. Open Mandi now
        operates with a USDC-only wallet model for trading futures.
      </p>

      <h2>What changed?</h2>
      <ul>
        <li>The stablecoin spot market has been retired.</li>
        <li>All trading collateral is now USDC.</li>
        <li>Gold and silver perpetual futures remain available.</li>
      </ul>

      <h2>Where to go next</h2>
      <p>
        Continue with <a href="/docs/futures-contracts">Futures Contracts</a>,
        <a href="/docs/deposits-withdrawals"> Deposits & Withdrawals</a>, or the
        <a href="/exchange/trade/gold"> Gold trading interface</a>.
      </p>
    </article>
  );
}
