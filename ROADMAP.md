# Open Mandi Roadmap

An academic cryptocurrency-based commodities exchange for trading gold and silver futures with stablecoin settlement.

## Progress Summary

| Sprint | Status | Routes | Key Deliverables |
|--------|--------|--------|-----------------|
| 0 — Documentation + Placeholders | Done | 31 | Next.js scaffold, 5 route groups, 17 doc pages, dark theme |
| 1 — Auth & User Accounts | Done | 38 | Firebase Auth, sessions, users/wallets tables |
| 2 — Wallet, Deposits & Withdrawals | Done | 40 | USDT/USDC deposits, withdrawals, transactions |
| 3 — Trading Engine | Done | 47 | 3 order books, matching, futures, margin, liquidation |
| 4 — Transparency + Liquidity | Done | 47 | Transparency dashboard, one-click LP, zero maker fees |
| 5 — System Market Maker | Done | 47 | Automated baseline liquidity bot + Binance hedging |
| 6 — Production Infra + DB Hygiene | Done | 47 | Separate prod/dev DBs, MM order cleanup, drizzle prod config |

## Completed Sprints

### Sprint 0: Documentation + Placeholders
- Project scaffolding with Next.js 16, React 19, Tailwind CSS 4
- 5 route groups: (marketing), (docs), (exchange), (legal), (auth)
- 14 documentation pages + 7 technical docs
- Dark theme with gold (#F5A623) / silver (#C0C0C0) palette
- ComingSoon component for unbuilt features

### Sprint 1: Auth & User Accounts
- Firebase Auth integration (Google sign-in)
- PostgreSQL + Drizzle ORM for users/wallets tables
- httpOnly session cookies (5-day expiry)
- Protected exchange layout with session verification
- Build-safe lazy initialization for Firebase/DB

### Sprint 2: Wallet, Deposits & Withdrawals
- Deposit flow: USDT/USDC, max $20 per deposit, only when balance < $5
- Withdrawal flow: only when balance >= $10, $0.10 flat fee
- Transactions table with signed amounts and balance snapshots
- Server+client hybrid pattern for forms

### Sprint 3: Trading Engine
- 3 order books: USDT-USDC (spot), XAU-PERP (gold futures), XAG-PERP (silver futures)
- Synchronous order matching with price-time priority and partial fills
- Perpetual futures: up to 50x leverage, 2% initial margin, 1% maintenance margin
- Mark price: 70% index (metals.dev API) + 30% order book mid
- Funding rates: 8-hour intervals (00/08/16 UTC), clamped +/-1%
- Liquidation engine for under-margined positions
- Live gold/silver prices from metals.dev (30-min cache, 100 req/month free tier)

### Sprint 4: Transparency + Liquidity
- Transparency dashboard with public exchange statistics
- One-click liquidity provision ("Provide Liquidity" feature)
- Zero maker fees to incentivize limit order placement
- Increased deposit limits ($5 -> $20 max, $1 -> $5 threshold)
- Lowered spot minimum order size (0.01 -> 0.001)
- Project roadmap (this file)

### Infrastructure
- Vercel deployment with Vercel Postgres (Neon serverless)
- Separate Neon databases for dev and production
- `@neondatabase/serverless` driver with WebSocket connections
- 7 database tables with indexes for query performance
- Drizzle config for dev (`drizzle.config.ts`) and prod (`drizzle.config.prod.ts`)
- `db:push` / `db:push:prod` scripts for schema management

## Backlog / Future Sprints

### Sprint 5: System Market Maker (Done)

**Problem**: With few users in an academic setting, order books will be empty and no trades can happen. While Sprint 4's LP feature lets users manually provide liquidity, a system-level solution ensures baseline liquidity at all times.

**Solution**: Market Maker Bot & Hedger
- [x] Standalone Market Maker script (`scripts/market-maker.ts`)
- [x] Multi-level dense order books for Gold, Silver, and Stablecoins
- [x] Standalone Hedger script (`scripts/hedger.ts`) with Binance Futures integration
- [x] HMAC-SHA256 authenticated hedging with Testnet support
- [x] Multi-instance tagging system for portable deployment

### Sprint 6: Production Infra + DB Hygiene (Done)

**Problem**: Dev and production shared the same Neon database, and the market maker accumulated ~200K cancelled order rows that bloated the database.

**Solution**: Separate databases + automatic order cleanup
- [x] Separate Neon databases for dev and production environments
- [x] Production Drizzle config (`drizzle.config.prod.ts`) with `db:push:prod` / `db:studio:prod` scripts
- [x] New `mm_order_stats` table to retain aggregated metadata from deleted MM orders
- [x] Inline cleanup: cancelled MM orders with zero fills are hard-deleted after each rebalance cycle
- [x] Periodic bulk cleanup: every ~30 min, purge up to 5K stale cancelled orders
- [x] Startup cleanup: on bot restart, batch-delete all legacy cancelled orders
- [x] Debug endpoint enhanced with order ownership and MM user diagnostics

### Sprint 7+: Potential Features
- [ ] Real-time WebSocket price updates
- [ ] Trade notifications (email or in-app)
- [ ] Leaderboard / PnL rankings
- [ ] Portfolio analytics and charts
- [ ] Admin dashboard
- [ ] Mobile-responsive improvements
- [ ] API rate limiting
- [ ] Automated testing suite
