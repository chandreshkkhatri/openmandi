const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type RpcLog = {
  address: string;
  topics: string[];
  data: string;
};

type RpcReceipt = {
  status?: string;
  blockNumber?: string;
  logs: RpcLog[];
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function topicToAddress(topic: string): string {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

function pow10(exp: number): bigint {
  return BigInt(10) ** BigInt(exp);
}

export function parseTokenAmount(amount: string, tokenDecimals: number): bigint {
  const [wholePartRaw, fractionPartRaw = ""] = amount.split(".");
  const wholePart = wholePartRaw || "0";
  const normalizedFraction = (fractionPartRaw + "0".repeat(tokenDecimals)).slice(
    0,
    tokenDecimals
  );

  const whole = BigInt(wholePart) * pow10(tokenDecimals);
  const fraction = normalizedFraction ? BigInt(normalizedFraction) : BigInt(0);
  return whole + fraction;
}

export function formatTokenAmount(
  rawAmount: bigint,
  tokenDecimals: number,
  outputScale: number = 8
): string {
  const base = pow10(tokenDecimals);
  const whole = rawAmount / base;
  const fraction = rawAmount % base;

  const fractionStr = fraction.toString().padStart(tokenDecimals, "0");
  const outFraction =
    tokenDecimals >= outputScale
      ? fractionStr.slice(0, outputScale)
      : `${fractionStr}${"0".repeat(outputScale - tokenDecimals)}`;

  return `${whole.toString()}.${outFraction}`;
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status ${response.status}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || "RPC error");
  }

  return json.result as T;
}

export type TxConfirmationResult =
  | { status: "pending"; confirmations: number }
  | { status: "confirmed"; confirmations: number }
  | { status: "failed"; confirmations: number };

export async function getTxConfirmationStatus(params: {
  txHash: string;
  rpcUrl: string;
  minConfirmations: number;
}): Promise<TxConfirmationResult> {
  const receipt = await rpcCall<RpcReceipt | null>(
    params.rpcUrl,
    "eth_getTransactionReceipt",
    [params.txHash]
  );

  if (!receipt) {
    return { status: "pending", confirmations: 0 };
  }

  if (receipt.status !== "0x1") {
    return { status: "failed", confirmations: 0 };
  }

  const receiptBlock = receipt.blockNumber ? Number(hexToBigInt(receipt.blockNumber)) : 0;
  const latestBlockHex = await rpcCall<string>(params.rpcUrl, "eth_blockNumber", []);
  const latestBlock = Number(hexToBigInt(latestBlockHex));
  const confirmations = receiptBlock > 0 ? Math.max(0, latestBlock - receiptBlock + 1) : 0;

  if (confirmations < params.minConfirmations) {
    return { status: "pending", confirmations };
  }

  return { status: "confirmed", confirmations };
}

export type DepositVerificationResult =
  | {
      status: "pending";
      confirmations: number;
      reason?: string;
    }
  | {
      status: "confirmed";
      confirmations: number;
      fromAddress: string;
      toAddress: string;
      amountRaw: bigint;
      amountFormatted: string;
    }
  | {
      status: "rejected";
      confirmations: number;
      reason: string;
    };

export async function verifyErc20Deposit(params: {
  txHash: string;
  tokenContract: string;
  expectedToAddress: string;
  tokenDecimals: number;
  minConfirmations: number;
  rpcUrl: string;
}): Promise<DepositVerificationResult> {
  const receipt = await rpcCall<RpcReceipt | null>(
    params.rpcUrl,
    "eth_getTransactionReceipt",
    [params.txHash]
  );

  if (!receipt) {
    return { status: "pending", confirmations: 0, reason: "Transaction not yet mined" };
  }

  if (receipt.status !== "0x1") {
    return { status: "rejected", confirmations: 0, reason: "Transaction failed on-chain" };
  }

  const receiptBlock = receipt.blockNumber ? Number(hexToBigInt(receipt.blockNumber)) : 0;
  const latestBlockHex = await rpcCall<string>(params.rpcUrl, "eth_blockNumber", []);
  const latestBlock = Number(hexToBigInt(latestBlockHex));
  const confirmations = receiptBlock > 0 ? Math.max(0, latestBlock - receiptBlock + 1) : 0;

  const expectedToken = normalizeAddress(params.tokenContract);
  const expectedTo = normalizeAddress(params.expectedToAddress);

  let totalAmount = BigInt(0);
  let sender = "";

  for (const log of receipt.logs) {
    if (!log.address || normalizeAddress(log.address) !== expectedToken) continue;
    if (!log.topics || log.topics.length < 3) continue;
    if (!log.topics[0].toLowerCase().startsWith(TRANSFER_TOPIC)) continue;

    const from = topicToAddress(log.topics[1]);
    const to = topicToAddress(log.topics[2]);
    if (to !== expectedTo) continue;

    const amount = hexToBigInt(log.data);
    if (amount <= BigInt(0)) continue;

    totalAmount += amount;
    if (!sender) sender = from;
  }

  if (totalAmount <= BigInt(0)) {
    return {
      status: "rejected",
      confirmations,
      reason: "No matching token transfer to exchange deposit address",
    };
  }

  if (confirmations < params.minConfirmations) {
    return { status: "pending", confirmations };
  }

  return {
    status: "confirmed",
    confirmations,
    fromAddress: sender,
    toAddress: expectedTo,
    amountRaw: totalAmount,
    amountFormatted: formatTokenAmount(totalAmount, params.tokenDecimals, 8),
  };
}

export type Erc20TransferCheckResult =
  | { status: "pending"; confirmations: number }
  | { status: "failed"; confirmations: number; reason: string }
  | {
      status: "confirmed";
      confirmations: number;
      amountRaw: bigint;
      amountFormatted: string;
      fromAddress: string;
      toAddress: string;
    };

export async function verifyErc20TransferInTx(params: {
  txHash: string;
  rpcUrl: string;
  minConfirmations: number;
  tokenContract: string;
  expectedToAddress: string;
  minAmountRaw?: bigint;
  tokenDecimals: number;
}): Promise<Erc20TransferCheckResult> {
  const receipt = await rpcCall<RpcReceipt | null>(
    params.rpcUrl,
    "eth_getTransactionReceipt",
    [params.txHash]
  );

  if (!receipt) {
    return { status: "pending", confirmations: 0 };
  }

  if (receipt.status !== "0x1") {
    return {
      status: "failed",
      confirmations: 0,
      reason: "Payout transaction failed on-chain",
    };
  }

  const receiptBlock = receipt.blockNumber ? Number(hexToBigInt(receipt.blockNumber)) : 0;
  const latestBlockHex = await rpcCall<string>(params.rpcUrl, "eth_blockNumber", []);
  const latestBlock = Number(hexToBigInt(latestBlockHex));
  const confirmations = receiptBlock > 0 ? Math.max(0, latestBlock - receiptBlock + 1) : 0;

  const expectedToken = normalizeAddress(params.tokenContract);
  const expectedTo = normalizeAddress(params.expectedToAddress);

  let totalAmount = BigInt(0);
  let sender = "";

  for (const log of receipt.logs) {
    if (!log.address || normalizeAddress(log.address) !== expectedToken) continue;
    if (!log.topics || log.topics.length < 3) continue;
    if (!log.topics[0].toLowerCase().startsWith(TRANSFER_TOPIC)) continue;

    const from = topicToAddress(log.topics[1]);
    const to = topicToAddress(log.topics[2]);
    if (to !== expectedTo) continue;

    const amount = hexToBigInt(log.data);
    if (amount <= BigInt(0)) continue;

    totalAmount += amount;
    if (!sender) sender = from;
  }

  if (totalAmount <= BigInt(0)) {
    return {
      status: "failed",
      confirmations,
      reason: "No matching ERC20 transfer to destination in payout transaction",
    };
  }

  if (params.minAmountRaw && totalAmount < params.minAmountRaw) {
    return {
      status: "failed",
      confirmations,
      reason: "On-chain payout amount is below requested amount",
    };
  }

  if (confirmations < params.minConfirmations) {
    return { status: "pending", confirmations };
  }

  return {
    status: "confirmed",
    confirmations,
    amountRaw: totalAmount,
    amountFormatted: formatTokenAmount(totalAmount, params.tokenDecimals, 8),
    fromAddress: sender,
    toAddress: expectedTo,
  };
}

/**
 * Send an ERC-20 transfer directly from a hot wallet using ethers.js.
 * Requires HOT_WALLET_PRIVATE_KEY env var.
 */
export async function sendErc20Transfer(params: {
  rpcUrl: string;
  privateKey: string;
  tokenContract: string;
  toAddress: string;
  amountRaw: bigint;
}): Promise<{ txHash: string }> {
  const { ethers } = await import("ethers");

  const provider = new ethers.JsonRpcProvider(params.rpcUrl);
  const wallet = new ethers.Wallet(params.privateKey, provider);

  const erc20Abi = ["function transfer(address to, uint256 amount) returns (bool)"];
  const contract = new ethers.Contract(params.tokenContract, erc20Abi, wallet);

  const tx = await contract.transfer(params.toAddress, params.amountRaw);
  const receipt = await tx.wait(1); // wait for 1 confirmation

  const txHash = (receipt?.hash ?? tx.hash).toLowerCase();
  return { txHash };
}

export async function broadcastWithdrawalViaWebhook(params: {
  endpoint: string;
  authToken?: string;
  body: {
    requestId: string;
    currency: string;
    network: string;
    destinationAddress: string;
    amount: string;
  };
}): Promise<{ txHash: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (params.authToken) {
    headers.Authorization = `Bearer ${params.authToken}`;
  }

  const response = await fetch(params.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(params.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Withdrawal broadcaster error (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { txHash?: string };
  const txHash = json.txHash?.toLowerCase();

  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new Error("Withdrawal broadcaster returned invalid txHash");
  }

  return { txHash };
}
