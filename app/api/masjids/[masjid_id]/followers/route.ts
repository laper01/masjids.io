/**
 * Route Handler — Followers System · Followers List
 *
 * FOL-04  GET /api/masjids/:masjid_id/followers
 *   → Paginated list of all users following this masjid.
 *     Supports optional search by follower name.
 *     Public endpoint — no auth required to view follower count;
 *     follower identity list requires auth (members:view).
 *
 * Query Params:
 *   page     number  — default 1
 *   limit    number  — default 10, max 50
 *   search   string  — partial match on follower name
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetFollowersResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_FOLLOWERS: GetFollowersResponse = {
  success: true,
  message: "Followers retrieved successfully.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    follower_count: 1284,
    followers: [
      {
        user_id: "usr-uuid-zubair-0001",
        name: "Zubair Malik",
        avatar_url: "https://avatars.masjids.io/usr-uuid-zubair-0001.jpg",
        followed_at: "2026-04-23T11:00:00Z",
      },
      {
        user_id: "usr-uuid-fatima-0002",
        name: "Fatimah Zahra",
        avatar_url: "https://avatars.masjids.io/usr-uuid-fatima-0002.jpg",
        followed_at: "2026-04-22T09:30:00Z",
      },
      {
        user_id: "usr-uuid-bilal-0003",
        name: "Bilal Hassan",
        avatar_url: "https://avatars.masjids.io/usr-uuid-bilal-0003.jpg",
        followed_at: "2026-04-21T14:15:00Z",
      },
      {
        user_id: "usr-uuid-aisha-0004",
        name: "Aisha Rahman",
        avatar_url: "https://avatars.masjids.io/usr-uuid-aisha-0004.jpg",
        followed_at: "2026-04-20T08:00:00Z",
      },
      {
        user_id: "usr-uuid-yusuf-0005",
        name: "Yusuf Al-Qardawi",
        avatar_url: "https://avatars.masjids.io/usr-uuid-yusuf-0005.jpg",
        followed_at: "2026-04-19T16:45:00Z",
      },
      {
        user_id: "usr-uuid-khadijah-0006",
        name: "Khadijah Usman",
        avatar_url: "https://avatars.masjids.io/usr-uuid-khadijah-0006.jpg",
        followed_at: "2026-04-18T11:20:00Z",
      },
      {
        user_id: "usr-uuid-umar-0007",
        name: "Umar Farooq",
        avatar_url: "https://avatars.masjids.io/usr-uuid-umar-0007.jpg",
        followed_at: "2026-04-17T07:55:00Z",
      },
      {
        user_id: "usr-uuid-maryam-0008",
        name: "Maryam Idris",
        avatar_url: "https://avatars.masjids.io/usr-uuid-maryam-0008.jpg",
        followed_at: "2026-04-16T13:10:00Z",
      },
      {
        user_id: "usr-uuid-ibrahim-0009",
        name: "Ibrahim Al-Amin",
        avatar_url: "https://avatars.masjids.io/usr-uuid-ibrahim-0009.jpg",
        followed_at: "2026-04-15T10:30:00Z",
      },
      {
        user_id: "usr-uuid-safiya-0010",
        name: "Safiyah Ndiaye",
        avatar_url: "https://avatars.masjids.io/usr-uuid-safiya-0010.jpg",
        followed_at: "2026-04-14T09:00:00Z",
      },
    ],
  },
  metadata: {
    total_data: 1284,
    total_page: 129,
    page: 1,
    limit: 10,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * FOL-04 — GET paginated followers list
 * Query params: page, limit (max 50), search
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

    // Validate pagination params
    const { searchParams } = new URL(req.url);

    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    if (pageRaw !== null) {
      const page = Number(pageRaw);
      if (!Number.isInteger(page) || page < 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { page: ["page must be a positive integer."] },
          },
          { status: 422 }
        );
      }
    }

    if (limitRaw !== null) {
      const limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { limit: ["limit must be an integer between 1 and 50."] },
          },
          { status: 422 }
        );
      }
    }

    return proxyGET<GetFollowersResponse>(
      req,
      `/masjids/${masjid_id}/followers`,
      MOCK_FOLLOWERS
    );
  } catch (error) {
    console.error("[FOL-04] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}