import Link from "next/link";

const topics = [
  {
    href: "/docs/technical/architecture",
    title: "System Architecture",
    description:
      "Technology stack, frontend/backend layers, and deployment model.",
  },
  {
    href: "/docs/technical/order-engine",
    title: "Order Matching Engine",
    description:
      "Price-time priority matching algorithm, order book data structures.",
  },
  {
    href: "/docs/technical/price-discovery",
    title: "Price Discovery",
    description:
      "Futures market pricing, mark price composition, and order book dynamics.",
  },
  {
    href: "/docs/technical/futures-specs",
    title: "Futures Specifications",
    description:
      "XAU and XAG contract parameters, margin, and liquidation rules.",
  },
  {
    href: "/docs/technical/api",
    title: "API Reference",
    description: "REST endpoints, WebSocket feeds, authentication, and errors.",
  },
  {
    href: "/docs/technical/data-models",
    title: "Data Models",
    description:
      "Entity schemas for users, wallets, orders, trades, and positions.",
  },
  {
    href: "/docs/technical/security",
    title: "Security Model",
    description:
      "Authentication, authorization, input validation, and audit logging.",
  },
];

export default function TechnicalDocsHub() {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Technical Documentation
      </p>
      <h1 className="mb-4 text-4xl font-bold text-white">
        Technical Reference
      </h1>
      <p className="mb-12 text-lg text-zinc-400">
        Detailed technical documentation covering the internal architecture,
        algorithms, data models, and APIs that power the Open Mandi exchange.
        This documentation is intended for developers, researchers, and anyone
        interested in the engineering behind the platform.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((topic) => (
          <Link
            key={topic.href}
            href={topic.href}
            className="group rounded-xl border border-border bg-surface p-6 transition-colors hover:border-gold/30 hover:bg-surface-light"
          >
            <h2 className="mb-2 text-lg font-semibold text-white group-hover:text-gold">
              {topic.title}
            </h2>
            <p className="text-sm text-zinc-400">{topic.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
