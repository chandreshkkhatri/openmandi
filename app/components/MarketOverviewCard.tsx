import Link from "next/link";
import { getAccentColor } from "@/lib/trading/constants";

interface MarketOverviewCardProps {
  name: string;
  pair: string;
  price: string;
  href: string;
}

export default function MarketOverviewCard({
  name,
  pair,
  price,
  href,
}: MarketOverviewCardProps) {
  const priceDecimals = pair === "XAG-PERP" ? 3 : 2;
  const formattedPrice = parseFloat(price).toFixed(priceDecimals);
  const accentColor = getAccentColor(pair);

  return (
    <Link
      href={href}
      className={`rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent-${accentColor}/30`}
    >
      <p className="text-sm font-medium text-zinc-400">{pair}</p>
      <p className="mt-1 text-lg font-semibold text-white">{name}</p>
      <p className={`mt-3 font-mono text-2xl font-bold text-accent-${accentColor}`}>
        ${formattedPrice}
      </p>
      <p className="mt-2 text-xs text-zinc-500">View market &rarr;</p>
    </Link>
  );
}
