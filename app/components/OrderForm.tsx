"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccentColor } from "@/lib/trading/constants";
import { getCurrencyColor } from "@/lib/trading/constants";

interface OrderFormProps {
  pair: string;
  pairType: "spot" | "futures";
  minQuantity: string;
  tickSize: string;
  usdcAvailable: number;
  contractSize?: string;
  maxLeverage?: number;
  initialMarginRate?: string;
  currentPrice?: string;
  accentColor?: AccentColor;
}

export default function OrderForm({
  pair,
  pairType,
  minQuantity,
  tickSize,
  usdcAvailable,
  contractSize,
  maxLeverage = 50,
  initialMarginRate,
  currentPrice,
  accentColor = "gold",
}: OrderFormProps) {
  const router = useRouter();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState(currentPrice ?? "");
  const [quantity, setQuantity] = useState("");
  const collateral = "USDC" as const;
  const [leverage, setLeverage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const parsedPrice = parseFloat(price);
  const parsedQty = parseFloat(quantity);

  // Calculate estimated cost / margin
  let estimatedCost = 0;
  let estimatedMargin = 0;
  if (!isNaN(parsedQty) && parsedQty > 0) {
    if (pairType === "spot") {
      if (orderType === "limit" && !isNaN(parsedPrice)) {
        estimatedCost = side === "buy" ? parsedQty * parsedPrice : parsedQty;
      }
    } else if (contractSize && initialMarginRate) {
      const priceForCalc =
        orderType === "limit" && !isNaN(parsedPrice)
          ? parsedPrice
          : parseFloat(currentPrice ?? "0");
      const notional = parsedQty * parseFloat(contractSize) * priceForCalc;
      estimatedMargin = notional / leverage;
    }
  }

  const isValid =
    !isNaN(parsedQty) &&
    parsedQty >= parseFloat(minQuantity) &&
    (orderType === "market" || (!isNaN(parsedPrice) && parsedPrice > 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        pair,
        side,
        type: orderType,
        quantity,
      };

      if (orderType === "limit") {
        body.price = price;
      }

      if (pairType === "futures") {
        body.collateralCurrency = collateral;
        body.leverage = leverage;
      }

      const res = await fetch("/api/trading/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");

      const fills = data.fills?.length ?? 0;
      setSuccess(
        fills > 0
          ? `Order ${data.order.status} — ${fills} fill(s)`
          : `Limit order placed (${data.order.status})`
      );
      setQuantity("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className={`mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent-${accentColor}`}>
        Place Order
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Buy / Sell Toggle */}
        <div className="flex gap-2">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold uppercase transition-colors ${
                side === s
                  ? s === "buy"
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : "border-red-500 bg-red-500/10 text-red-400"
                  : "border-border text-zinc-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Limit / Market Toggle */}
        <div className="flex gap-2">
          {(["limit", "market"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                orderType === t
                  ? `border-accent-${accentColor} bg-accent-${accentColor}/10 text-accent-${accentColor}`
                  : "border-border text-zinc-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Price Input */}
        {orderType === "limit" ? (
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Price</label>
            <input
              type="number"
              step={tickSize}
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={`w-full rounded-lg border border-border bg-black px-4 py-2.5 font-mono text-white placeholder-zinc-600 outline-none transition-colors focus:border-accent-${accentColor}/50`}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-black px-4 py-2.5 text-sm text-zinc-500">
            Market Price
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Quantity (min {minQuantity})
          </label>
          <input
            type="number"
            step={minQuantity}
            min={minQuantity}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className={`w-full rounded-lg border border-border bg-black px-4 py-2.5 font-mono text-white placeholder-zinc-600 outline-none transition-colors focus:border-accent-${accentColor}/50`}
          />
        </div>

        {/* Futures-specific: Collateral & Leverage */}
        {pairType === "futures" && (
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

        {/* Cost/Margin Preview */}
        {isValid && (
          <div className="rounded-lg border border-border bg-black p-4">
            <dl className="space-y-1 text-sm">
              {pairType === "spot" ? (
                <>
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">
                      {side === "buy" ? "Cost (USDC)" : "Sell Amount"}
                    </dt>
                    <dd className="font-mono text-white">
                      ${estimatedCost.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">Available</dt>
                    <dd className="font-mono text-zinc-300">
                      ${usdcAvailable.toFixed(2)}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">Est. Margin</dt>
                    <dd className="font-mono text-white">
                      ${estimatedMargin.toFixed(4)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">Available ({collateral})</dt>
                    <dd className="font-mono text-zinc-300">
                      ${usdcAvailable.toFixed(2)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        )}

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

        <button
          type="submit"
          disabled={loading || !isValid}
          className={`w-full rounded-lg px-4 py-2.5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${
            side === "buy"
              ? "bg-green-500 text-black"
              : "bg-red-500 text-white"
          }`}
        >
          {loading
            ? "Placing order..."
            : `${side === "buy" ? "Buy" : "Sell"} ${orderType === "limit" ? "Limit" : "Market"}`}
        </button>
      </form>
    </div>
  );
}
