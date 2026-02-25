"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccentColor } from "@/lib/trading/constants";
import { getCurrencyColor } from "@/lib/trading/constants";

interface LPFormProps {
  pair: string;
  pairType: "spot" | "futures";
  tickSize: string;
  minQuantity: string;
  usdcAvailable: number;
  currentPrice: string;
  contractSize?: string;
  maxLeverage?: number;
  accentColor?: AccentColor;
}

const SPREAD_PRESETS = [
  { label: "Tight", value: 0.001, description: "±0.1%" },
  { label: "Normal", value: 0.005, description: "±0.5%" },
  { label: "Wide", value: 0.01, description: "±1.0%" },
];

const LEVEL_OPTIONS = [3, 5, 10];

interface OrderPreview {
  side: "buy" | "sell";
  price: string;
  quantity: string;
  cost: number;
}

export default function LPForm({
  pair,
  pairType,
  tickSize,
  minQuantity,
  usdcAvailable,
  currentPrice,
  contractSize,
  maxLeverage = 50,
  accentColor = "gold",
}: LPFormProps) {
  const router = useRouter();
  const [spread, setSpread] = useState(0.005);
  const [levels, setLevels] = useState(3);
  const [leverage, setLeverage] = useState(10);
  const collateral = "USDC" as const;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState({ placed: 0, total: 0 });

  // Spot: separate amounts for each side
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  // Futures: single total amount
  const [totalAmount, setTotalAmount] = useState("");

  const centerPrice = parseFloat(currentPrice);
  const tickSizeNum = parseFloat(tickSize);
  const minQty = parseFloat(minQuantity);

  function roundToTick(price: number): string {
    const ticks = Math.round(price / tickSizeNum);
    return (ticks * tickSizeNum).toFixed(
      tickSize.includes(".") ? tickSize.split(".")[1].length : 0
    );
  }

  function generateOrders(): OrderPreview[] {
    if (isNaN(centerPrice) || centerPrice <= 0) return [];

    const safeSpread = Math.max(0.0001, Math.min(spread, 0.1));
    const safeLevels = LEVEL_OPTIONS.includes(levels) ? levels : 3;
    const orders: OrderPreview[] = [];

    if (pairType === "spot") {
      const sellAmt = parseFloat(sellAmount);
      const buyAmt = parseFloat(buyAmount);

      // Sell side: selling base asset at prices above center
      if (!isNaN(sellAmt) && sellAmt >= minQty) {
        let remainingSell = sellAmt;
        for (let i = 1; i <= safeLevels; i++) {
          if (remainingSell < minQty) break;
          const price = centerPrice * (1 + safeSpread * i);
          const remainingLevels = safeLevels - i + 1;
          let qty = Math.max(remainingSell / remainingLevels, minQty);
          qty = Math.min(qty, remainingSell);
          if (qty < minQty) break;
          orders.push({
            side: "sell",
            price: roundToTick(price),
            quantity: qty.toFixed(
              minQuantity.includes(".") ? minQuantity.split(".")[1].length : 0
            ),
            cost: qty,
          });
          remainingSell -= qty;
        }
      }

      // Buy side: buying base asset with quote currency at prices below center
      if (!isNaN(buyAmt) && buyAmt > 0) {
        let remainingBuy = buyAmt;
        for (let i = 1; i <= safeLevels; i++) {
          if (remainingBuy <= 0) break;
          const price = centerPrice * (1 - safeSpread * i);
          if (price <= 0) continue;
          const remainingLevels = safeLevels - i + 1;
          const budget = remainingBuy / remainingLevels;
          let qty = Math.max(budget / price, minQty);
          let cost = qty * price;
          if (cost > remainingBuy) {
            qty = remainingBuy / price;
            cost = qty * price;
          }
          if (qty < minQty) break;
          orders.push({
            side: "buy",
            price: roundToTick(price),
            quantity: qty.toFixed(
              minQuantity.includes(".") ? minQuantity.split(".")[1].length : 0
            ),
            cost,
          });
          remainingBuy -= cost;
        }
      }
    } else {
      // Futures: both sides from same collateral
      const total = parseFloat(totalAmount);
      if (isNaN(total) || total <= 0 || !contractSize) return [];

      const cSize = parseFloat(contractSize);
      const marginPerSide = total / 2;
      const marginPerOrder = marginPerSide / safeLevels;

      for (let i = 1; i <= safeLevels; i++) {
        // Buy side (below center)
        const buyPrice = centerPrice * (1 - safeSpread * i);
        if (buyPrice > 0) {
          const notional = marginPerOrder * leverage;
          const qty = Math.max(Math.floor(notional / (cSize * buyPrice)), 1);
          const actualMargin = (qty * cSize * buyPrice) / leverage;
          orders.push({
            side: "buy",
            price: roundToTick(buyPrice),
            quantity: qty.toString(),
            cost: actualMargin,
          });
        }

        // Sell side (above center)
        const sellPrice = centerPrice * (1 + safeSpread * i);
        const notional = marginPerOrder * leverage;
        const qty = Math.max(Math.floor(notional / (cSize * sellPrice)), 1);
        const actualMargin = (qty * cSize * sellPrice) / leverage;
        orders.push({
          side: "sell",
          price: roundToTick(sellPrice),
          quantity: qty.toString(),
          cost: actualMargin,
        });
      }
    }

    return orders;
  }

  const preview = generateOrders();
  const buyOrders = preview.filter((o) => o.side === "buy");
  const sellOrders = preview.filter((o) => o.side === "sell");
  const totalCostBuy = buyOrders.reduce((s, o) => s + o.cost, 0);
  const totalCostSell = sellOrders.reduce((s, o) => s + o.cost, 0);

  const hasBuyOrders = buyOrders.length > 0;
  const hasSellOrders = sellOrders.length > 0;
  const canSubmitSpot =
    (!hasSellOrders || totalCostSell <= usdcAvailable) &&
    (!hasBuyOrders || totalCostBuy <= usdcAvailable);

  const collateralAvailable = usdcAvailable;
  const totalFuturesCost = totalCostBuy + totalCostSell;

  const canSubmit =
    preview.length > 0 &&
    !loading &&
    (pairType === "spot"
      ? canSubmitSpot
      : parseFloat(totalAmount) > 0 && totalFuturesCost <= collateralAvailable);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    setProgress({ placed: 0, total: preview.length });

    let placed = 0;
    let failed = 0;
    let firstError = "";

    for (const order of preview) {
      try {
        const body: Record<string, unknown> = {
          pair,
          side: order.side,
          type: "limit",
          price: order.price,
          quantity: order.quantity,
        };

        if (pairType === "futures") {
          body.collateralCurrency = collateral;
          body.leverage = leverage;
        }

        const res = await fetch("/api/trading/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Order failed");
        }

        placed++;
        setProgress({ placed, total: preview.length });
      } catch (err) {
        failed++;
        if (!firstError) {
          firstError =
            err instanceof Error ? err.message : "Unknown error";
        }
      }
    }

    setLoading(false);

    if (placed > 0) {
      setSuccess(
        `Placed ${placed} of ${preview.length} orders${failed > 0 ? ` (${failed} failed: ${firstError})` : ""}`
      );
      setSellAmount("");
      setBuyAmount("");
      setTotalAmount("");
      router.refresh();
    } else {
      setError(
        firstError || "All orders failed. Check your balances and try again."
      );
    }
  }

  const priceDecimals = tickSize.includes(".")
    ? tickSize.split(".")[1].length
    : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className={`mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent-${accentColor}`}>
        Provide Liquidity
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Center Price */}
        <div className="rounded-lg border border-border bg-black px-4 py-2.5 text-sm">
          <span className="text-zinc-400">Center Price: </span>
          <span className="font-mono text-white">
            ${centerPrice.toFixed(priceDecimals)}
          </span>
        </div>

        {/* Amount Inputs */}
        {pairType === "spot" ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">
                Amount to sell (above center)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full rounded-lg border border-border bg-black px-4 py-2.5 font-mono text-white placeholder-zinc-600 outline-none transition-colors focus:border-accent-${accentColor}/50`}
                />
                <span className="text-xs text-zinc-500">
                  avail: ${usdcAvailable.toFixed(2)}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">
                USDC to buy with (below center)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full rounded-lg border border-border bg-black px-4 py-2.5 font-mono text-white placeholder-zinc-600 outline-none transition-colors focus:border-accent-${accentColor}/50`}
                />
                <span className="text-xs text-zinc-500">
                  avail: ${usdcAvailable.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">
                Collateral
              </label>
              <div className={`rounded-lg border border-accent-${getCurrencyColor("USDC")}/30 bg-accent-${getCurrencyColor("USDC")}/10 px-4 py-2 text-sm font-medium text-accent-${getCurrencyColor("USDC")}`}>
                USDC
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">
                Total margin to allocate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full rounded-lg border border-border bg-black px-4 py-2.5 font-mono text-white placeholder-zinc-600 outline-none transition-colors focus:border-accent-${accentColor}/50`}
                />
                <span className="text-xs text-zinc-500">
                  avail: ${usdcAvailable.toFixed(2)}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-zinc-400">
                Leverage: {leverage}x
              </label>
              <input
                type="range"
                min="1"
                max={maxLeverage}
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className={`w-full accent-accent-${accentColor}`}
              />
              <div className="flex justify-between text-xs text-zinc-500">
                <span>1x</span>
                <span>{maxLeverage}x</span>
              </div>
            </div>
          </>
        )}

        {/* Spread Selector */}
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Spread</label>
          <div className="flex gap-2">
            {SPREAD_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSpread(preset.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors ${
                  spread === preset.value
                    ? `border-accent-${accentColor} bg-accent-${accentColor}/10 text-accent-${accentColor}`
                    : "border-border text-zinc-400 hover:text-white"
                }`}
              >
                <div>{preset.label}</div>
                <div className="text-[10px] opacity-70">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Levels Selector */}
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Levels per side
          </label>
          <div className="flex gap-2">
            {LEVEL_OPTIONS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevels(l)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  levels === l
                    ? `border-accent-${accentColor} bg-accent-${accentColor}/10 text-accent-${accentColor}`
                    : "border-border text-zinc-400 hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="rounded-lg border border-border bg-black p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Preview — {preview.length} orders
            </p>

            {buyOrders.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-xs text-green-400">
                  Buy orders ({buyOrders.length})
                </p>
                {buyOrders.map((o, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-xs font-mono"
                  >
                    <span className="text-zinc-300">
                      ${o.price} × {o.quantity}
                      {pairType === "futures" ? " contracts" : ""}
                    </span>
                    <span className="text-zinc-500">
                      {pairType === "spot"
                        ? `$${o.cost.toFixed(2)} USDC`
                        : `$${o.cost.toFixed(4)} margin`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {sellOrders.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-xs text-red-400">
                  Sell orders ({sellOrders.length})
                </p>
                {sellOrders.map((o, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-xs font-mono"
                  >
                    <span className="text-zinc-300">
                      ${o.price} × {o.quantity}
                      {pairType === "futures" ? " contracts" : ""}
                    </span>
                    <span className="text-zinc-500">
                      {pairType === "spot"
                        ? `$${o.cost.toFixed(2)} USDC`
                        : `$${o.cost.toFixed(4)} margin`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-2 text-xs">
              {pairType === "spot" ? (
                <div className="flex justify-between text-zinc-400">
                  <span>
                    Total: ${totalCostSell.toFixed(2)} USDC + $
                    {totalCostBuy.toFixed(2)} USDC
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-zinc-400">
                  <span>
                    Total margin: ${(totalCostBuy + totalCostSell).toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full rounded-lg bg-accent-${accentColor} px-4 py-2.5 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50`}
        >
          {loading
            ? `Placing orders... (${progress.placed}/${progress.total})`
            : `Place ${preview.length} Orders`}
        </button>

        <p className="text-xs text-zinc-500">
          Limit orders earn 0% maker fees. Orders remain open until filled or
          cancelled.
        </p>
      </form>
    </div>
  );
}
