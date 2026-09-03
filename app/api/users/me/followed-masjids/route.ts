/**
 * Route Handler — Followers System · My Followed Masjids
 *
 * FOL-05  GET /api/users/me/followed-masjids
 *   → Paginated list of all masjids the authenticated user is following.
 *     Includes per-masjid notification preferences (push + in-app toggles).
 *     Actor is derived entirely from the Bearer JWT — no path param needed.
 *
 * Auth: Bearer JWT (required)
 *
 * Query Params:
 *   page   number — default 1
 *   limit  number — default 10, max 50
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetFollowedMasjidsResponse } from "@/types/api";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_FOLLOWED_MASJIDS: GetFollowedMasjidsResponse = {
  success: true,
  message: "Followed masjids retrieved successfully.",
  data: [
    {
      masjid_id: "msj-uuid-al-noor-0001",
      name: "Masjid Al-Noor",
      city: "London",
      follower_count: 1284,
      push_enabled: true,
      in_app_enabled: true,
      followed_at: "2026-04-23T11:00:00Z",
    },
    {
      masjid_id: "msj-uuid-al-iman-0002",
      name: "Masjid Al-Iman",
      city: "Birmingham",
      follower_count: 876,
      push_enabled: false,
      in_app_enabled: true,
      followed_at: "2026-03-10T08:30:00Z",
    },
    {
      masjid_id: "msj-uuid-ar-rahman-0003",
      name: "Masjid Ar-Rahman",
      city: "Manchester",
      follower_count: 2105,
      push_enabled: true,
      in_app_enabled: false,
      followed_at: "2026-02-14T17:00:00Z",
    },
    {
      masjid_id: "msj-uuid-al-falah-0004",
      name: "Masjid Al-Falah",
      city: "Leicester",
      follower_count: 540,
      push_enabled: false,
      in_app_enabled: false,
      followed_at: "2026-01-01T00:00:00Z",
    },
    {
      masjid_id: "msj-uuid-al-hidayah-0005",
      name: "Masjid Al-Hidayah",
      city: "Bradford",
      follower_count: 310,
      push_enabled: true,
      in_app_enabled: true,
      followed_at: "2025-12-20T10:15:00Z",
    },
  ],
  metadata: {
    total_data: 5,
    total_page: 1,
    page: 1,
    limit: 10,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * FOL-05 — GET all masjids followed by the authenticated user
 * Query params: page, limit (max 50)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
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

    return proxyGET<GetFollowedMasjidsResponse>(
      req,
      `/masjids/users/me/followed-masjids`,
      MOCK_FOLLOWED_MASJIDS
    );
  } catch (error) {
    console.error("[FOL-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}