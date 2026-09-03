import { NextResponse } from "next/server";

/**
 * POST /api/auth/reset-password
 * Proxies to the Go backend: sets the new password using the token.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, new_password, confirm_password } = body;

    if (!token || !new_password || !confirm_password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}auth/reset-password`;

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password, confirm_password }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: data.message || data.error?.detail || "Failed to reset password" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Reset Password Proxy Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
