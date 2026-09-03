/**
 * Route Handler — Event Extension · My Event Registrations
 *
 * EVT-EXT-07  GET /api/users/me/event-registrations
 *   → Paginated list of all events the authenticated user has registered for
 *     or waitlisted. Powers the "My Events" user dashboard.
 *     Sorted by event_start_time ascending.
 *     qr_token is included only for confirmed registrations (null for others).
 *
 * Auth: Bearer JWT (required)
 *
 * Query Params:
 *   page    number                          — default 1
 *   limit   number                          — default 20, max 50
 *   status  confirmed|waitlisted|cancelled  — filter by registration status
 *   from    ISO8601                         — filter events starting on or after
 *   to      ISO8601                         — filter events starting on or before
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetMyRegistrationsResponse, RegistrationStatus } from "@/types/events";

// ─── Valid Enum Values ────────────────────────────────────────────────────────

const VALID_STATUSES: Set<RegistrationStatus> = new Set([
  "confirmed",
  "waitlisted",
  "cancelled",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MY_REGISTRATIONS: GetMyRegistrationsResponse = {
  success: true,
  message: "Registrations retrieved successfully.",
  data: [
    {
      registration_id: "reg-uuid-0001",
      event_id: "evt-uuid-0001",
      event_name: "Spiritual Growth in a Modern World",
      event_start_time: "2026-10-25T19:00:00Z",
      event_end_time: "2026-10-25T20:30:00Z",
      location_name: "Main Prayer Hall",
      banner_url: "https://cdn.masjids.io/events/evt-uuid-0001-banner.jpg",
      category: "education",
      status: "confirmed",
      registered_at: "2026-05-05T10:00:00Z",
      qr_token: "data:image/png;base64,mockQRTokenBase64StringHere==",
    },
    {
      registration_id: "reg-uuid-0002",
      event_id: "evt-uuid-0002",
      event_name: "Youth Leadership Workshop",
      event_start_time: "2026-11-01T10:00:00Z",
      event_end_time: "2026-11-01T14:00:00Z",
      location_name: "Community Hall — Room B",
      banner_url: "https://cdn.masjids.io/events/evt-uuid-0002-banner.jpg",
      category: "youth",
      status: "waitlisted",
      registered_at: "2026-05-05T10:05:00Z",
      qr_token: null,
    },
    {
      registration_id: "reg-uuid-0003",
      event_id: "evt-uuid-0003",
      event_name: "Sisters' Quran Circle — Weekly",
      event_start_time: "2026-10-27T14:00:00Z",
      event_end_time: "2026-10-27T15:30:00Z",
      location_name: "Sisters' Prayer Room",
      banner_url: null,
      category: "sisters_only",
      status: "confirmed",
      registered_at: "2026-05-04T08:30:00Z",
      qr_token: "data:image/png;base64,mockQRTokenSistersCircle==",
    },
    {
      registration_id: "reg-uuid-0004",
      event_id: "evt-uuid-0007",
      event_name: "Ramadan Prep Workshop",
      event_start_time: "2026-09-15T18:00:00Z",
      event_end_time: "2026-09-15T20:00:00Z",
      location_name: "Main Prayer Hall",
      banner_url: null,
      category: "prayer_related",
      status: "cancelled",
      registered_at: "2026-04-20T12:00:00Z",
      qr_token: null,
    },
  ],
  metadata: {
    total_data: 4,
    total_page: 1,
    page: 1,
    limit: 20,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * EVT-EXT-07 — GET my event registrations (paginated)
 * Query params: page, limit, status, from, to
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    // Validate status filter
    const statusFilter = searchParams.get("status");
    if (statusFilter && !VALID_STATUSES.has(statusFilter as RegistrationStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status: "${statusFilter}".`,
          errors: { status: [`Must be one of: ${[...VALID_STATUSES].join(", ")}.`] },
        },
        { status: 422 }
      );
    }

    // Validate date range
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (fromParam && isNaN(Date.parse(fromParam))) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { from: ["Must be a valid ISO8601 date."] } },
        { status: 422 }
      );
    }

    if (toParam && isNaN(Date.parse(toParam))) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { to: ["Must be a valid ISO8601 date."] } },
        { status: 422 }
      );
    }

    // Validate pagination
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    if (pageRaw !== null && (!Number.isInteger(Number(pageRaw)) || Number(pageRaw) < 1)) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { page: ["page must be a positive integer."] } },
        { status: 422 }
      );
    }

    if (limitRaw !== null) {
      const limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return NextResponse.json(
          { success: false, message: "Validation failed.", errors: { limit: ["limit must be between 1 and 50."] } },
          { status: 422 }
        );
      }
    }

    return proxyGET<GetMyRegistrationsResponse>(
      req,
      "/users/me/event-registrations",
      MOCK_MY_REGISTRATIONS
    );
  } catch (error) {
    console.error("[EVT-EXT-07] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}