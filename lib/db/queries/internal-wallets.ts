import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { internalWallets, internalTransfers } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Internal Wallet CRUD
// ---------------------------------------------------------------------------

export async function getInternalWallets() {
  return db
    .select()
    .from(internalWallets)
    .where(eq(internalWallets.isActive, true))
    .orderBy(internalWallets.role);
}

export async function getInternalWalletByRole(role: string, currency = "USDC") {
  const [wallet] = await db
    .select()
    .from(internalWallets)
    .where(
      and(
        eq(internalWallets.role, role),
        eq(internalWallets.currency, currency),
        eq(internalWallets.isActive, true)
      )
    )
    .limit(1);
  return wallet ?? null;
}

export async function upsertInternalWallet(params: {
  role: string;
  currency: string;
  network: string;
  address: string;
  label?: string;
}) {
  const existing = await getInternalWalletByRole(params.role, params.currency);
  if (existing) {
    const [updated] = await db
      .update(internalWallets)
      .set({
        address: params.address.toLowerCase(),
        network: params.network,
        label: params.label ?? existing.label,
        updatedAt: new Date(),
      })
      .where(eq(internalWallets.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(internalWallets)
    .values({
      role: params.role,
      currency: params.currency,
      network: params.network,
      address: params.address.toLowerCase(),
      label: params.label ?? params.role,
    })
    .returning();
  return created;
}

// ---------------------------------------------------------------------------
// Ledger Balance Updates
// ---------------------------------------------------------------------------

export async function adjustLedgerBalance(walletId: string, delta: string) {
  const [updated] = await db
    .update(internalWallets)
    .set({
      ledgerBalance: sql`${internalWallets.ledgerBalance} + ${delta}::decimal`,
      updatedAt: new Date(),
    })
    .where(eq(internalWallets.id, walletId))
    .returning();
  return updated;
}

export async function setOnChainBalance(walletId: string, balance: string) {
  const [updated] = await db
    .update(internalWallets)
    .set({
      lastOnChainBalance: balance,
      lastReconciledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(internalWallets.id, walletId))
    .returning();
  return updated;
}

// ---------------------------------------------------------------------------
// Internal Transfers
// ---------------------------------------------------------------------------

export async function createInternalTransfer(params: {
  fromWalletId: string;
  toWalletId: string;
  currency: string;
  amount: string;
  txHash?: string;
  note?: string;
  initiatedBy?: string;
}) {
  return db.transaction(async (tx) => {
    // Lock and verify source balance
    const [source] = await tx
      .select()
      .from(internalWallets)
      .where(eq(internalWallets.id, params.fromWalletId))
      .for("update");

    if (!source) throw new Error("Source wallet not found");
    const sourceBalance = parseFloat(source.ledgerBalance);
    const transferAmount = parseFloat(params.amount);
    if (transferAmount > sourceBalance) {
      throw new Error(
        `Insufficient balance in ${source.role}: $${sourceBalance.toFixed(2)} available, $${transferAmount.toFixed(2)} requested`
      );
    }

    // Debit source ledger
    await tx
      .update(internalWallets)
      .set({
        ledgerBalance: sql`${internalWallets.ledgerBalance} - ${params.amount}::decimal`,
        updatedAt: new Date(),
      })
      .where(eq(internalWallets.id, params.fromWalletId));

    // Credit destination ledger
    await tx
      .update(internalWallets)
      .set({
        ledgerBalance: sql`${internalWallets.ledgerBalance} + ${params.amount}::decimal`,
        updatedAt: new Date(),
      })
      .where(eq(internalWallets.id, params.toWalletId));

    const [transfer] = await tx
      .insert(internalTransfers)
      .values({
        fromWalletId: params.fromWalletId,
        toWalletId: params.toWalletId,
        currency: params.currency,
        amount: params.amount,
        txHash: params.txHash,
        status: params.txHash ? "confirmed" : "pending",
        note: params.note,
        initiatedBy: params.initiatedBy,
      })
      .returning();

    return transfer;
  });
}

export async function getRecentInternalTransfers(limit = 50) {
  return db
    .select()
    .from(internalTransfers)
    .orderBy(desc(internalTransfers.createdAt))
    .limit(limit);
}
