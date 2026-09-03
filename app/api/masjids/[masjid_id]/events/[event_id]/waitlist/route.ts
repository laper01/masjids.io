/**
 * Route Handler — Event Extension · Join Waitlist
 *
 * EVT-EXT-04  POST /api/masjids/:masjid_id/events/:event_id/waitlist
 *   → Adds the authenticated user to the event waitlist (FIFO).
 *     User is auto-promoted and notified when a spot opens.
 *
 * Auth: Bearer JWT (any authenticated user)
 *
 * Returns:
 *   409 — already on waitlist
 *   422 — event is not sold out (use EVT-EXT-03 to register directly)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { JoinWaitlistResponse } from "@/types/events";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; event_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_WAITLIST: JoinWaitlistResponse = {
  success: true,
  message: "Added to waitlist successfully.",
  data: {
    waitlist_id: "wl-uuid-0001",
    event_id: "evt-uuid-0002",
    event_name: "Youth Leadership Workshop",
    user_id: "usr-uuid-zubair-0001",
    position: 5,
    waitlist_count: 12,
    joined_at: "2026-05-05T10:05:00Z",
    status: "waitlisted",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * EVT-EXT-04 — POST join event waitlist
 * No request body required.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, event_id } = await context.params;

    if (!masjid_id || !event_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters: masjid_id and event_id." },
        { status: 400 }
      );
    }

    return proxyPOST<JoinWaitlistResponse>(
      req,
      `/masjids/${masjid_id}/events/${event_id}/waitlist`,
      MOCK_WAITLIST
    );
  } catch (error) {
    console.error("[EVT-EXT-04] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}