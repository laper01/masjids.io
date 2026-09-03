// File: app/api/builder/publish/route.ts

/**
 * Route Handler — Web Builder · Publish
 *
 * BLD-03  POST /api/builder/publish?masjid_id=xxx
 *   → Publish the current saved layout for a masjid.
 *
 * Auth: Bearer JWT (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { PublishLayoutResponse } from "@/types/builder";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PUBLISH_LAYOUT: PublishLayoutResponse = {
  success: true,
  message: "Layout published successfully.",
  data: {
    publishedAt: "2026-05-16T10:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * BLD-03 — POST publish layout for a masjid
 * Query params: masjid_id (required)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const masjid_id = searchParams.get("masjid_id");

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "masjid_id is required." },
        { status: 400 }
      );
    }

    return proxyPOST<PublishLayoutResponse>(
      req,
      `/masjids/${masjid_id}/publish`,
      MOCK_PUBLISH_LAYOUT
    );
  } catch (error) {
    console.error("[BLD-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}