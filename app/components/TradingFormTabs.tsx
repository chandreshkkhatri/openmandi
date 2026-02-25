"use client";

import { useState } from "react";
import OrderForm from "./OrderForm";
import LPForm from "./LPForm";
import type { AccentColor } from "@/lib/trading/constants";

interface TradingFormTabsProps {
  pair: string;
  pairType: "spot" | "futures";
  minQuantity: string;
  tickSize: string;
  usdcAvailable: number;
  currentPrice: string;
  contractSize?: string;
  maxLeverage?: number;
  initialMarginRate?: string;
  accentColor?: AccentColor;
}

export default function TradingFormTabs(props: TradingFormTabsProps) {
  const [tab, setTab] = useState<"trade" | "lp">("trade");
  const accentColor = props.accentColor ?? "gold";

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(
          [
            { key: "trade", label: "Trade" },
            { key: "lp", label: "Provide Liquidity" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? `border-accent-${accentColor} bg-accent-${accentColor}/10 text-accent-${accentColor}`
                : "border-border text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "trade" ? (
        <OrderForm {...props} accentColor={accentColor} />
      ) : (
        <LPForm {...props} accentColor={accentColor} />
      )}
    </div>
  );
}
