/**
 * Route Handler — Event Extension · Calendar Export
 *
 * EVT-EXT-05  GET /api/masjids/:masjid_id/events/:event_id/calendar
 *   → Returns calendar export data. Powers the "Add to Calendar" button.
 *     Supports iCal (.ics), Google Calendar deep-link, and Outlook deep-link.
 *
 * Auth: PUBLIC — no auth required.
 *
 * Query Params:
 *   format  ical | google | all  (default: all)
 *
 * Special behaviour when format=ical:
 *   The backend sets Content-Type: text/calendar and returns raw .ics content
 *   for direct browser download. The BFF forwards this as-is.
 *   In mock mode, JSON is returned regardless of format.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetCalendarExportResponse, CalendarFormat } from "@/types/events";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; event_id: string }>;
}

// ─── Valid Format Values ──────────────────────────────────────────────────────

const VALID_FORMATS: Set<CalendarFormat> = new Set(["ical", "google", "all"]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CALENDAR_EXPORT: GetCalendarExportResponse = {
  success: true,
  message: "Calendar export data retrieved successfully.",
  data: {
    event_id: "evt-uuid-0006",
    event_name: "Introduction to Islamic Art & Calligraphy",
    ical_url:
      "https://api.masjids.io/api/v2/masjids/msj-uuid-al-noor-0001/events/evt-uuid-0006/calendar?format=ical",
    google_calendar_url:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Introduction+to+Islamic+Art+%26+Calligraphy&dates=20261102T173000Z%2F20261102T190000Z&location=North+Wing+Studio&details=Join+us+for+an+evening+of+Islamic+art+and+calligraphy.",
    outlook_url:
      "https://outlook.live.com/calendar/0/deeplink/compose?subject=Introduction+to+Islamic+Art+%26+Calligraphy&startdt=2026-11-02T17:30:00Z&enddt=2026-11-02T19:00:00Z&location=North+Wing+Studio",
    ical_content: [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//masjids.io//Event//EN",
      "BEGIN:VEVENT",
      "UID:evt-uuid-0006@masjids.io",
      "DTSTAMP:20260505T100000Z",
      "DTSTART:20261102T173000Z",
      "DTEND:20261102T190000Z",
      "SUMMARY:Introduction to Islamic Art & Calligraphy",
      "LOCATION:North Wing Studio",
      "DESCRIPTION:Join us for an evening of Islamic art and calligraphy.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"),
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * EVT-EXT-05 — GET calendar export data (PUBLIC)
 * Query param: format (ical | google | all)
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

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "all";

    if (!VALID_FORMATS.has(format as CalendarFormat)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid format: "${format}".`,
          errors: { format: [`Must be one of: ${[...VALID_FORMATS].join(", ")}.`] },
        },
        { status: 422 }
      );
    }

    return proxyGET<GetCalendarExportResponse>(
      req,
      `/masjids/${masjid_id}/events/${event_id}/calendar`,
      MOCK_CALENDAR_EXPORT
    );
  } catch (error) {
    console.error("[EVT-EXT-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}