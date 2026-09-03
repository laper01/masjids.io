/**
 * Route Handler — Event Extension · Real-time Capacity Status
 *
 * EVT-EXT-02  GET /api/masjids/:masjid_id/events/:event_id/capacity
 *   → Real-time capacity status for a single event.
 *     Powers the progress bar, spots_left counter, and
 *     Register Now / Join Waitlist button state on event cards.
 *     Designed for lightweight polling — PUBLIC, no auth required.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetEventCapacityResponse } from "@/types/events";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; event_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CAPACITY: GetEventCapacityResponse = {
  success: true,
  message: "Event capacity retrieved successfully.",
  data: {
    event_id: "evt-uuid-0001",
    max_participants: 100,
    registered_count: 85,
    waitlist_count: 12,
    spots_left: 15,
    capacity_pct: 85,
    status: "upcoming",
    is_sold_out: false,
    waitlist_enabled: true,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * EVT-EXT-02 — GET real-time capacity status (PUBLIC)
 * No query params required.
 */
export async function GET(
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

    return proxyGET<GetEventCapacityResponse>(
      req,
      `/masjids/${masjid_id}/events/${event_id}/capacity`,
      MOCK_CAPACITY
    );
  } catch (error) {
    console.error("[EVT-EXT-02] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}