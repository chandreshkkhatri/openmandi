export default function FuturesContracts() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Concepts
      </p>
      <h1>Understanding Futures Contracts</h1>

      <p className="lead">
        A futures contract is simply an agreement to buy or sell something at a
        specific price on a future date. On Open Mandi, you trade gold and
        silver futures &mdash; meaning you&apos;re making bets on where you
        think the price of these metals will go.
      </p>

      <h2>What is a Futures Contract?</h2>
      <p>
        Imagine you&apos;re a jeweler who needs gold in three months. You&apos;re
        worried the price might go up between now and then. So you make a deal
        with a gold producer: &quot;I&apos;ll buy 1 ounce of gold from you in
        three months at today&apos;s price of $2,850.&quot;
      </p>
      <p>
        That deal is a futures contract. Both sides are locked in: the jeweler
        knows exactly what they&apos;ll pay, and the producer knows exactly what
        they&apos;ll receive.
      </p>
      <p>
        On Open Mandi, you don&apos;t actually receive physical gold or
        silver. Instead, contracts are <strong>cash-settled</strong> &mdash; the
        difference between your entry price and the settlement price is
        calculated, and your account is credited or debited accordingly.
      </p>

      <h2>Why Trade Futures Instead of the Real Thing?</h2>
      <ul>
        <li>
          <strong>Leverage</strong> &mdash; you can control a large position with
          a smaller amount of money (called margin). This amplifies both gains
          and losses.
        </li>
        <li>
          <strong>Go short</strong> &mdash; with futures, you can profit when
          prices fall, not just when they rise
        </li>
        <li>
          <strong>No storage</strong> &mdash; you don&apos;t need to worry about
          storing physical gold or silver
        </li>
        <li>
          <strong>Speed</strong> &mdash; futures settle digitally, much faster
          than physical delivery
        </li>
      </ul>

      <h2>Long vs. Short Positions</h2>
      <p>When you trade futures, you take a position:</p>
      <ul>
        <li>
          <strong>Long (buy)</strong> &mdash; you believe the price will go{" "}
          <em>up</em>. You profit if gold/silver rises above your entry price.
        </li>
        <li>
          <strong>Short (sell)</strong> &mdash; you believe the price will go{" "}
          <em>down</em>. You profit if gold/silver falls below your entry price.
        </li>
      </ul>
      <p>
        For example, if you go long on gold at $2,850 and the price rises to
        $2,900, you&apos;ve made $50 per contract. If the price drops to $2,800,
        you&apos;ve lost $50 per contract.
      </p>

      <h2>Margin and Collateral</h2>
      <p>
        You don&apos;t need to put up the full value of a futures contract.
        Instead, you put up <strong>margin</strong> &mdash; a fraction of the
        contract value that acts as collateral.
      </p>
      <p>
        On Open Mandi, your margin is held in USDC. If the market
        moves against you and your margin runs low, you may need to add more
        funds or your position could be <strong>liquidated</strong> (
        automatically closed) to prevent further losses.
      </p>

      <h2>Liquidation</h2>
      <p>
        Liquidation happens when your losses eat into your margin to a point
        where the exchange can no longer guarantee your position. When this
        happens, your position is automatically closed at the current market
        price.
      </p>
      <p>
        This is an important safety mechanism. It protects both you and the
        exchange from losses that exceed your collateral.
      </p>

      <h2>Contract Settlement</h2>
      <p>
        Futures contracts on Open Mandi are settled in stablecoins. When a
        contract expires or when you close your position, the profit or loss is
        calculated and your USDC balance is updated accordingly.
      </p>

      <h2>Risks of Futures Trading</h2>
      <p>Futures trading carries real risks that you should understand:</p>
      <ul>
        <li>
          <strong>Leverage amplifies losses</strong> &mdash; just as leverage can
          multiply your profits, it can also multiply your losses
        </li>
        <li>
          <strong>Liquidation risk</strong> &mdash; if the market moves sharply
          against you, your entire margin can be lost
        </li>
        <li>
          <strong>Volatility</strong> &mdash; commodity prices can change rapidly
          and unpredictably
        </li>
        <li>
          <strong>Not guaranteed</strong> &mdash; past performance does not
          predict future results
        </li>
      </ul>
      <p>
        Because Open Mandi is an academic platform with small deposit limits,
        your risk is naturally constrained. But it&apos;s important to understand
        these concepts as they apply to real-world trading.
      </p>
    </article>
  );
}
