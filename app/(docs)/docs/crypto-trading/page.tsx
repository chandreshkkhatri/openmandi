export default function CryptoTrading() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Concepts
      </p>
      <h1>Crypto-Powered Commodities Trading</h1>

      <p className="lead">
        Open Mandi combines two worlds: traditional commodities trading and
        modern cryptocurrency. Instead of wiring money through a bank, you use
        stablecoins to trade gold and silver futures. Here&apos;s how it all
        fits together.
      </p>

      <h2>What are Stablecoins?</h2>
      <p>
        Stablecoins are a type of cryptocurrency designed to maintain a stable
        value. Unlike Bitcoin or Ethereum, which can swing wildly in price,
        stablecoins are pegged to real-world currencies &mdash; usually the US
        dollar.
      </p>
      <p>Open Mandi accepts USDC as its trading stablecoin:</p>
      <ul>
        <li>
          <strong>USDC (USD Coin)</strong> &mdash; a fully-reserved stablecoin
          backed by US dollar assets, where 1 USDC is designed to equal 1 US
          dollar
        </li>
      </ul>

      <h2>Why Use Stablecoins for Trading?</h2>
      <p>
        Using stablecoins instead of traditional money offers several advantages:
      </p>
      <ul>
        <li>
          <strong>Speed</strong> &mdash; crypto transactions settle in minutes,
          not days. Traditional bank wires can take 1-3 business days.
        </li>
        <li>
          <strong>Accessibility</strong> &mdash; anyone with an internet
          connection can participate. No need for a bank account or brokerage
          relationship.
        </li>
        <li>
          <strong>Transparency</strong> &mdash; blockchain transactions are
          publicly verifiable. You can confirm that deposits and withdrawals
          actually happened.
        </li>
        <li>
          <strong>Lower barriers</strong> &mdash; traditional futures brokers
          often require large minimum deposits. Open Mandi lets you start with
          as little as $5.
        </li>
      </ul>

      <h2>How Your Funds are Managed</h2>
      <p>
        When you deposit USDC into Open Mandi, your balance is tracked on the
        platform. Your funds are used as collateral for trading futures.
      </p>
      <p>
        Every transaction &mdash; deposits, withdrawals, trades, and fees
        &mdash; is recorded in a transparent ledger that you can review at any
        time.
      </p>

      <h2>Settlement and Finality</h2>
      <p>
        When a trade is matched on Open Mandi, settlement happens
        immediately. There&apos;s no waiting period. Your balances are updated
        in real time, and your positions reflect current market prices.
      </p>
      <p>
        This is a major advantage over traditional markets, where settlements
        can take two business days (known as T+2 settlement).
      </p>

      <h2>USDC-Only Collateral Model</h2>
      <p>
        Open Mandi uses a single-collateral model with USDC for deposits,
        margin, settlement, and withdrawals. This keeps accounting simple and
        makes risk calculations easier to reason about.
      </p>

      <h2>Advantages Over Traditional Brokerages</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Traditional Brokerage</th>
            <th>Open Mandi</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Settlement time</td>
            <td>1-2 business days</td>
            <td>Instant</td>
          </tr>
          <tr>
            <td>Minimum deposit</td>
            <td>$500 - $10,000+</td>
            <td>As low as $5</td>
          </tr>
          <tr>
            <td>Trading hours</td>
            <td>Market hours only</td>
            <td>24/7</td>
          </tr>
          <tr>
            <td>Geographic access</td>
            <td>Country-restricted</td>
            <td>Global</td>
          </tr>
          <tr>
            <td>Transparency</td>
            <td>Limited</td>
            <td>Fully public</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
