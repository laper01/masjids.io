/**
 * Route Handler — Authenticated User Profile
 *
 * PR-01  GET  /api/profile
 *   → Returns the profile of the signed-in user.
 *     Upstream: GET /api/v2/users/me
 *     Auth: Bearer JWT forwarded via proxyHelper
 *
 * PR-02  PATCH /api/profile
 *   → Updates the profile of the signed-in user.
 *     Upstream: PATCH /api/v2/users/{id}
 *     Auth: Bearer JWT forwarded via proxyHelper
 *
 * File location: app/api/profile/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { proxyGET } from "@/lib/proxyHelper";
import type { UserProfileResponse } from "@/types/profile";

// Force dynamic — never statically cached
export const dynamic = "force-dynamic";

// ─── Mock Data (used when USE_MOCK_API=true) ──────────────────────────────────

const MOCK_PROFILE: UserProfileResponse = {
  success: true,
  message: "Profile retrieved successfully",
  data: {
    id: "mock-user-id-001",
    email: "user@example.com",
    username: "mockuser",
    first_name: "Mock",
    last_name: "User",
    gender: "MALE",
    phone_number: {
      country_code: "62",
      number: "81234567890",
    },
    profile_picture_url: null,
    is_verified: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

// ─── GET /api/profile ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // proxyHelper's buildForwardHeaders() automatically copies the
  // Authorization header from the browser request to the upstream call.
  return proxyGET<UserProfileResponse>(req, "/users/me", MOCK_PROFILE);
}

// ─── PATCH /api/profile ───────────────────────────────────────────────────────

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify session
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Extract user ID and token from session
    const userId = (session as any)?.user?.id;
    const bearerToken = (session as any)?.accessToken;

    if (!userId || !bearerToken) {
      console.error("[PR-02] Auth Error: User ID or token missing from session.");
      return NextResponse.json(
        { success: false, error: "Session invalid. Please re-login." },
        { status: 401 }
      );
    }

    // 3. Read update payload from frontend
    // Expects snake_case fields: first_name, last_name, gender, phone_number, etc.
    const body = await req.json();

    // 4. Build upstream URL
    const api_url = `${process.env.NEXT_PUBLIC_API_URL}users/${userId}`;

    console.log("[PR-02] PATCH →", api_url, JSON.stringify(body, null, 2));

    // 5. Forward to backend
    const apiResponse = await fetch(api_url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(body),
    });

    // 6. Handle upstream error
    if (!apiResponse.ok) {
      let errorResult: unknown;
      try {
        errorResult = await apiResponse.json();
      } catch {
        errorResult = await apiResponse.text();
      }

      console.error("[PR-02] Backend error:", errorResult);

      return NextResponse.json(
        { success: false, error: "Failed to update profile.", details: errorResult },
        { status: apiResponse.status }
      );
    }

    // 7. Parse and return success response
    // Backend may return JSON or an empty 204 body — handle both.
    const responseText = await apiResponse.text();
    let result: unknown;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { success: true, message: responseText || "Update successful" };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[PR-02] Internal error:", error);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}