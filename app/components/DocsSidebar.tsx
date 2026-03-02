"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    title: "Getting Started",
    links: [{ href: "/docs/getting-started", label: "Getting Started" }],
  },
  {
    title: "Concepts",
    links: [
      { href: "/docs/what-is-commodities", label: "What is a Commodities Exchange?" },
      { href: "/docs/futures-contracts", label: "Futures Contracts" },
      { href: "/docs/crypto-trading", label: "Crypto-Powered Trading" },
    ],
  },
  {
    title: "Using the Exchange",
    links: [
      { href: "/docs/deposits-withdrawals", label: "Deposits & Withdrawals" },
      { href: "/docs/fees", label: "Fee Structure" },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
    ],
  },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface">
      <div className="sticky top-0 h-screen overflow-y-auto p-6">
        <Link
          href="/"
          className="mb-6 flex items-center gap-2 text-lg font-bold text-white"
        >
          <Image src="/logo.svg" alt="Open Mandi" width={32} height={32} className="h-8 w-auto" />
          Open Mandi
        </Link>
        <nav className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {section.title}
              </p>
              <ul className="flex flex-col gap-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        pathname === link.href
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
