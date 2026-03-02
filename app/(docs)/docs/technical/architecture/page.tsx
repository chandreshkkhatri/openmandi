export default function Architecture() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Technical Documentation
      </p>
      <h1>System Architecture</h1>

      <p className="lead">
        Open Mandi is built as a monolithic Next.js application using the App
        Router paradigm. The architecture prioritizes simplicity and
        transparency, suitable for an academic exchange handling low-volume
        trading activity.
      </p>

      <h2>Technology Stack</h2>
      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Technology</th>
            <th>Version</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Framework</td>
            <td>Next.js (App Router)</td>
            <td>16.x</td>
          </tr>
          <tr>
            <td>Runtime</td>
            <td>React</td>
            <td>19.x</td>
          </tr>
          <tr>
            <td>Language</td>
            <td>TypeScript</td>
            <td>5.x</td>
          </tr>
          <tr>
            <td>Styling</td>
            <td>Tailwind CSS</td>
            <td>4.x</td>
          </tr>
          <tr>
            <td>Database</td>
            <td>PostgreSQL</td>
            <td>N/A</td>
          </tr>
          <tr>
            <td>ORM</td>
            <td>Drizzle ORM</td>
            <td>N/A</td>
          </tr>
          <tr>
            <td>Authentication</td>
            <td>Firebase Auth (Google sign-in)</td>
            <td>N/A</td>
          </tr>
        </tbody>
      </table>

      <h2>Frontend Architecture</h2>
      <p>
        The frontend uses the Next.js App Router with route groups to organize
        the application into distinct sections, each with its own layout:
      </p>
      <ul>
        <li>
          <code>(marketing)</code> &mdash; Landing page with promotional content
        </li>
        <li>
          <code>(docs)</code> &mdash; Documentation hub with sidebar navigation
        </li>
        <li>
          <code>(exchange)</code> &mdash; Trading application with dashboard
          layout
        </li>
        <li>
          <code>(legal)</code> &mdash; Terms and conditions with minimal layout
        </li>
      </ul>
      <p>
        React Server Components (RSC) are used by default. Client components
        (marked with <code>&quot;use client&quot;</code>) are limited to
        interactive elements such as sidebar navigation with active-state
        detection, order entry forms, and real-time data displays.
      </p>

      <h2>Backend Architecture</h2>
      <p>
        The backend is implemented using Next.js API routes (
        <code>app/api/</code>) and Server Actions. The architecture follows a
        layered pattern:
      </p>
      <pre>
        <code>{`┌─────────────────────────┐
│   API Routes / Actions  │  ← HTTP handlers, input validation
├─────────────────────────┤
│    Service Layer        │  ← Business logic, orchestration
├─────────────────────────┤
│    Repository Layer     │  ← Data access, queries
├─────────────────────────┤
│    Database             │  ← Persistent storage
└─────────────────────────┘`}</code>
      </pre>
      <p>
        <em>
          Implementation details for the backend layers will be documented as
          they are built in subsequent sprints.
        </em>
      </p>

      <h2>Database Layer</h2>
      <p>
        The database schema will be implemented with a relational database to
        ensure ACID compliance for financial transactions. Key design principles:
      </p>
      <ul>
        <li>
          <strong>Double-entry bookkeeping</strong> for all balance changes
        </li>
        <li>
          <strong>Atomic transactions</strong> for order matching and settlement
        </li>
        <li>
          <strong>Immutable audit trail</strong> for all financial operations
        </li>
        <li>
          <strong>Optimistic locking</strong> to prevent race conditions on
          balance updates
        </li>
      </ul>

      <h2>Authentication &amp; Session Management</h2>
      <p>
        Authentication is handled via Firebase Auth with Google sign-in as the
        identity provider. Upon successful authentication, the server creates
        an HTTP-only <code>__session</code> cookie containing a Firebase session
        token. Server-side routes verify this cookie to identify the current user
        and look up their PostgreSQL record.
      </p>

      <h2>Deployment Architecture</h2>
      <p>
        <em>Coming Soon</em> &mdash; Deployment configuration and infrastructure
        details will be documented as the platform moves toward hosting.
      </p>

      <h2>Scalability Considerations</h2>
      <p>
        As an academic exchange with low transaction volumes and strict deposit
        limits ($5 max), the architecture is designed for correctness and
        transparency rather than high-throughput performance. The monolithic
        approach is appropriate for this scale and simplifies debugging,
        deployment, and educational inspection of the system.
      </p>
      <p>
        Should volume requirements increase, the matching engine and WebSocket
        feeds are the primary candidates for extraction into dedicated services.
      </p>
    </article>
  );
}
