/**
 * Route Handler — Announcements · Single Resource
 *
 * ANN-03  GET    /api/masjids/:masjid_id/announcements/:id
 *   → Full detail of a single announcement.
 *     PUBLIC — no auth required.
 *
 * ANN-04  PUT    /api/masjids/:masjid_id/announcements/:id
 *   → Updates an existing announcement (title, body, category).
 *     Does NOT re-broadcast — editing is silent.
 *     Auth: Bearer JWT · notifications:send
 *
 * ANN-05  DELETE /api/masjids/:masjid_id/announcements/:id
 *   → Permanently deletes an announcement (hard delete).
 *     Also removes the associated in-app notifications from all recipients.
 *     Auth: Bearer JWT · notifications:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPUT, proxyDELETE } from "@/lib/proxyHelper";
import type {
  GetAnnouncementDetailResponse,
  UpdateAnnouncementResponse,
  DeleteAnnouncementResponse,
  AnnouncementCategory,
} from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; id: string }>;
}

// ─── Valid Enum Values ────────────────────────────────────────────────────────

const VALID_CATEGORIES: Set<AnnouncementCategory> = new Set([
  "event",
  "general",
  "urgent",
  "jumuah",
  "fundraising",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ANNOUNCEMENT_DETAIL: GetAnnouncementDetailResponse = {
  success: true,
  message: "Announcement retrieved successfully.",
  data: {
    id: "ann-uuid-0001",
    masjid: { id: "msj-uuid-al-noor-0001", name: "Masjid Al-Noor" },
    title: "Jumuah Khutbah — Change of Time",
    body: "Please note that Jumuah prayer will now begin at 1:30 PM instead of 1:15 PM effective from this Friday. This change is permanent for the summer schedule. The khutbah will be delivered in both Arabic and English. Brothers are reminded to arrive early to secure a spot.",
    category: "jumuah",
    media_url: null,
    published_at: "2026-04-23T08:00:00Z",
    updated_at: "2026-04-23T08:00:00Z",
  },
};

const MOCK_UPDATE_ANNOUNCEMENT: UpdateAnnouncementResponse = {
  success: true,
  message: "Announcement updated successfully.",
  data: {
    id: "ann-uuid-0001",
    title: "Jumuah Khutbah — Change of Time (Updated)",
    category: "jumuah",
    updated_at: "2026-04-23T12:00:00Z",
  },
};

const MOCK_DELETE_ANNOUNCEMENT: DeleteAnnouncementResponse = {
  success: true,
  message: "Announcement deleted successfully.",
  data: {
    id: "ann-uuid-0001",
    deleted: true,
    deleted_at: "2026-04-23T12:05:00Z",
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * ANN-03 — GET single announcement detail (PUBLIC)
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, id } = await context.params;

    if (!masjid_id || !id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters: masjid_id and id." },
        { status: 400 }
      );
    }

    return proxyGET<GetAnnouncementDetailResponse>(
      req,
      `/masjids/${masjid_id}/announcements/${id}`,
      MOCK_ANNOUNCEMENT_DETAIL
    );
  } catch (error) {
    console.error("[ANN-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * ANN-04 — PUT update an existing announcement (silent — no re-broadcast)
 * Body: { title, body, category }
 * Auth: Bearer JWT · notifications:send
 */
export async function PUT(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, id } = await context.params;

    if (!masjid_id || !id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters: masjid_id and id." },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.clone().json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const {
      title,
      body: announcementBody,
      category,
    } = body as Record<string, unknown>;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { title: ["title is required."] },
        },
        { status: 422 }
      );
    }

    if (title.length > 120) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { title: ["title must not exceed 120 characters."] },
        },
        { status: 422 }
      );
    }

    if (
      !announcementBody ||
      typeof announcementBody !== "string" ||
      announcementBody.trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { body: ["body is required."] },
        },
        { status: 422 }
      );
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { category: ["category is required."] },
        },
        { status: 422 }
      );
    }

    if (!VALID_CATEGORIES.has(category as AnnouncementCategory)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid category: "${category}".`,
          errors: {
            category: [`Must be one of: ${[...VALID_CATEGORIES].join(", ")}.`],
          },
        },
        { status: 422 }
      );
    }

    return proxyPUT<UpdateAnnouncementResponse>(
      req,
      `/masjids/${masjid_id}/announcements/${id}`,
      MOCK_UPDATE_ANNOUNCEMENT
    );
  } catch (error) {
    console.error("[ANN-04] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * ANN-05 — DELETE an announcement permanently
 * No request body required.
 * Auth: Bearer JWT · notifications:manage
 *
 * Note: This is a hard delete. Associated in-app notifications are also
 * removed from all recipient inboxes by the backend.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, id } = await context.params;

    if (!masjid_id || !id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters: masjid_id and id." },
        { status: 400 }
      );
    }

    return proxyDELETE<DeleteAnnouncementResponse>(
      req,
      `/masjids/${masjid_id}/announcements/${id}`,
      MOCK_DELETE_ANNOUNCEMENT
    );
  } catch (error) {
    console.error("[ANN-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}