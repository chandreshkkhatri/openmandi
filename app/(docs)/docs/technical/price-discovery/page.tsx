export default function PriceDiscovery() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Technical Documentation
      </p>
      <h1>Futures Price Discovery Mechanism</h1>

      <p className="lead">
        Open Mandi determines futures prices through continuous order-book
        matching. Mark prices are then derived from both external index inputs
        and internal market liquidity.
      </p>

      <h2>Price Discovery Principle</h2>
      <p>
        Open Mandi futures markets are free-order-book markets: prices emerge
        from competing buy and sell orders. There is no manually administered
        contract price.
      </p>
      <p>
        This design helps users study market microstructure: spread formation,
        queue priority, and slippage behavior under changing liquidity.
      </p>

      <h2>Order Book Structure</h2>
      <p>
        Each futures contract has an independent order book. The same matching
        logic applies to both gold and silver contracts:
      </p>
      <ul>
        <li>
          <strong>Bid side</strong> &mdash; buy orders sorted highest price first
        </li>
        <li>
          <strong>Ask side</strong> &mdash; sell orders sorted lowest price first
        </li>
      </ul>

      <h2>Mid-Market Price Calculation</h2>
      <p>
        The mid-market price is calculated as the arithmetic mean of the best
        bid and best ask:
      </p>
      <pre>
        <code>{`midPrice = (bestBid + bestAsk) / 2

Example:
  bestBid = 2849.90
  bestAsk = 2850.10
  midPrice = 2850.00`}</code>
      </pre>
      <p>
        The mid-market price is used as the reference rate for display purposes
        and contributes to mark-price calculation.
      </p>

      <h2>Spread Dynamics and Liquidity</h2>
      <p>
        The <strong>spread</strong> is the difference between the best ask and
        the best bid:
      </p>
      <pre>
        <code>{`spread = bestAsk - bestBid
spreadPercent = (spread / midPrice) * 100`}</code>
      </pre>
      <p>Key dynamics on Open Mandi futures markets:</p>
      <ul>
        <li>
          <strong>Thin liquidity</strong> &mdash; lower participation can widen
          spreads and increase market-order slippage
        </li>
        <li>
          <strong>Spread as opportunity</strong> &mdash; wider spreads incentivize
          tighter maker quoting
        </li>
        <li>
          <strong>Maker fee incentive</strong> &mdash; lower maker fees encourage
          resting liquidity
        </li>
      </ul>

      <h2>Edge Cases</h2>
      <h3>Empty Order Book</h3>
      <p>
        When one or both sides of the order book are empty, the mid-market price
        is undefined. Market orders on the empty side will be rejected. Limit
        orders can still be placed and will rest until a counterparty arrives.
      </p>

      <h3>Self-Trading Prevention</h3>
      <p>
        A user&apos;s buy order cannot match against their own sell order. The
        matching engine skips self-matches and continues to the next order in
        the queue.
      </p>

      <h2>Mark Price vs Last Trade</h2>
      <p>
        Open Mandi uses mark price for risk and liquidation logic. Mark price
        blends index and order-book signals to avoid overreacting to isolated
        prints:
      </p>
      <pre>
        <code>{`markPrice = (indexPrice * 0.7) + (orderBookMid * 0.3)`}</code>
      </pre>
    </article>
  );
}
