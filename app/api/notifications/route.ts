/**
 * Route Handler — Notifications Infrastructure · Notifications List
 *
 * NOTIF-01  GET /api/notifications
 *   → Paginated, reverse-chronological list of in-app notifications
 *     for the authenticated user. Includes total unread count.
 *
 * Auth: Bearer JWT (required)
 *
 * Query Params:
 *   page       number                            — default 1
 *   limit      number                            — default 10, max 50
 *   read       boolean (true | false)            — filter by read status
 *   masjid_id  string                            — filter to one masjid
 *   type       announcement | election | system  — filter by notification type
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetNotificationsResponse, NotificationType } from "@/types/api";

// ─── Valid Enum Values ────────────────────────────────────────────────────────

const VALID_TYPES: Set<NotificationType> = new Set([
  "announcement",
  "election",
  "system",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: GetNotificationsResponse = {
  success: true,
  message: "Notifications retrieved successfully.",
  data: [
    {
      id: "notif-uuid-0001",
      type: "announcement",
      title: "Jumuah Reminder — This Friday",
      body: "Jumuah prayer at Masjid Al-Noor starts at 1:15 PM. Please arrive early. Parking is available on the east side.",
      masjid: { id: "msj-uuid-al-noor-0001", name: "Masjid Al-Noor" },
      source_id: "ann-uuid-0021",
      read: false,
      unread_count: 4,
      created_at: "2026-04-23T09:00:00Z",
    },
    {
      id: "notif-uuid-0002",
      type: "election",
      title: "Voting is now open",
      body: "The election for Masjid Al-Noor Chairperson position is now open. Cast your vote before April 30th.",
      masjid: { id: "msj-uuid-al-noor-0001", name: "Masjid Al-Noor" },
      source_id: "elec-uuid-0005",
      read: false,
      unread_count: 4,
      created_at: "2026-04-22T08:00:00Z",
    },
    {
      id: "notif-uuid-0003",
      type: "announcement",
      title: "Ramadan Iftar Programme",
      body: "Masjid Al-Iman is hosting a community iftar every evening this week. All are welcome.",
      masjid: { id: "msj-uuid-al-iman-0002", name: "Masjid Al-Iman" },
      source_id: "ann-uuid-0022",
      read: false,
      unread_count: 4,
      created_at: "2026-04-21T15:30:00Z",
    },
    {
      id: "notif-uuid-0004",
      type: "system",
      title: "New feature: Donation Campaigns",
      body: "You can now donate to your followed masjids directly through the app.",
      masjid: { id: "msj-uuid-al-noor-0001", name: "Masjid Al-Noor" },
      source_id: "sys-uuid-0001",
      read: false,
      unread_count: 4,
      created_at: "2026-04-20T12:00:00Z",
    },
    {
      id: "notif-uuid-0005",
      type: "announcement",
      title: "Weekend Islamic School Enrolment Open",
      body: "Enrolment for the 2026 academic year is now open for ages 5–16. Limited spaces available.",
      masjid: { id: "msj-uuid-ar-rahman-0003", name: "Masjid Ar-Rahman" },
      source_id: "ann-uuid-0023",
      read: true,
      unread_count: 4,
      created_at: "2026-04-19T10:00:00Z",
    },
    {
      id: "notif-uuid-0006",
      type: "election",
      title: "Election Results Published",
      body: "The results for the Treasurer election at Masjid Ar-Rahman have been published. Tap to view.",
      masjid: { id: "msj-uuid-ar-rahman-0003", name: "Masjid Ar-Rahman" },
      source_id: "elec-uuid-0004",
      read: true,
      unread_count: 4,
      created_at: "2026-04-18T16:00:00Z",
    },
    {
      id: "notif-uuid-0007",
      type: "announcement",
      title: "Fundraising Goal Reached!",
      body: "Alhamdulillah! The Masjid Al-Falah roof repair campaign has reached its £50,000 goal.",
      masjid: { id: "msj-uuid-al-falah-0004", name: "Masjid Al-Falah" },
      source_id: "ann-uuid-0024",
      read: true,
      unread_count: 4,
      created_at: "2026-04-17T11:00:00Z",
    },
    {
      id: "notif-uuid-0008",
      type: "system",
      title: "Your account email was updated",
      body: "Your login email has been successfully updated. If you did not make this change, contact support immediately.",
      masjid: { id: "msj-uuid-al-noor-0001", name: "Masjid Al-Noor" },
      source_id: "sys-uuid-0002",
      read: true,
      unread_count: 4,
      created_at: "2026-04-15T09:30:00Z",
    },
  ],
  metadata: {
    total_data: 24,
    total_page: 3,
    page: 1,
    limit: 10,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * NOTIF-01 — GET paginated notification list
 * Query params: page, limit, read, masjid_id, type
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    // Validate `type` filter
    const typeFilter = searchParams.get("type");
    if (typeFilter && !VALID_TYPES.has(typeFilter as NotificationType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid type filter: "${typeFilter}".`,
          errors: {
            type: [`Must be one of: ${[...VALID_TYPES].join(", ")}.`],
          },
        },
        { status: 422 }
      );
    }

    // Validate `read` filter
    const readFilter = searchParams.get("read");
    if (readFilter !== null && readFilter !== "true" && readFilter !== "false") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { read: ['read must be "true" or "false".'] },
        },
        { status: 422 }
      );
    }

    // Validate pagination
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

    return proxyGET<GetNotificationsResponse>(
      req,
      "/notifications",
      MOCK_NOTIFICATIONS
    );
  } catch (error) {
    console.error("[NOTIF-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}