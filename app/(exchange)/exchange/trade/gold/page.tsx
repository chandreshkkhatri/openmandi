import { getSession } from "@/lib/auth/session";
import { getUserWallets } from "@/lib/db/queries/wallet";
import {
  getOrderBook,
  getRecentTrades,
  getUserOpenOrders,
  getUserPositions,
} from "@/lib/db/queries/trading";
import { getMarkPrice } from "@/lib/services/prices";
import { calculateUnrealizedPnl } from "@/lib/services/margin";
import { PAIRS } from "@/lib/trading/constants";
import LiveOrderBook from "@/app/components/LiveOrderBook";
import TradeHistory from "@/app/components/TradeHistory";
import TradingFormTabs from "@/app/components/TradingFormTabs";
import OpenOrdersTable from "@/app/components/OpenOrdersTable";
import PriceDisplay from "@/app/components/PriceDisplay";
import PositionCard from "@/app/components/PositionCard";

export const dynamic = "force-dynamic";

export default async function GoldFutures() {
  const user = await getSession();
  if (!user) return null;

  const pairConfig = PAIRS["XAU-PERP"];

  const [
    { usdc },
    markData,
    orderBook,
    recentTrades,
    openOrders,
    userPositions,
  ] = await Promise.all([
    getUserWallets(user.id),
    getMarkPrice("XAU-PERP"),
    getOrderBook("XAU-PERP"),
    getRecentTrades("XAU-PERP", 20),
    getUserOpenOrders(user.id, "XAU-PERP"),
    getUserPositions(user.id, "open"),
  ]);

  const xauPositions = userPositions.filter((p) => p.contract === "XAU-PERP");

  // Enrich positions with PnL
  const enrichedPositions = xauPositions.map((pos) => {
    const unrealizedPnl = calculateUnrealizedPnl(
      pos.side as "long" | "short",
      pos.entryPrice,
      markData.markPrice,
      pos.quantity,
      pairConfig.contractSize
    );
    return {
      ...pos,
      unrealizedPnl: unrealizedPnl.toFixed(8),
      markPrice: markData.markPrice,
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-bold text-white">
        Gold Futures (XAU-PERP)
      </h1>
      <p className="mb-4 text-zinc-400">
        Trade gold perpetual futures with up to 50x leverage. Contract size:
        0.001 troy oz.
      </p>

      {/* Price Bar */}
      <div className="mb-6">
        <PriceDisplay
          indexPrice={markData.indexPrice}
          markPrice={markData.markPrice}
          fundingRate={markData.fundingRate}
          nextFundingAt={markData.nextFundingAt}
          contract="XAU-PERP"
          accentColor="gold"
        />
      </div>

      {/* Open Positions */}
      {enrichedPositions.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-gold">
            Open Positions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {enrichedPositions.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        </div>
      )}

      {/* Main Trading Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <LiveOrderBook
            pair="XAU-PERP"
            initialBids={orderBook.bids}
            initialAsks={orderBook.asks}
            accentColor="gold"
          />
        </div>

        <div>
          <TradingFormTabs
            pair="XAU-PERP"
            pairType="futures"
            minQuantity={pairConfig.minQuantity}
            tickSize={pairConfig.tickSize}
            usdcAvailable={parseFloat(usdc?.availableBalance ?? "0")}
            contractSize={pairConfig.contractSize}
            maxLeverage={pairConfig.maxLeverage}
            initialMarginRate={pairConfig.initialMarginRate}
            currentPrice={parseFloat(markData.markPrice).toFixed(2)}
            accentColor="gold"
          />
        </div>

        <div className="space-y-6">
          <TradeHistory trades={recentTrades} pair="XAU-PERP" accentColor="gold" />
          <OpenOrdersTable orders={openOrders} accentColor="gold" />
        </div>
      </div>
    </div>
  );
}
