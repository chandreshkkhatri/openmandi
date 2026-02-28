import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { depositClaims } from "@/lib/db/schema";

const claimSchema = z.object({
  currency: z.literal("USDC"),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format"),
});

const CURRENCY_NETWORK = {
  USDC: "ETH",
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

    // Each user now has their own unique deposit address
    if (!user.depositAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Your deposit address has not been assigned yet. Please log out and log back in.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { currency, txHash } = claimSchema.parse(body);

    const [created] = await db
      .insert(depositClaims)
      .values({
        userId: user.id,
        currency,
        network: CURRENCY_NETWORK[currency],
        txHash: txHash.toLowerCase(),
        toAddress: user.depositAddress.toLowerCase(),
        status: "pending",
      })
      .onConflictDoNothing({ target: depositClaims.txHash })
      .returning();

    if (!created) {
      return NextResponse.json(
        {
          success: false,
          error: "This transaction hash is already claimed or processed.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      claim: {
        id: created.id,
        currency: created.currency,
        network: created.network,
        txHash: created.txHash,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deposit claim failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
