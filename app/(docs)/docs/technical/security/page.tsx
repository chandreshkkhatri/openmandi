export default function Security() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Technical Documentation
      </p>
      <h1>Security Model</h1>

      <p className="lead">
        The Open Mandi security model follows a defense-in-depth approach,
        implementing multiple layers of protection across authentication, data
        integrity, and financial operations. As an academic platform, the
        security design balances robustness with transparency.
      </p>

      <h2>Authentication</h2>
      <ul>
        <li>
          <strong>Firebase Authentication</strong> &mdash; user authentication is
          handled by Firebase Auth, with Google sign-in as the primary identity
          provider. The application does not manage or store user passwords
          directly.
        </li>
        <li>
          <strong>Server-side sessions</strong> &mdash; upon successful
          Firebase authentication, the backend issues secure, HTTP-only, same-site
          session cookies that represent the authenticated user. Session cookies
          are validated on each request.
        </li>
        <li>
          <strong>Session lifetime</strong> &mdash; session cookies have bounded
          lifetimes (5 days) and can be revoked server-side by invalidating the
          user&apos;s Firebase refresh tokens on logout.
        </li>
      </ul>

      <h2>Authorization</h2>
      <ul>
        <li>
          <strong>Resource-based access control</strong> &mdash; users can only
          access their own wallets, orders, positions, and transaction history.
          Ownership is verified on every request.
        </li>
        <li>
          <strong>Public endpoints</strong> &mdash; order books, recent trades,
          and transparency data are publicly accessible without authentication.
        </li>
        <li>
          <strong>Write operations</strong> &mdash; all state-changing operations
          (deposits, withdrawals, order placement) require authenticated
          sessions.
        </li>
      </ul>

      <h2>Input Validation and Sanitization</h2>
      <ul>
        <li>
          <strong>Schema validation</strong> &mdash; all API inputs are validated
          against strict schemas (using Zod) before processing. Invalid inputs
          are rejected with descriptive error messages.
        </li>
        <li>
          <strong>Type coercion</strong> &mdash; numeric inputs are parsed and
          validated as decimals with defined precision limits.
        </li>
        <li>
          <strong>SQL injection prevention</strong> &mdash; parameterized queries
          via ORM; no raw SQL string concatenation.
        </li>
        <li>
          <strong>XSS prevention</strong> &mdash; React&apos;s default output
          escaping, plus Content Security Policy headers.
        </li>
      </ul>

      <h2>Rate Limiting and Abuse Prevention</h2>
      <ul>
        <li>
          Per-IP and per-user rate limits on all endpoints (see API Reference for
          specific limits)
        </li>
        <li>
          Exponential backoff on failed authentication attempts (account lockout
          after 10 consecutive failures)
        </li>
        <li>
          Self-trading prevention in the matching engine (a user&apos;s buy
          cannot match their own sell)
        </li>
      </ul>

      <h2>Data Encryption</h2>
      <ul>
        <li>
          <strong>In transit</strong> &mdash; all connections use TLS 1.3. HTTP
          is redirected to HTTPS.
        </li>
        <li>
          <strong>At rest</strong> &mdash; database encryption enabled at the
          storage layer. Sensitive fields (email) are encrypted at the
          application level.
        </li>
      </ul>

      <h2>Financial Security</h2>
      <ul>
        <li>
          <strong>Atomic transactions</strong> &mdash; all balance changes
          (order fills, deposits, withdrawals) execute within database
          transactions. Partial failures result in full rollback.
        </li>
        <li>
          <strong>Balance integrity checks</strong> &mdash; the sum of all
          transaction ledger entries for a wallet must equal the current balance.
          Periodic reconciliation jobs verify this invariant.
        </li>
        <li>
          <strong>Optimistic locking</strong> &mdash; wallet updates use version
          checks to prevent race conditions where two concurrent operations
          could both read the same balance.
        </li>
        <li>
          <strong>Business rule enforcement</strong> &mdash; deposit limits ($5
          max, balance &lt; $1), withdrawal thresholds (balance &gt;= $10), and
          margin requirements are enforced at both the API layer and the database
          constraint layer.
        </li>
      </ul>

      <h2>Audit Logging</h2>
      <p>
        All significant operations generate audit log entries:
      </p>
      <ul>
        <li>Authentication events (login, logout, failed attempts)</li>
        <li>Financial operations (deposits, withdrawals, trades)</li>
        <li>Order lifecycle events (placement, fill, cancellation)</li>
        <li>Position events (open, close, liquidation)</li>
        <li>Administrative actions (if applicable)</li>
      </ul>
      <p>
        Audit logs are append-only and include the user ID, IP address,
        timestamp, action type, and relevant entity IDs. They are retained
        indefinitely for transparency and research purposes.
      </p>

      <h2>Academic Context Considerations</h2>
      <p>
        As an academic platform with small financial exposure (max $5 deposits),
        the threat model differs from production financial systems:
      </p>
      <ul>
        <li>
          The primary risk is educational data integrity, not large-scale
          financial theft
        </li>
        <li>
          Transparency requirements mean some data that would normally be private
          (aggregate volumes, fee totals) is intentionally public
        </li>
        <li>
          The security model is documented openly as part of the educational
          mission
        </li>
      </ul>
    </article>
  );
}
