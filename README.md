# Open Mandi

An academic cryptocurrency-based commodities exchange for trading gold and silver futures with stablecoin settlement.

Built as a learning platform to explore exchange mechanics — order matching, margin trading, liquidation, funding rates, and price discovery — in a controlled, low-stakes environment.

## Features

- **Spot trading** — USDT/USDC exchange with a live order book
- **Futures trading** — Gold (XAU-PERP) and Silver (XAG-PERP) perpetual contracts with up to 50x leverage
- **Order matching engine** — price-time priority, partial fills, self-trade prevention
- **Margin system** — initial/maintenance margin, mark pricing, and automatic liquidation
- **Funding rates** — 8-hour intervals to keep futures prices anchored to spot
- **Wallet system** — USDT/USDC deposits and withdrawals with balance tracking
- **Liquidity provision** — one-click LP tool for placing two-sided limit orders
- **Transparency dashboard** — public exchange stats: volume, fees, order book depth, recent trades
- **Educational docs** — 17 pages covering commodities, futures, crypto trading, and technical architecture
- **Live price feed** — Gold and silver index prices from metals.dev API

## Tech Stack

| Layer      | Technology                                                |
| ---------- | --------------------------------------------------------- |
| Framework  | Next.js 16.1.1, React 19, TypeScript                      |
| Styling    | Tailwind CSS 4, @tailwindcss/typography                   |
| Auth       | Firebase Auth (Google sign-in) + httpOnly session cookies |
| Database   | Vercel Postgres (Neon serverless) + Drizzle ORM           |
| Validation | Zod                                                       |
| Deployment | Vercel                                                    |
| Price Data | metals.dev API (gold/silver)                              |

## Project Structure

```
app/
├── (marketing)/          # Landing page, features, how it works
├── (docs)/docs/          # 9 user guides + 8 technical docs
├── (exchange)/exchange/  # Protected trading platform
│   ├── dashboard/        # Portfolio overview
│   ├── exchange/         # Spot trading (USDT ↔ USDC)
│   ├── trade/gold/       # XAU-PERP futures
│   ├── trade/silver/     # XAG-PERP futures
│   ├── positions/        # Open positions
│   ├── wallet/           # Balance & transactions
│   ├── deposit/          # Deposit USDT/USDC
│   ├── withdraw/         # Withdraw funds
│   ├── transparency/     # Public exchange stats
│   └── settings/         # User settings
├── (auth)/               # Login, signup
├── (legal)/              # Terms of service
├── api/
│   ├── auth/             # login, logout, session
│   ├── wallet/           # deposit, withdraw
│   └── trading/          # order, cancel, orderbook, trades, orders,
│                         # positions, close, prices, funding, liquidate
└── components/           # 23 shared components

lib/
├── auth/session.ts       # Server-side session verification
├── db/
│   ├── index.ts          # Lazy DB connection (Neon Pool)
│   ├── schema.ts         # 7 Drizzle tables (users, wallets, transactions,
│   │                     #   orders, trades, positions, mm_order_stats)
│   └── queries/          # wallet.ts, trading.ts, transparency.ts
├── firebase/             # client.ts (lazy init), admin.ts (lazy init)
├── services/             # matching.ts, margin.ts, prices.ts, funding.ts
└── trading/              # constants.ts, types.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase](https://console.firebase.google.com/) project with Google sign-in enabled
- A [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) store (Neon)
- A [metals.dev](https://metals.dev) API key (free tier, optional — falls back to hardcoded prices)

### Setup

```bash
# Clone and install
git clone https://github.com/chandreshkkhatri/openmandi.git
cd openmandi
npm install

# Configure environment
cp .env.example .env.local
# Fill in your values (see Environment Variables below)

# Push database schema
npx drizzle-kit push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values. You can also run `vercel env pull .env.local` to pull from Vercel (then add `METALS_DEV_API_KEY` manually).

| Variable                           | Service                  | Required   |
| ---------------------------------- | ------------------------ | ---------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | Firebase Client          | Yes        |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Client          | Yes        |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | Firebase Client          | Yes        |
| `FIREBASE_PROJECT_ID`              | Firebase Admin           | Yes        |
| `FIREBASE_CLIENT_EMAIL`            | Firebase Admin           | Yes        |
| `FIREBASE_PRIVATE_KEY`             | Firebase Admin           | Yes        |
| `POSTGRES_URL`                     | Vercel Postgres (pooled) | Yes        |
| `POSTGRES_URL_NON_POOLING`         | Vercel Postgres (direct) | Yes        |
| `METALS_DEV_API_KEY`               | metals.dev               | No         |
| `BINANCE_API_KEY`                  | Binance Futures API      | For hedger |
| `BINANCE_API_SECRET`               | Binance Futures API      | For hedger |

## Market Maker & Hedger

Two standalone scripts provide liquidity and risk management. They run independently of the Next.js app — only a `POSTGRES_URL` (and Binance keys for hedging) are required.

### Market Maker

Places 5 levels of bid/ask orders per pair (Gold & Silver), mirroring Binance prices with configurable spreads. Orders auto-refresh every 5 seconds.

```bash
npx tsx scripts/market-maker.ts                # default tag "local"
npx tsx scripts/market-maker.ts --tag=aws-1    # multi-instance support
```

Each `--tag` creates a separate system user so multiple instances don't cancel each other's orders.

**Deploying with PM2:**

To run the Market Maker continuously in the background (e.g. on a VM), use PM2:

1. Install `tsx` globally so PM2 can execute TypeScript:
   ```bash
   npm install -g tsx
   ```
2. Start the script with PM2 and save it to auto-restart:

   ```bash
   # For Development
   npm install -g pm2
   pm2 start scripts/market-maker.ts --interpreter tsx --name "openmandi-mm-dev"
   pm2 save

   # For Production (Recommended: Compile first to save memory)
   npx tsc scripts/market-maker.ts
   pm2 start scripts/market-maker.js --name "openmandi-mm-prod"
   pm2 save
   ```

### Hedger

Monitors fills against the market maker and automatically places hedge orders on Binance Futures to stay delta-neutral.

```bash
npx tsx scripts/hedger.ts --dry-run            # test mode (no real orders)
npx tsx scripts/hedger.ts --testnet            # use Binance Futures testnet
npx tsx scripts/hedger.ts                      # production (real Binance orders)
```

**Getting started with testnet:**

1. Go to [testnet.binancefuture.com](https://testnet.binancefuture.com) and log in with GitHub
2. Copy your testnet API key and secret
3. Add to `.env.local`:
   ```
   BINANCE_API_KEY=your_testnet_key
   BINANCE_API_SECRET=your_testnet_secret
   ```
4. Run: `npx tsx scripts/hedger.ts --testnet`

For **production hedging**, use real Binance API keys from [Binance API Management](https://www.binance.com/en/my/settings/api-management) (enable Futures, disable Withdrawals) and omit the `--testnet` flag.

## Scripts

| Command                           | Description                      |
| --------------------------------- | -------------------------------- |
| `npm run dev`                     | Start development server         |
| `npm run build`                   | Production build                 |
| `npm run start`                   | Start production server          |
| `npm run lint`                    | Run ESLint                       |
| `npx drizzle-kit push`            | Push schema changes to database  |
| `npx drizzle-kit studio`          | Open Drizzle Studio (DB browser) |
| `npx tsx scripts/market-maker.ts` | Start market maker bot           |
| `npx tsx scripts/hedger.ts`       | Start Binance hedger             |

## Architecture

The app uses **Next.js route groups** to separate concerns — each group has its own layout: marketing (navbar + footer), docs (sidebar + header), exchange (app sidebar + navbar), auth (centered minimal), and legal (centered prose). The exchange layout verifies the user session server-side and redirects unauthenticated users to `/login`.

The **trading engine** runs synchronous order matching inside a database transaction. When an order is placed, it scans the opposite side of the book for price-compatible resting orders, executes fills at the resting order's price, and updates balances atomically. Futures use a mark price (70% index + 30% mid) for margin calculations, with a liquidation engine that force-closes positions below maintenance margin.

Firebase and database connections use a **lazy initialization pattern** — they return safe no-ops during build time when environment variables aren't set, preventing build failures on Vercel.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for sprint history and planned features.
