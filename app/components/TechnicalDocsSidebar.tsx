"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/docs/technical/architecture", label: "System Architecture" },
  { href: "/docs/technical/order-engine", label: "Order Matching Engine" },
  { href: "/docs/technical/price-discovery", label: "Price Discovery" },
  { href: "/docs/technical/futures-specs", label: "Futures Specifications" },
  { href: "/docs/technical/api", label: "API Reference" },
  { href: "/docs/technical/data-models", label: "Data Models" },
  { href: "/docs/technical/security", label: "Security Model" },
];

export default function TechnicalDocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface">
      <div className="sticky top-0 h-screen overflow-y-auto p-6">
        <Link
          href="/docs"
          className="mb-2 block text-sm text-zinc-500 transition-colors hover:text-white"
        >
          &larr; Back to Docs
        </Link>
        <Link
          href="/docs/technical"
          className="mb-6 block text-lg font-bold text-white"
        >
          {"\u25C6"} Technical Docs
        </Link>
        <nav>
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
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
        </nav>
      </div>
    </aside>
  );
}
