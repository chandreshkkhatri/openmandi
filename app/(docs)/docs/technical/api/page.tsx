export default function ApiReference() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-gold hover:prose-a:text-gold-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Technical Documentation
      </p>
      <h1>API Reference</h1>

      <p className="lead">
        The Open Mandi API provides RESTful endpoints for account management,
        wallet operations, trading, and transparency data. WebSocket feeds are
        available for real-time market data.
      </p>

      <h2>Base URL</h2>
      <pre>
        <code>{`https://api.openmandis.com/api/v1  (Coming Soon)`}</code>
      </pre>

      <h2>Authentication</h2>
      <p>
        Authenticated endpoints rely on an HTTP-only <code>__session</code>{" "}
        cookie that is set by the login endpoint and verified server-side on
        each request.
      </p>
      <p>
        After a successful Google sign-in, the <code>__session</code> cookie is
        automatically sent by the browser on subsequent requests to
        authenticated routes. You do not need to send an{" "}
        <code>Authorization</code> header with a Bearer token for these
        endpoints.
      </p>
      <p>
        For non-browser clients, you must preserve and include the{" "}
        <code>__session</code> cookie returned by the login endpoint in
        follow-up requests. Session cookies expire after 5 days.
      </p>

      <h2>Rate Limiting</h2>
      <table>
        <thead>
          <tr>
            <th>Endpoint Category</th>
            <th>Rate Limit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Public (market data)</td>
            <td>60 requests/minute</td>
          </tr>
          <tr>
            <td>Authenticated (read)</td>
            <td>120 requests/minute</td>
          </tr>
          <tr>
            <td>Authenticated (write)</td>
            <td>30 requests/minute</td>
          </tr>
        </tbody>
      </table>

      <h2>REST Endpoints</h2>

      <h3>Authentication</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>POST</td>
            <td>
              <code>/auth/register</code>
            </td>
            <td>Create a new account</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/auth/login</code>
            </td>
            <td>Authenticate and receive token</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/auth/logout</code>
            </td>
            <td>Invalidate current session</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/auth/session</code>
            </td>
            <td>Get current session info</td>
          </tr>
        </tbody>
      </table>

      <h3>Wallet</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>/wallet</code>
            </td>
            <td>Get balances (USDC)</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/wallet/transactions</code>
            </td>
            <td>Get transaction history</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/wallet/deposit</code>
            </td>
            <td>Get deposit instructions (USDC)</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/wallet/deposit/claim</code>
            </td>
            <td>Submit deposit tx-hash claim for verification</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/wallet/withdraw</code>
            </td>
            <td>Create withdrawal request (balance &gt;= $10)</td>
          </tr>
        </tbody>
      </table>

      <h3>Futures Trading</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>/orderbook/:symbol</code>
            </td>
            <td>
              Get order book (<code>xau</code> or <code>xag</code>)
            </td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/trade/:symbol/order</code>
            </td>
            <td>Place a futures order</td>
          </tr>
          <tr>
            <td>DELETE</td>
            <td>
              <code>/trade/order/:id</code>
            </td>
            <td>Cancel a futures order</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/positions</code>
            </td>
            <td>Get all open positions</td>
          </tr>
          <tr>
            <td>POST</td>
            <td>
              <code>/positions/:id/close</code>
            </td>
            <td>Close a position</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/trade/history</code>
            </td>
            <td>Get trade history</td>
          </tr>
        </tbody>
      </table>

      <h3>Transparency (Public)</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td>
              <code>/transparency/stats</code>
            </td>
            <td>Platform-wide statistics (no auth required)</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/transparency/fees</code>
            </td>
            <td>Fee revenue breakdown</td>
          </tr>
          <tr>
            <td>GET</td>
            <td>
              <code>/transparency/volume</code>
            </td>
            <td>Trading volume by market and time period</td>
          </tr>
        </tbody>
      </table>

      <h2>WebSocket Feeds</h2>
      <pre>
        <code>{`WebSocket URL: wss://api.openmandis.com/ws  (Coming Soon)

Subscription channels:
  - orderbook:<symbol>     Real-time order book updates
  - trades:<symbol>        Real-time trade feed
  - ticker:<symbol>        Price ticker updates
  - positions              User position updates (authenticated)`}</code>
      </pre>

      <h2>Error Codes</h2>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>400</td>
            <td>Bad Request &mdash; invalid parameters</td>
          </tr>
          <tr>
            <td>401</td>
            <td>Unauthorized &mdash; invalid or expired token</td>
          </tr>
          <tr>
            <td>403</td>
            <td>Forbidden &mdash; insufficient permissions</td>
          </tr>
          <tr>
            <td>404</td>
            <td>Not Found &mdash; resource does not exist</td>
          </tr>
          <tr>
            <td>409</td>
            <td>Conflict &mdash; e.g., duplicate order, balance insufficient</td>
          </tr>
          <tr>
            <td>422</td>
            <td>
              Unprocessable Entity &mdash; business rule violation (deposit
              limit, withdrawal threshold)
            </td>
          </tr>
          <tr>
            <td>429</td>
            <td>Too Many Requests &mdash; rate limit exceeded</td>
          </tr>
          <tr>
            <td>500</td>
            <td>Internal Server Error</td>
          </tr>
        </tbody>
      </table>

      <p>
        <em>
          Full request/response examples with payloads will be added as each
          endpoint is implemented.
        </em>
      </p>
    </article>
  );
}
