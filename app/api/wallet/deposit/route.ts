import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

const depositSchema = z.object({
  currency: z.literal("USDC"),
});

const CURRENCY_CONFIG = {
  USDC: {
    network: "ETH",
    contractAddress:
      process.env.ETH_USDC_CONTRACT ?? "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    depositAddress: process.env.EXCHANGE_DEPOSIT_ADDRESS_USDC,
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currency } = depositSchema.parse(body);
    const config = CURRENCY_CONFIG[currency];

    if (!config.depositAddress) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Deposit address is not configured for ${currency}. Set EXCHANGE_DEPOSIT_ADDRESS_${currency}.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      deposit: {
        currency,
        network: config.network,
        tokenContract: config.contractAddress,
        address: config.depositAddress,
        minConfirmations: Number(process.env.DEPOSIT_MIN_CONFIRMATIONS ?? "3"),
        note:
          "Send only this token on this network. Funds are credited after on-chain confirmation and claim verification.",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deposit setup failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
