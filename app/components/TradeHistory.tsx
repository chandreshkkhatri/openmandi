import type { Trade } from "@/lib/trading/types";
import type { AccentColor } from "@/lib/trading/constants";

interface TradeHistoryProps {
  trades: Trade[];
  pair: string;
  accentColor?: AccentColor;
}

export default function TradeHistory({ trades, pair, accentColor = "gold" }: TradeHistoryProps) {
  const priceDecimals = pair === "XAG-PERP" ? 3 : 2;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-${accentColor}`}>
        Recent Trades
      </h2>

      {trades.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">
          No trades yet
        </p>
      ) : (
        <div className="space-y-px">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Price</span>
            <span>Qty</span>
            <span>Time</span>
          </div>
          {trades.slice(0, 15).map((trade) => (
            <div
              key={trade.id}
              className="flex justify-between py-0.5 text-xs"
            >
              <span className="font-mono text-zinc-300">
                {parseFloat(trade.price).toFixed(priceDecimals)}
              </span>
              <span className="font-mono text-zinc-400">
                {parseFloat(trade.quantity).toFixed(2)}
              </span>
              <span className="text-zinc-500">
                {trade.createdAt.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
