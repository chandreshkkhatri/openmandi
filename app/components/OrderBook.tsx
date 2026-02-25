import type { OrderBookLevel } from "@/lib/trading/types";
import type { AccentColor } from "@/lib/trading/constants";

interface OrderBookProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  pair: string;
  accentColor?: AccentColor;
}

export default function OrderBook({ bids, asks, pair, accentColor = "gold" }: OrderBookProps) {
  const maxQty = Math.max(
    ...bids.map((b) => parseFloat(b.quantity)),
    ...asks.map((a) => parseFloat(a.quantity)),
    1
  );

  const priceDecimals = pair === "XAG-PERP" ? 3 : 2;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-${accentColor}`}>
        Order Book
      </h2>

      {/* Header */}
      <div className="mb-1 flex justify-between text-xs text-zinc-500">
        <span>Price</span>
        <span>Qty</span>
        <span>Orders</span>
      </div>

      {/* Asks (reversed — lowest at bottom) */}
      <div className="mb-1 space-y-px">
        {asks.length === 0 ? (
          <p className="py-2 text-center text-xs text-zinc-600">No asks</p>
        ) : (
          [...asks].reverse().slice(0, 10).map((level, i) => {
            const depthPct = (parseFloat(level.quantity) / maxQty) * 100;
            return (
              <div
                key={`ask-${i}`}
                className="relative flex justify-between px-2 py-0.5 text-xs"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-red-500/10"
                  style={{ width: `${depthPct}%` }}
                />
                <span className="relative font-mono text-red-400">
                  {parseFloat(level.price).toFixed(priceDecimals)}
                </span>
                <span className="relative font-mono text-zinc-300">
                  {parseFloat(level.quantity).toFixed(2)}
                </span>
                <span className="relative font-mono text-zinc-500">
                  {level.orderCount}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Spread indicator */}
      {bids.length > 0 && asks.length > 0 && (
        <div className="border-y border-border/50 py-1 text-center text-xs text-zinc-500">
          Spread:{" "}
          <span className="font-mono">
            {(parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(
              priceDecimals
            )}
          </span>
        </div>
      )}

      {/* Bids (highest at top) */}
      <div className="mt-1 space-y-px">
        {bids.length === 0 ? (
          <p className="py-2 text-center text-xs text-zinc-600">No bids</p>
        ) : (
          bids.slice(0, 10).map((level, i) => {
            const depthPct = (parseFloat(level.quantity) / maxQty) * 100;
            return (
              <div
                key={`bid-${i}`}
                className="relative flex justify-between px-2 py-0.5 text-xs"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-green-500/10"
                  style={{ width: `${depthPct}%` }}
                />
                <span className="relative font-mono text-green-400">
                  {parseFloat(level.price).toFixed(priceDecimals)}
                </span>
                <span className="relative font-mono text-zinc-300">
                  {parseFloat(level.quantity).toFixed(2)}
                </span>
                <span className="relative font-mono text-zinc-500">
                  {level.orderCount}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
