export default function OrderEngine() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Technical Documentation
      </p>
      <h1>Order Matching Engine</h1>

      <p className="lead">
        The order matching engine is the core component of the Open Mandi
        exchange. It processes incoming orders, maintains the order book, and
        executes trades using a price-time priority (FIFO) algorithm.
      </p>

      <h2>Engine Overview</h2>
      <p>
        The matching engine operates on two order books: XAU (gold futures)
        and XAG (silver futures). Each order book is independent and maintains
        its own bid and ask queues.
      </p>
      <p>
        The engine is synchronous within a single order book &mdash; orders are
        processed sequentially to prevent race conditions. Cross-book operations
        (e.g., settling a futures trade that debits a wallet balance) are
        wrapped in database transactions to ensure atomicity.
      </p>

      <h2>Order Types Supported</h2>
      <table>
        <thead>
          <tr>
            <th>Order Type</th>
            <th>Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Limit Order</td>
            <td>
              Placed at a specific price. Rests on the order book until filled,
              cancelled, or expired. Eligible for maker fee rate.
            </td>
          </tr>
          <tr>
            <td>Market Order</td>
            <td>
              Executed immediately at the best available price(s). Walks the book
              if necessary to fill the full quantity. Always pays taker fee rate.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Matching Algorithm: Price-Time Priority (FIFO)</h2>
      <p>
        The matching algorithm follows the industry-standard price-time priority
        model:
      </p>
      <ol>
        <li>
          <strong>Price priority</strong> &mdash; orders with better prices are
          matched first. For bids, higher prices have priority. For asks, lower
          prices have priority.
        </li>
        <li>
          <strong>Time priority</strong> &mdash; among orders at the same price
          level, the order that was placed first (earliest timestamp) is matched
          first (First In, First Out).
        </li>
      </ol>
      <pre>
        <code>{`Incoming BUY order: quantity=10, price=MARKET

Ask side of order book:
  Price   | Quantity | Time
  --------|----------|----------
  100.02  | 5        | 10:00:01  ← matched first (best price)
  100.02  | 3        | 10:00:05  ← matched second (same price, later time)
  100.05  | 20       | 10:00:02  ← matched third (2 units, worse price)

Result: 3 fills → (5@100.02) + (3@100.02) + (2@100.05) = 10 units`}</code>
      </pre>

      <h2>Order Book Data Structure</h2>
      <p>
        Each side of the order book (bids and asks) is maintained as a sorted
        collection:
      </p>
      <ul>
        <li>
          <strong>Bids</strong> &mdash; sorted in descending order by price
          (highest bid first)
        </li>
        <li>
          <strong>Asks</strong> &mdash; sorted in ascending order by price
          (lowest ask first)
        </li>
      </ul>
      <p>
        At each price level, orders are maintained in a FIFO queue. The data
        structure supports O(log n) insertion and O(1) access to the best
        bid/ask.
      </p>
      <pre>
        <code>{`OrderBook {
  bids: SortedMap<Price, Queue<Order>>  // descending by price
  asks: SortedMap<Price, Queue<Order>>  // ascending by price
}

Order {
  id: UUID
  userId: string
  side: "buy" | "sell"
  type: "limit" | "market"
  price: Decimal         // null for market orders
  quantity: Decimal
  filledQuantity: Decimal
  status: "open" | "partial" | "filled" | "cancelled"
  createdAt: Timestamp
}`}</code>
      </pre>

      <h2>Partial Fills and Order Lifecycle</h2>
      <p>An order moves through the following states:</p>
      <ol>
        <li>
          <strong>Open</strong> &mdash; order is placed and resting on the book
          (limit orders only)
        </li>
        <li>
          <strong>Partial</strong> &mdash; order has been partially filled but
          still has remaining quantity
        </li>
        <li>
          <strong>Filled</strong> &mdash; order is completely filled
        </li>
        <li>
          <strong>Cancelled</strong> &mdash; order was cancelled by the user or
          system
        </li>
      </ol>
      <p>
        Each fill generates a <code>Trade</code> record linking the maker order
        and taker order, recording the execution price, quantity, and fees for
        both sides.
      </p>

      <h2>Concurrency and Race Condition Handling</h2>
      <p>
        The matching engine serializes order processing per order book using a
        write lock. This ensures that:
      </p>
      <ul>
        <li>
          Two orders cannot simultaneously match against the same resting order
        </li>
        <li>
          Balance checks and debits are atomic with order placement
        </li>
        <li>
          The order book state is always consistent
        </li>
      </ul>
      <p>
        Balance updates resulting from fills are executed within the same
        database transaction as the trade record insertion, guaranteeing that
        funds are never double-spent or lost.
      </p>

      <h2>Performance Characteristics</h2>
      <p>
        Given the academic nature and low volume of the exchange, the matching
        engine is optimized for correctness rather than throughput. Expected
        performance:
      </p>
      <ul>
        <li>Order placement: &lt; 50ms</li>
        <li>Order matching: &lt; 10ms per match</li>
        <li>Order book depth: supports up to 10,000 resting orders per side</li>
      </ul>
    </article>
  );
}
