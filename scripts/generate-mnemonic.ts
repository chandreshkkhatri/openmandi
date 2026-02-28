/**
 * Generate a BIP-39 mnemonic for HD wallet deposit address derivation.
 *
 * Usage:
 *   npx tsx scripts/generate-mnemonic.ts
 *
 * Output: A 12-word mnemonic and the first 5 derived Ethereum addresses.
 * Store the mnemonic securely as DEPOSIT_HD_MNEMONIC env var.
 *
 * ⚠️  NEVER commit the mnemonic to version control!
 */

import { Mnemonic, HDNodeWallet } from "ethers";

const mnemonic = Mnemonic.fromEntropy(
  // 16 bytes = 128 bits = 12-word mnemonic
  require("crypto").randomBytes(16)
);

console.log("═══════════════════════════════════════════════════════════");
console.log("  HD WALLET MNEMONIC (store securely!)");
console.log("═══════════════════════════════════════════════════════════");
console.log();
console.log(`  ${mnemonic.phrase}`);
console.log();
console.log("═══════════════════════════════════════════════════════════");
console.log("  First 5 derived deposit addresses (m/44'/60'/0'/0/N):");
console.log("═══════════════════════════════════════════════════════════");

const parent = HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0");

for (let i = 0; i < 5; i++) {
  const child = parent.deriveChild(i);
  console.log(`  [${i}]  ${child.address}`);
}

console.log();
console.log("Add to your .env / Vercel environment variables:");
console.log(`  DEPOSIT_HD_MNEMONIC="${mnemonic.phrase}"`);
console.log();
