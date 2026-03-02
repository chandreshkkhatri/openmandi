export default function Fees() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Using the Exchange
      </p>
      <h1>Fee Structure</h1>

      <p className="lead">
        Transparency is a core value at Open Mandi. We believe you should know
        exactly what you&apos;re paying, why you&apos;re paying it, and where
        that money goes. Here&apos;s a complete breakdown of every fee on the
        platform.
      </p>

      <h2>Our Fee Philosophy</h2>
      <p>
        Fees on Open Mandi serve two purposes: they sustain the platform and
        they teach you how fees work on real exchanges.
      </p>

      <h2>Trading Fees (Futures)</h2>
      <p>
        When you trade gold or silver futures, you pay a small fee based on the
        trade value. Fees differ depending on whether you&apos;re a{" "}
        <strong>maker</strong> or a <strong>taker</strong>:
      </p>
      <ul>
        <li>
          <strong>Maker</strong> &mdash; you place a limit order that adds
          liquidity to the order book (your order sits on the book waiting to be
          matched)
        </li>
        <li>
          <strong>Taker</strong> &mdash; you place an order that immediately
          matches with an existing order, removing liquidity from the book
        </li>
      </ul>

      <table>
        <thead>
          <tr>
            <th>Fee Type</th>
            <th>Rate</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Maker Fee</td>
            <td>0.02%</td>
            <td>Paid when your limit order is filled by another trader</td>
          </tr>
          <tr>
            <td>Taker Fee</td>
            <td>0.05%</td>
            <td>Paid when you fill an existing order on the book</td>
          </tr>
        </tbody>
      </table>
      <p>
        Makers get lower fees because they provide liquidity, which makes the
        market healthier for everyone.
      </p>

      <h2>Deposit Fees</h2>
      <p>
        <strong>No fees</strong>. Deposits are free on Open Mandi. You may pay
        network transaction fees (gas fees) on the blockchain side, but the
        platform itself does not charge for deposits.
      </p>

      <h2>Withdrawal Fees</h2>
      <p>
        A small flat fee is charged to cover blockchain transaction costs:
      </p>
      <table>
        <thead>
          <tr>
            <th>Currency</th>
            <th>Fee</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>USDC</td>
            <td>$0.10</td>
          </tr>
        </tbody>
      </table>

      <h2>Complete Fee Schedule</h2>
      <table>
        <thead>
          <tr>
            <th>Activity</th>
            <th>Fee</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Futures Trading (Maker)</td>
            <td>0.02%</td>
            <td>Of trade value</td>
          </tr>
          <tr>
            <td>Futures Trading (Taker)</td>
            <td>0.05%</td>
            <td>Of trade value</td>
          </tr>
          <tr>
            <td>Deposit</td>
            <td>Free</td>
            <td>Network fees may apply</td>
          </tr>
          <tr>
            <td>Withdrawal</td>
            <td>$0.10</td>
            <td>Flat fee per withdrawal</td>
          </tr>
        </tbody>
      </table>

      <h2>Where Do Fees Go?</h2>
      <p>
        Every fee collected by Open Mandi is tracked internally as part of
        exchange operations and treasury accounting. In the current MVP scope,
        fee details are presented through core wallet and trading interfaces.
      </p>
    </article>
  );
}
