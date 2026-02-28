/**
 * Etherscan explorer URL helper.
 *
 * Uses Sepolia explorer when ETH_NETWORK env var is "sepolia" (default for non-production),
 * and mainnet explorer when ETH_NETWORK is "mainnet" or NODE_ENV is "production".
 */

function getBaseUrl(): string {
  const network = process.env.ETH_NETWORK;
  if (network === "mainnet") return "https://etherscan.io";
  if (network === "sepolia") return "https://sepolia.etherscan.io";

  // Fallback: production → mainnet, otherwise → sepolia
  return process.env.NODE_ENV === "production"
    ? "https://etherscan.io"
    : "https://sepolia.etherscan.io";
}

export function txUrl(hash: string): string {
  return `${getBaseUrl()}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${getBaseUrl()}/address/${address}`;
}
