import Link from "next/link";

const topics = [
  {
    href: "/docs/getting-started",
    title: "Getting Started",
    description: "Set up your account and make your first trade.",
  },
  {
    href: "/docs/what-is-commodities",
    title: "What is a Commodities Exchange?",
    description: "Learn how commodities markets work and why they matter.",
  },
  {
    href: "/docs/futures-contracts",
    title: "Futures Contracts",
    description: "Understand what futures are and how to trade them.",
  },
  {
    href: "/docs/crypto-trading",
    title: "Crypto-Powered Trading",
    description: "How stablecoins enable modern commodities trading.",
  },
  {
    href: "/docs/deposits-withdrawals",
    title: "Deposits & Withdrawals",
    description: "How to fund your account and withdraw your earnings.",
  },
  {
    href: "/docs/fees",
    title: "Fee Structure",
    description: "A clear breakdown of all fees on the platform.",
  },
];

export default function DocsHub() {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Documentation
      </p>
      <h1 className="mb-4 text-4xl font-bold text-white">
        Open Mandi Documentation
      </h1>
      <p className="mb-12 text-lg text-zinc-400">
        Welcome to the Open Mandi documentation. Whether you&apos;re new to
        commodities trading or an experienced trader exploring crypto-powered
        markets, these guides will help you understand how everything works.
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
