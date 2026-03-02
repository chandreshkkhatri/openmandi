export default function FuturesSpecs() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Technical Documentation
      </p>
      <h1>Futures Contract Specifications</h1>

      <p className="lead">
        Open Mandi offers perpetual futures contracts for gold (XAU) and
        silver (XAG), collateralized with USDC. This document details
        the contract parameters, margin model, and liquidation mechanics.
      </p>

      <h2>Gold Futures (XAU/USD)</h2>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Symbol</td>
            <td>XAU-PERP</td>
          </tr>
          <tr>
            <td>Underlying</td>
            <td>Gold spot price (USD)</td>
          </tr>
          <tr>
            <td>Contract Type</td>
            <td>Perpetual (no expiry)</td>
          </tr>
          <tr>
            <td>Contract Size</td>
            <td>0.001 troy ounce per contract</td>
          </tr>
          <tr>
            <td>Tick Size</td>
            <td>$0.01</td>
          </tr>
          <tr>
            <td>Collateral</td>
            <td>USDC</td>
          </tr>
          <tr>
            <td>Maximum Leverage</td>
            <td>50x</td>
          </tr>
          <tr>
            <td>Initial Margin</td>
            <td>2% of position notional</td>
          </tr>
          <tr>
            <td>Maintenance Margin</td>
            <td>1% of position notional</td>
          </tr>
          <tr>
            <td>Maker Fee</td>
            <td>0.02%</td>
          </tr>
          <tr>
            <td>Taker Fee</td>
            <td>0.05%</td>
          </tr>
        </tbody>
      </table>

      <h2>Silver Futures (XAG/USD)</h2>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Symbol</td>
            <td>XAG-PERP</td>
          </tr>
          <tr>
            <td>Underlying</td>
            <td>Silver spot price (USD)</td>
          </tr>
          <tr>
            <td>Contract Type</td>
            <td>Perpetual (no expiry)</td>
          </tr>
          <tr>
            <td>Contract Size</td>
            <td>0.1 troy ounce per contract</td>
          </tr>
          <tr>
            <td>Tick Size</td>
            <td>$0.001</td>
          </tr>
          <tr>
            <td>Collateral</td>
            <td>USDC</td>
          </tr>
          <tr>
            <td>Maximum Leverage</td>
            <td>50x</td>
          </tr>
          <tr>
            <td>Initial Margin</td>
            <td>2% of position notional</td>
          </tr>
          <tr>
            <td>Maintenance Margin</td>
            <td>1% of position notional</td>
          </tr>
          <tr>
            <td>Maker Fee</td>
            <td>0.02%</td>
          </tr>
          <tr>
            <td>Taker Fee</td>
            <td>0.05%</td>
          </tr>
        </tbody>
      </table>

      <h2>Price Feed Integration</h2>
      <p>
        The mark price for each futures contract is derived from an external
        price oracle providing real-time spot prices for gold and silver in USD.
        Two prices are maintained:
      </p>
      <ul>
        <li>
          <strong>Index Price</strong> &mdash; the external reference price from
          the oracle, representing the global spot market consensus
        </li>
        <li>
          <strong>Mark Price</strong> &mdash; a weighted combination of the index
          price and the order book mid-price, used for liquidation calculations
          and unrealized PnL
        </li>
      </ul>
      <pre>
        <code>{`markPrice = (indexPrice * 0.7) + (orderBookMidPrice * 0.3)

// If order book is empty or illiquid:
markPrice = indexPrice`}</code>
      </pre>

      <h2>Margin Model</h2>
      <h3>Initial Margin</h3>
      <p>
        The initial margin is the collateral required to open a position. It is
        calculated as:
      </p>
      <pre>
        <code>{`initialMargin = (quantity * contractSize * markPrice) / leverage

Example (Gold, 10x leverage):
  quantity = 100 contracts
  contractSize = 0.001 oz
  markPrice = $2,850
  initialMargin = (100 * 0.001 * 2850) / 10 = $28.50`}</code>
      </pre>

      <h3>Maintenance Margin</h3>
      <p>
        The maintenance margin is the minimum collateral required to keep a
        position open. If unrealized losses cause the remaining margin to fall
        below this threshold, liquidation is triggered.
      </p>
      <pre>
        <code>{`maintenanceMargin = quantity * contractSize * markPrice * 0.01

// Liquidation occurs when:
// margin + unrealizedPnL < maintenanceMargin`}</code>
      </pre>

      <h2>Liquidation Mechanism</h2>
      <p>
        Liquidation is the forced closure of a position when the trader&apos;s
        margin can no longer sustain the position. The process:
      </p>
      <ol>
        <li>
          The liquidation engine continuously monitors all open positions against
          the current mark price
        </li>
        <li>
          When a position breaches the maintenance margin threshold, a
          liquidation order is placed as a market order on the opposite side
        </li>
        <li>
          The position is closed at the best available market price
        </li>
        <li>
          Remaining margin (if any) is returned to the trader&apos;s wallet
        </li>
        <li>
          If the liquidation results in a shortfall (negative equity), the
          insurance fund absorbs the loss
        </li>
      </ol>

      <h3>Liquidation Price Calculation</h3>
      <pre>
        <code>{`// For long positions:
liquidationPrice = entryPrice * (1 - (initialMarginRate - maintenanceMarginRate))

// For short positions:
liquidationPrice = entryPrice * (1 + (initialMarginRate - maintenanceMarginRate))`}</code>
      </pre>

      <h2>Funding Rate</h2>
      <p>
        As perpetual contracts have no expiry date, a funding rate mechanism
        keeps the futures price anchored to the index price:
      </p>
      <ul>
        <li>
          When the futures price trades above the index, longs pay shorts
        </li>
        <li>
          When the futures price trades below the index, shorts pay longs
        </li>
        <li>Funding payments are exchanged every 8 hours</li>
      </ul>
      <pre>
        <code>{`fundingRate = clamp(
  (futuresMidPrice - indexPrice) / indexPrice,
  -0.01,  // max -1% per interval
  +0.01   // max +1% per interval
)

payment = positionNotional * fundingRate`}</code>
      </pre>
    </article>
  );
}
