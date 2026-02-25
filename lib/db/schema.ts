import { pgTable, uuid, text, timestamp, decimal, integer, boolean, unique, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: text("firebase_uid").unique().notNull(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    currency: text("currency").notNull(), // 'USDC'
    balance: decimal("balance", { precision: 18, scale: 8 }).default("0").notNull(),
    availableBalance: decimal("available_balance", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("wallets_user_currency").on(table.userId, table.currency)]
);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  walletId: uuid("wallet_id")
    .references(() => wallets.id)
    .notNull(),
  type: text("type").notNull(), // deposit | withdrawal | withdrawal_fee
  currency: text("currency").notNull(), // USDC
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(), // positive=credit, negative=debit
  balanceAfter: decimal("balance_after", { precision: 18, scale: 8 }).notNull(),
  referenceId: uuid("reference_id"),
  referenceType: text("reference_type"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const depositClaims = pgTable(
  "deposit_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    currency: text("currency").notNull(), // USDC
    network: text("network").notNull(), // ETH
    txHash: text("tx_hash").notNull(),
    toAddress: text("to_address").notNull(),
    fromAddress: text("from_address"),
    amount: decimal("amount", { precision: 18, scale: 8 }),
    confirmations: integer("confirmations").default(0).notNull(),
    status: text("status").default("pending").notNull(), // pending | confirmed | rejected
    rejectionReason: text("rejection_reason"),
    confirmedAt: timestamp("confirmed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("deposit_claims_tx_hash_unique").on(table.txHash),
    index("deposit_claims_user_created").on(table.userId, table.createdAt),
    index("deposit_claims_status_created").on(table.status, table.createdAt),
  ]
);

export const withdrawalRequests = pgTable(
  "withdrawal_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    walletId: uuid("wallet_id")
      .references(() => wallets.id)
      .notNull(),
    currency: text("currency").notNull(), // USDC
    network: text("network").notNull(), // ETH
    destinationAddress: text("destination_address").notNull(),
    amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
    fee: decimal("fee", { precision: 18, scale: 8 }).notNull(),
    totalDebit: decimal("total_debit", { precision: 18, scale: 8 }).notNull(),
    status: text("status").default("pending").notNull(), // pending | processing | completed | rejected | cancelled
    payoutTxHash: text("payout_tx_hash"),
    processedAt: timestamp("processed_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("withdrawal_requests_user_created").on(table.userId, table.createdAt),
    index("withdrawal_requests_status_created").on(table.status, table.createdAt),
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    pair: text("pair").notNull(), // "XAU-PERP" | "XAG-PERP"
    side: text("side").notNull(), // "buy" | "sell"
    type: text("type").notNull(), // "limit" | "market"
    price: decimal("price", { precision: 18, scale: 8 }), // null for market orders
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    filledQuantity: decimal("filled_quantity", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
    status: text("status").default("open").notNull(), // "open" | "partial" | "filled" | "cancelled"
    collateralCurrency: text("collateral_currency"), // "USDC" — futures only
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("orders_pair_side_status_price").on(table.pair, table.side, table.status, table.price),
    index("orders_user_status").on(table.userId, table.status),
  ]
);

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pair: text("pair").notNull(),
    makerOrderId: uuid("maker_order_id")
      .references(() => orders.id)
      .notNull(),
    takerOrderId: uuid("taker_order_id")
      .references(() => orders.id)
      .notNull(),
    makerUserId: uuid("maker_user_id")
      .references(() => users.id)
      .notNull(),
    takerUserId: uuid("taker_user_id")
      .references(() => users.id)
      .notNull(),
    price: decimal("price", { precision: 18, scale: 8 }).notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    makerFee: decimal("maker_fee", { precision: 18, scale: 8 }).notNull(),
    takerFee: decimal("taker_fee", { precision: 18, scale: 8 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("trades_pair_created").on(table.pair, table.createdAt),
    index("trades_maker_user").on(table.makerUserId),
    index("trades_taker_user").on(table.takerUserId),
  ]
);

export const mmOrderStats = pgTable(
  "mm_order_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    pair: text("pair").notNull(),
    side: text("side").notNull(), // "buy" | "sell"
    cancelledCount: integer("cancelled_count").default(0).notNull(),
    cancelledQuantity: decimal("cancelled_quantity", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
    avgPrice: decimal("avg_price", { precision: 18, scale: 8 }),
    minPrice: decimal("min_price", { precision: 18, scale: 8 }),
    maxPrice: decimal("max_price", { precision: 18, scale: 8 }),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    deletedCount: integer("deleted_count").default(0).notNull(), // orders hard-deleted
    retainedCount: integer("retained_count").default(0).notNull(), // orders kept (had fills)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("mm_order_stats_user_pair").on(table.userId, table.pair),
  ]
);

// ---------------------------------------------------------------------------
// Internal Exchange Wallets
// ---------------------------------------------------------------------------

export const internalWallets = pgTable(
  "internal_wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: text("role").notNull(), // 'hot_wallet' | 'treasury' | 'fee_wallet' | 'reserve_wallet'
    currency: text("currency").notNull(), // 'USDC'
    network: text("network").notNull(), // 'ETH'
    address: text("address").notNull(),
    label: text("label"), // human-readable name
    ledgerBalance: decimal("ledger_balance", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
    lastOnChainBalance: decimal("last_on_chain_balance", { precision: 18, scale: 8 }),
    lastReconciledAt: timestamp("last_reconciled_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("internal_wallets_role_currency").on(table.role, table.currency),
    index("internal_wallets_role").on(table.role),
  ]
);

export const internalTransfers = pgTable(
  "internal_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromWalletId: uuid("from_wallet_id")
      .references(() => internalWallets.id)
      .notNull(),
    toWalletId: uuid("to_wallet_id")
      .references(() => internalWallets.id)
      .notNull(),
    currency: text("currency").notNull(),
    amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
    txHash: text("tx_hash"),
    status: text("status").default("pending").notNull(), // 'pending' | 'confirmed' | 'failed'
    note: text("note"),
    initiatedBy: text("initiated_by"), // admin email
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("internal_transfers_status").on(table.status),
    index("internal_transfers_from").on(table.fromWalletId),
    index("internal_transfers_to").on(table.toWalletId),
  ]
);

// ---------------------------------------------------------------------------
// Exchange Settings (key-value config for operational controls)
// ---------------------------------------------------------------------------

export const exchangeSettings = pgTable("exchange_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by"), // admin email
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

export const positions = pgTable(
  "positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    contract: text("contract").notNull(), // "XAU-PERP" | "XAG-PERP"
    side: text("side").notNull(), // "long" | "short"
    entryPrice: decimal("entry_price", { precision: 18, scale: 8 }).notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
    margin: decimal("margin", { precision: 18, scale: 8 }).notNull(),
    collateralCurrency: text("collateral_currency").notNull(), // "USDC"
    leverage: decimal("leverage", { precision: 5, scale: 2 }).notNull(),
    liquidationPrice: decimal("liquidation_price", { precision: 18, scale: 8 }).notNull(),
    realizedPnl: decimal("realized_pnl", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
    lastFundingAt: timestamp("last_funding_at"),
    status: text("status").default("open").notNull(), // "open" | "closed" | "liquidated"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("positions_user_status").on(table.userId, table.status),
    index("positions_contract_status").on(table.contract, table.status),
  ]
);
