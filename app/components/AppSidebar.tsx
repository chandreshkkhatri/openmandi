"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    title: "Overview",
    links: [{ href: "/exchange/dashboard", label: "Dashboard" }],
  },
  {
    title: "Wallet",
    links: [
      { href: "/exchange/wallet", label: "Balances" },
      { href: "/exchange/deposit", label: "Deposit" },
      { href: "/exchange/withdraw", label: "Withdraw" },
    ],
  },
  {
    title: "Trading",
    links: [
      { href: "/exchange/trade/gold", label: "Gold Futures" },
      { href: "/exchange/trade/silver", label: "Silver Futures" },
      { href: "/exchange/positions", label: "Positions & Orders" },
    ],
  },
  {
    title: "Info",
    links: [
      { href: "/exchange/settings", label: "Settings" },
    ],
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface">
      <div className="sticky top-0 h-screen overflow-y-auto p-4 pt-6">
        <nav className="flex flex-col gap-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {section.title}
              </p>
              <ul className="flex flex-col gap-0.5">
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
        <div className="mt-8 border-t border-border pt-4">
          <Link
            href="/docs"
            className="block px-3 text-sm text-zinc-500 transition-colors hover:text-white"
          >
            Documentation &rarr;
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }}
            className="mt-3 block w-full px-3 text-left text-sm text-zinc-500 transition-colors hover:text-white"
          >
            Log Out &rarr;
          </button>
        </div>
      </div>
    </aside>
  );
}
