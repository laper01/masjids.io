import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Invalidates the server-side token on the Go backend, then
 * returns 200 so NextAuth can clear the local session cookie.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    // No active session — treat as already logged out
    if (!session?.accessToken) {
      return NextResponse.json({ message: "Already logged out" }, { status: 200 });
    }

    // Notify the Go backend to blacklist the token
    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}auth/logout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!backendResponse.ok) {
      // Log but don't block — we still clear the local cookie below
      console.error("Backend logout failed:", await backendResponse.text());
    }

    return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
  } catch (error) {
    console.error("Logout Proxy Error:", error);
    return NextResponse.json(
      { error: "Internal server error during logout" },
      { status: 500 }
    );
  }
}
