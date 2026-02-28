import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/lib/db";
import { users, wallets } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { deriveDepositAddress, getDepositMnemonic } from "@/lib/services/deposit-addresses";

const loginSchema = z.object({
  idToken: z.string().min(1),
});

const SESSION_EXPIRY = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth) {
      return NextResponse.json(
        { success: false, error: "Auth not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { idToken } = loginSchema.parse(body);

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Create a session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY,
    });

    // Upsert user in PostgreSQL
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    let user = existingUser;

    if (!user) {
      // Ensure email is present from Firebase token
      if (!decoded.email) {
        return NextResponse.json(
          { success: false, error: "Google account has no email address" },
          { status: 400 }
        );
      }

      // Check if user exists by email (if they changed Firebase project and got a new UID)
      const [existingUserByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, decoded.email))
        .limit(1);

      if (existingUserByEmail) {
        // Link the new Firebase UID to their existing account
        const [updatedUser] = await db
          .update(users)
          .set({ firebaseUid: decoded.uid })
          .where(eq(users.id, existingUserByEmail.id))
          .returning();

        user = updatedUser;
      } else {
        // New user — create user record + wallets + deposit address
        const mnemonic = getDepositMnemonic();

        // Atomically assign next deposit index
        const [{ nextIndex }] = await db
          .select({
            nextIndex: sql<number>`COALESCE(MAX(${users.depositIndex}), -1) + 1`,
          })
          .from(users);

        const depositAddress = deriveDepositAddress(mnemonic, nextIndex);

        const [newUser] = await db
          .insert(users)
          .values({
            firebaseUid: decoded.uid,
            email: decoded.email,
            depositIndex: nextIndex,
            depositAddress: depositAddress.toLowerCase(),
          })
          .returning();

        user = newUser;

        await db.insert(wallets).values({ userId: user.id, currency: "USDC" });
      }
    }

    // Backfill deposit address for existing users who don't have one yet
    if (user && !user.depositAddress) {
      try {
        const mnemonic = getDepositMnemonic();
        const [{ nextIndex }] = await db
          .select({
            nextIndex: sql<number>`COALESCE(MAX(${users.depositIndex}), -1) + 1`,
          })
          .from(users);

        const depositAddress = deriveDepositAddress(mnemonic, nextIndex);

        const [updatedUser] = await db
          .update(users)
          .set({
            depositIndex: nextIndex,
            depositAddress: depositAddress.toLowerCase(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();

        user = updatedUser;
      } catch (e) {
        // Non-fatal: user can still log in, deposit address assigned next time
        console.error("Failed to backfill deposit address:", e);
      }
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
    });

    response.cookies.set("__session", sessionCookie, {
      maxAge: SESSION_EXPIRY / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 401 }
    );
  }
}
