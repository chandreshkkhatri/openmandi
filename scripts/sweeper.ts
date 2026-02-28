/**
 * Sweeper Script — consolidate USDC from per-user deposit addresses to hot wallet.
 *
 * How it works:
 * 1. Query all user deposit addresses from the DB
 * 2. For each address, check USDC balance via eth_call
 * 3. If balance > threshold:
 *    a. Send ETH dust for gas (from hot wallet)
 *    b. Sign a USDC transfer from the user address to the hot wallet
 * 4. Log results
 *
 * Usage:
 *   OPENMANDI_DATABASE_URL="..." ETH_RPC_URL="..." npx tsx scripts/sweeper.ts
 *
 * Phase 2: Not yet implemented. This is a skeleton for reference.
 */

import { HDNodeWallet, Mnemonic, JsonRpcProvider, Wallet, Contract } from "ethers";

// Minimal ERC-20 ABI for balanceOf + transfer
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

async function main() {
  const mnemonic = process.env.DEPOSIT_HD_MNEMONIC;
  const rpcUrl = process.env.ETH_RPC_URL;
  const hotWallet = process.env.EXCHANGE_DEPOSIT_ADDRESS_USDC;
  const usdcContract = process.env.ETH_USDC_CONTRACT ?? "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  const minSweepAmount = BigInt(process.env.MIN_SWEEP_USDC ?? "1") * 1_000_000n; // 1 USDC default

  if (!mnemonic || !rpcUrl || !hotWallet) {
    console.error("Missing required env vars: DEPOSIT_HD_MNEMONIC, ETH_RPC_URL, EXCHANGE_DEPOSIT_ADDRESS_USDC");
    process.exit(1);
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const usdc = new Contract(usdcContract, ERC20_ABI, provider);
  const mn = Mnemonic.fromPhrase(mnemonic);
  const parent = HDNodeWallet.fromMnemonic(mn, "m/44'/60'/0'/0");

  // TODO: Query distinct deposit indices from DB instead of hardcoded range
  const maxIndex = 100;

  console.log(`Sweeping USDC from ${maxIndex} addresses to hot wallet: ${hotWallet}`);
  console.log(`Minimum sweep amount: ${Number(minSweepAmount) / 1e6} USDC`);
  console.log();

  let totalSwept = 0n;
  let addressesSwept = 0;

  for (let i = 0; i < maxIndex; i++) {
    const child = parent.deriveChild(i);
    const balance: bigint = await usdc.balanceOf(child.address);

    if (balance < minSweepAmount) continue;

    console.log(`[${i}] ${child.address} — Balance: ${Number(balance) / 1e6} USDC`);

    // Check if user address has ETH for gas
    const ethBalance = await provider.getBalance(child.address);
    if (ethBalance < 50_000n * 10_000_000_000n) { // ~50k gas * 10 gwei
      console.log(`  → Needs gas. Sending ETH dust...`);
      // TODO: Send ETH from hot wallet to child.address
      // const hotWalletSigner = new Wallet(HOT_WALLET_KEY, provider);
      // await hotWalletSigner.sendTransaction({ to: child.address, value: ethers.parseEther("0.001") });
      console.log(`  → [SKIP] Gas funding not implemented yet.`);
      continue;
    }

    // Sign USDC transfer from user address
    const signer = new Wallet(child.privateKey, provider);
    const usdcWithSigner = new Contract(usdcContract, ERC20_ABI, signer);

    try {
      const tx = await usdcWithSigner.transfer(hotWallet, balance);
      console.log(`  → Swept ${Number(balance) / 1e6} USDC — tx: ${tx.hash}`);
      await tx.wait();
      totalSwept += balance;
      addressesSwept++;
    } catch (err) {
      console.error(`  → Failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log();
  console.log(`Done. Swept ${Number(totalSwept) / 1e6} USDC from ${addressesSwept} addresses.`);
}

main().catch(console.error);
