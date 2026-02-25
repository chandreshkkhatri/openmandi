import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

type AdminSession = { id: string; email: string };

/**
 * Verify the current request is from an authenticated admin.
 * Returns the session on success, or a NextResponse 401/403 on failure.
 */
export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  return { id: user.id, email: user.email };
}

export function isErrorResponse(
  result: AdminSession | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
