export default function DataModels() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Technical Documentation
      </p>
      <h1>Data Models</h1>

      <p className="lead">
        This document describes the entity schemas that underpin the Open Mandi
        exchange. Financial values are represented using decimal types in the data
        model to minimize floating-point precision issues.
      </p>

      <h2>Entity Relationship Overview</h2>
      <pre>
        <code>{`User 1──* Wallet
User 1──* Order
User 1──* Position
Order 1──* Trade (as maker or taker)
Wallet 1──* Transaction
Position 1──* Trade`}</code>
      </pre>

      <h2>User</h2>
      <p>Represents a registered account on the platform.</p>
      <pre>
        <code>{`User {
  id:           UUID        (primary key)
  firebaseUid:  string      (unique, indexed — Firebase Auth identifier)
  email:        string      (unique, indexed)
  createdAt:    timestamp
  updatedAt:    timestamp

  // Authentication is handled by Firebase Auth; no passwords or password
  // hashes are stored in Postgres.
}`}</code>
      </pre>

      <h2>Wallet</h2>
      <p>
        Each user has a USDC wallet. The{" "}
        <code>balance</code> is the total funds, while{" "}
        <code>availableBalance</code> excludes funds locked as margin or in
        pending orders.
      </p>
      <pre>
        <code>{`Wallet {
  id:               UUID        (primary key)
  userId:           UUID        (foreign key → User)
  currency:         enum        ("USDC")
  balance:          decimal     (total balance)
  availableBalance: decimal     (balance - locked funds)
  updatedAt:        timestamp

  UNIQUE(userId, currency)
}`}</code>
      </pre>
      <p>Invariant: <code>availableBalance &lt;= balance</code> at all times.</p>

      <h2>Order</h2>
      <p>
        Represents a buy or sell order on futures order books (XAU, XAG).
      </p>
      <pre>
        <code>{`Order {
  id:             UUID        (primary key)
  userId:         UUID        (foreign key → User)
  pair:           enum        ("XAU-PERP" | "XAG-PERP")
  side:           enum        ("buy" | "sell")
  type:           enum        ("limit" | "market")
  price:          decimal?    (null for market orders)
  quantity:       decimal     (total order quantity)
  filledQuantity: decimal     (quantity already matched)
  status:         enum        ("open" | "partial" | "filled" | "cancelled")
  createdAt:      timestamp
  updatedAt:      timestamp

  INDEX(pair, status, price)  -- for order book queries
  INDEX(userId, status)       -- for user's open orders
}`}</code>
      </pre>

      <h2>Trade</h2>
      <p>
        Represents a single execution (fill) between a maker order and a taker
        order. One order can generate multiple trades (partial fills).
      </p>
      <pre>
        <code>{`Trade {
  id:             UUID        (primary key)
        pair:           enum        ("XAU-PERP" | "XAG-PERP")
  makerOrderId:   UUID        (foreign key → Order)
  takerOrderId:   UUID        (foreign key → Order)
  makerUserId:    UUID        (foreign key → User)
  takerUserId:    UUID        (foreign key → User)
  price:          decimal     (execution price)
  quantity:       decimal     (executed quantity)
  makerFee:       decimal     (fee charged to maker)
  takerFee:       decimal     (fee charged to taker)
  createdAt:      timestamp

  INDEX(pair, createdAt)      -- for recent trades query
}`}</code>
      </pre>

      <h2>Position</h2>
      <p>Represents an open futures position for a user.</p>
      <pre>
        <code>{`Position {
  id:               UUID        (primary key)
  userId:           UUID        (foreign key → User)
  contract:         enum        ("XAU-PERP" | "XAG-PERP")
  side:             enum        ("long" | "short")
  entryPrice:       decimal     (average entry price)
  quantity:         decimal     (number of contracts)
  margin:           decimal     (collateral locked)
  collateralCurrency: enum      ("USDC")
  liquidationPrice: decimal     (calculated)
  realizedPnl:      decimal     (from partial closes)
  status:           enum        ("open" | "closed" | "liquidated")
  createdAt:        timestamp
  updatedAt:        timestamp

  INDEX(userId, status)
  INDEX(contract, status)     -- for open interest queries
}`}</code>
      </pre>

      <h2>Transaction (Ledger)</h2>
      <p>
        Immutable record of every balance-affecting operation. Serves as the
        audit trail and enables double-entry bookkeeping verification.
      </p>
      <pre>
        <code>{`Transaction {
  id:             UUID        (primary key)
  userId:         UUID        (foreign key → User)
  walletId:       UUID        (foreign key → Wallet)
  type:           enum        ("deposit" | "withdrawal" | "trade_debit" |
                               "trade_credit" | "fee" | "margin_lock" |
                               "margin_release" | "liquidation" | "funding")
  currency:       enum        ("USDC")
  amount:         decimal     (signed: positive for credits, negative for debits)
  balanceAfter:   decimal     (wallet balance after this transaction)
  referenceId:    UUID?       (links to Order, Trade, or Position)
  referenceType:  string?     ("order" | "trade" | "position" | "deposit" | "withdrawal")
  createdAt:      timestamp

  INDEX(userId, createdAt)
  INDEX(walletId, createdAt)
  INDEX(type, createdAt)      -- for transparency aggregation
}`}</code>
      </pre>

      <h2>Design Principles</h2>
      <ul>
        <li>
          <strong>Decimal arithmetic</strong> &mdash; all monetary values use
          fixed-precision decimal types (e.g., <code>DECIMAL(18,8)</code>) to
          prevent floating-point errors
        </li>
        <li>
          <strong>Immutable ledger</strong> &mdash; Transaction records are
          insert-only; corrections are made by adding compensating entries, never
          by modifying existing records
        </li>
        <li>
          <strong>Referential integrity</strong> &mdash; all foreign keys are
          enforced at the database level
        </li>
        <li>
          <strong>Soft deletes</strong> &mdash; users and orders use status
          fields rather than physical deletion
        </li>
        <li>
          <strong>Optimistic locking</strong> &mdash; wallet balance updates use
          version checks to prevent lost updates under concurrency
        </li>
      </ul>
    </article>
  );
}
