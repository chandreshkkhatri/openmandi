/**
 * HD Wallet Deposit Address Derivation
 *
 * Each user gets a unique Ethereum address derived from a master mnemonic
 * using BIP-44 path: m/44'/60'/0'/0/{depositIndex}
 *
 * The exchange controls ALL derived private keys, allowing it to:
 * 1. Monitor each address for incoming USDC transfers
 * 2. Sweep funds from user addresses to the hot wallet
 *
 * Env: DEPOSIT_HD_MNEMONIC — the master 12/24-word mnemonic (keep secret!)
 */

import { HDNodeWallet, Mnemonic } from "ethers";

const BASE_PATH = "m/44'/60'/0'/0";

/**
 * Derive a deposit address for a given user index.
 * Same mnemonic + same index = same address, deterministically.
 */
export function deriveDepositAddress(mnemonic: string, index: number): string {
  const mn = Mnemonic.fromPhrase(mnemonic);
  const parent = HDNodeWallet.fromMnemonic(mn, BASE_PATH);
  const child = parent.deriveChild(index);
  return child.address;
}

/**
 * Derive the private key for a given user index (needed for sweeping).
 */
export function deriveDepositPrivateKey(mnemonic: string, index: number): string {
  const mn = Mnemonic.fromPhrase(mnemonic);
  const parent = HDNodeWallet.fromMnemonic(mn, BASE_PATH);
  const child = parent.deriveChild(index);
  return child.privateKey;
}

/**
 * Get the mnemonic from env, throwing if not configured.
 */
export function getDepositMnemonic(): string {
  const mnemonic = process.env.DEPOSIT_HD_MNEMONIC;
  if (!mnemonic) {
    throw new Error(
      "DEPOSIT_HD_MNEMONIC is not configured. " +
      "Generate one with: node scripts/generate-mnemonic.js"
    );
  }
  return mnemonic;
}
