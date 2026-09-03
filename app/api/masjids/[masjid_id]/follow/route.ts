/**
 * Route Handler — Followers System · Follow / Unfollow / Status
 *
 * FOL-01  POST   /api/masjids/:masjid_id/follow
 *   → Authenticated user follows the masjid.
 *     Returns 409 if already following.
 *
 * FOL-02  DELETE /api/masjids/:masjid_id/follow
 *   → Authenticated user unfollows the masjid.
 *     Returns 404 if not currently following.
 *
 * FOL-03  GET    /api/masjids/:masjid_id/follow/status
 *   → Returns the current follow status + live follower count for this user.
 *
 * Auth: Bearer JWT (all three verbs)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST, proxyDELETE } from "@/lib/proxyHelper";
import type {
  FollowMasjidResponse,
  UnfollowMasjidResponse,
  GetFollowStatusResponse,
} from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_FOLLOW: FollowMasjidResponse = {
  success: true,
  message: "You are now following this masjid.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    following: true,
    follower_count: 1284,
    followed_at: "2026-04-23T11:00:00Z",
  },
};

const MOCK_UNFOLLOW: UnfollowMasjidResponse = {
  success: true,
  message: "You have unfollowed this masjid.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    following: false,
    follower_count: 1283,
  },
};

const MOCK_FOLLOW_STATUS: GetFollowStatusResponse = {
  success: true,
  message: "Follow status retrieved successfully.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    following: true,
    follower_count: 1284,
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * FOL-01 — POST follow a masjid
 * No request body required — actor is derived from the Bearer JWT.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: masjid_id." },
        { status: 400 }
      );
    }

    return proxyPOST<FollowMasjidResponse>(
      req,
      `/masjids/${masjid_id}/follow`,
      MOCK_FOLLOW
    );
  } catch (error) {
    console.error("[FOL-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * FOL-02 — DELETE unfollow a masjid
 * No request body required.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: masjid_id." },
        { status: 400 }
      );
    }

    return proxyDELETE<UnfollowMasjidResponse>(
      req,
      `/masjids/${masjid_id}/follow`,
      MOCK_UNFOLLOW
    );
  } catch (error) {
    console.error("[FOL-02] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * FOL-03 — GET follow status
 * Returns whether the authenticated user is currently following this masjid.
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: masjid_id." },
        { status: 400 }
      );
    }

    return proxyGET<GetFollowStatusResponse>(
      req,
      `/masjids/${masjid_id}/follow/status`,
      MOCK_FOLLOW_STATUS
    );
  } catch (error) {
    console.error("[FOL-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}