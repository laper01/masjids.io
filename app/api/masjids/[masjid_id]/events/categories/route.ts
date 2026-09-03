/**
 * Route Handler — Event Extension · Event List + Categories
 *
 * EVT-EXT-01b  GET /api/masjids/:masjid_id/events
 *   → Paginated event list with capacity status, spots left, and per-user
 *     registration state. Powers the Discover Events page.
 *     PUBLIC — no auth required (user_registration_status defaults to
 *     "not_registered" for unauthenticated requests).
 *
 * Query Params:
 *   page      number                                    — default 1
 *   limit     number                                    — default 20, max 50
 *   category  education|social|youth|sisters_only|prayer_related
 *   status    upcoming|sold_out|cancelled
 *   from      ISO8601
 *   to        ISO8601
 *   q         string (search: name, speaker, workshop)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetEventsResponse, EventStatus } from "@/types/events";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Valid Enum Values ────────────────────────────────────────────────────────

const VALID_STATUSES: Set<EventStatus> = new Set([
  "upcoming",
  "sold_out",
  "cancelled",
]);

const VALID_CATEGORIES = new Set([
  "education",
  "social",
  "youth",
  "sisters_only",
  "prayer_related",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_EVENTS_LIST: GetEventsResponse = {
  success: true,
  message: "Events retrieved successfully.",
  data: [
    {
      id: "evt-uuid-0001",
      name: "Spiritual Growth in a Modern World",
      category: "education",
      category_label: "Education",
      type: "hybrid",
      start_time: "2026-10-25T19:00:00Z",
      end_time: "2026-10-25T20:30:00Z",
      location_name: "Main Prayer Hall",
      banner_url: "https://cdn.masjids.io/events/evt-uuid-0001-banner.jpg",
      gender_restriction: "NO_RESTRICTION",
      max_participants: 100,
      registered_count: 85,
      spots_left: 15,
      capacity_pct: 85,
      status: "upcoming",
      user_registration_status: "not_registered",
      requires_rsvp: true,
    },
    {
      id: "evt-uuid-0002",
      name: "Youth Leadership Workshop",
      category: "youth",
      category_label: "Youth",
      type: "in_person",
      start_time: "2026-11-01T10:00:00Z",
      end_time: "2026-11-01T14:00:00Z",
      location_name: "Community Hall — Room B",
      banner_url: "https://cdn.masjids.io/events/evt-uuid-0002-banner.jpg",
      gender_restriction: "NO_RESTRICTION",
      max_participants: 40,
      registered_count: 40,
      spots_left: 0,
      capacity_pct: 100,
      status: "sold_out",
      user_registration_status: "waitlisted",
      requires_rsvp: true,
    },
    {
      id: "evt-uuid-0003",
      name: "Sisters' Quran Circle — Weekly",
      category: "sisters_only",
      category_label: "Sisters Only",
      type: "in_person",
      start_time: "2026-10-27T14:00:00Z",
      end_time: "2026-10-27T15:30:00Z",
      location_name: "Sisters' Prayer Room",
      banner_url: null,
      gender_restriction: "SISTERS_ONLY",
      max_participants: 25,
      registered_count: 18,
      spots_left: 7,
      capacity_pct: 72,
      status: "upcoming",
      user_registration_status: "registered",
      requires_rsvp: true,
    },
    {
      id: "evt-uuid-0004",
      name: "Community Iftar & Social Evening",
      category: "social",
      category_label: "Social",
      type: "in_person",
      start_time: "2026-11-05T18:30:00Z",
      end_time: "2026-11-05T21:00:00Z",
      location_name: "Masjid Garden & Hall",
      banner_url: "https://cdn.masjids.io/events/evt-uuid-0004-banner.jpg",
      gender_restriction: "NO_RESTRICTION",
      max_participants: 200,
      registered_count: 124,
      spots_left: 76,
      capacity_pct: 62,
      status: "upcoming",
      user_registration_status: "not_registered",
      requires_rsvp: false,
    },
    {
      id: "evt-uuid-0005",
      name: "Jumuah Preparation — New Muslims",
      category: "prayer_related",
      category_label: "Prayer-related",
      type: "in_person",
      start_time: "2026-10-30T12:00:00Z",
      end_time: "2026-10-30T13:30:00Z",
      location_name: "Ground Floor Classroom",
      banner_url: null,
      gender_restriction: "NO_RESTRICTION",
      max_participants: 20,
      registered_count: 9,
      spots_left: 11,
      capacity_pct: 45,
      status: "upcoming",
      user_registration_status: "not_registered",
      requires_rsvp: true,
    },
    {
      id: "evt-uuid-0006",
      name: "Introduction to Islamic Art & Calligraphy",
      category: "education",
      category_label: "Education",
      type: "in_person",
      start_time: "2026-11-02T17:30:00Z",
      end_time: "2026-11-02T19:00:00Z",
      location_name: "North Wing Studio",
      banner_url: "https://cdn.masjids.io/events/evt-uuid-0006-banner.jpg",
      gender_restriction: "NO_RESTRICTION",
      max_participants: 30,
      registered_count: 30,
      spots_left: 0,
      capacity_pct: 100,
      status: "sold_out",
      user_registration_status: "not_registered",
      requires_rsvp: true,
    },
  ],
  metadata: {
    total_data: 48,
    total_page: 3,
    page: 1,
    limit: 20,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

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

    const { searchParams } = new URL(req.url);

    // Validate status filter
    const statusFilter = searchParams.get("status");
    if (statusFilter && !VALID_STATUSES.has(statusFilter as EventStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status: "${statusFilter}".`,
          errors: { status: [`Must be one of: ${[...VALID_STATUSES].join(", ")}.`] },
        },
        { status: 422 }
      );
    }

    // Validate category filter
    const categoryFilter = searchParams.get("category");
    if (categoryFilter && !VALID_CATEGORIES.has(categoryFilter)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid category: "${categoryFilter}".`,
          errors: { category: [`Must be one of: ${[...VALID_CATEGORIES].join(", ")}.`] },
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

    if (fromParam && toParam && new Date(fromParam) > new Date(toParam)) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { from: ["from must not be later than to."] } },
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

    return proxyGET<GetEventsResponse>(
      req,
      `/masjids/${masjid_id}/events`,
      MOCK_EVENTS_LIST
    );
  } catch (error) {
    console.error("[EVT-EXT-01b] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}