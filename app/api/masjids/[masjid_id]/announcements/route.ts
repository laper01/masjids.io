/**
 * Route Handler — Announcements · Collection
 *
 * ANN-01  POST /api/masjids/:masjid_id/announcements
 *   → Creates and immediately broadcasts a new announcement to all
 *     followers of this masjid (push + in-app). Requires staff auth.
 *
 * ANN-02  GET  /api/masjids/:masjid_id/announcements
 *   → Paginated, reverse-chronological list of announcements.
 *     PUBLIC — no auth required. Filterable by category.
 *
 * Auth:
 *   POST → Bearer JWT · notifications:send
 *   GET  → Public
 *
 * Query Params (GET only):
 *   page      number                                    — default 1
 *   limit     number                                    — default 10, max 50
 *   category  event | general | urgent | jumuah | fundraising
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type {
  GetAnnouncementsResponse,
  CreateAnnouncementResponse,
  AnnouncementCategory,
} from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
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

const MOCK_ANNOUNCEMENTS_LIST: GetAnnouncementsResponse = {
  success: true,
  message: "Announcements retrieved successfully.",
  data: [
    {
      id: "ann-uuid-0001",
      title: "Jumuah Khutbah — Change of Time",
      body: "Please note that Jumuah prayer will now begin at 1:30 PM instead of 1:15 PM effective from this Friday. This change is permanent for the summer schedule.",
      category: "jumuah",
      media_url: null,
      published_at: "2026-04-23T08:00:00Z",
    },
    {
      id: "ann-uuid-0002",
      title: "Emergency Roof Repair — Masjid Closure",
      body: "Due to urgent roof maintenance, the masjid will be closed on Saturday 26th April from 8 AM to 4 PM. All prayers during this time will be held in the community hall next door.",
      category: "urgent",
      media_url: null,
      published_at: "2026-04-22T14:30:00Z",
    },
    {
      id: "ann-uuid-0003",
      title: "Annual Charity Dinner — Book Your Seats",
      body: "Our annual charity dinner will be held on May 10th at 7 PM. All proceeds go towards the masjid expansion fund. Tickets are £25 per person. Contact the office to reserve your seat.",
      category: "fundraising",
      media_url: "https://cdn.masjids.io/announcements/ann-uuid-0003-banner.jpg",
      published_at: "2026-04-20T10:00:00Z",
    },
    {
      id: "ann-uuid-0004",
      title: "Islamic History Course — Starts May 3rd",
      body: "Join us for a 6-week Islamic history course every Saturday after Asr prayer. The course is free and open to all ages. Registration is not required — simply show up.",
      category: "event",
      media_url: null,
      published_at: "2026-04-18T09:00:00Z",
    },
    {
      id: "ann-uuid-0005",
      title: "New Wudu Facilities Now Open",
      body: "Alhamdulillah, the newly renovated wudu facilities are now open for use. Separate entrances for brothers and sisters have been added. We thank all donors who made this possible.",
      category: "general",
      media_url: "https://cdn.masjids.io/announcements/ann-uuid-0005-wudu.jpg",
      published_at: "2026-04-15T11:00:00Z",
    },
    {
      id: "ann-uuid-0006",
      title: "Weekend Islamic School — Term 2 Enrolment",
      body: "Enrolment for Term 2 of the Weekend Islamic School is now open. Ages 5–16. Classes cover Quran, Arabic, and Islamic studies. Limited places available — register early.",
      category: "event",
      media_url: null,
      published_at: "2026-04-10T08:30:00Z",
    },
    {
      id: "ann-uuid-0007",
      title: "Fundraising Goal Reached — Alhamdulillah!",
      body: "We are delighted to announce that the roof repair fundraising campaign has reached its £50,000 goal in just 3 weeks. JazakAllah khayr to every single donor. Work begins next month.",
      category: "fundraising",
      media_url: null,
      published_at: "2026-04-05T16:00:00Z",
    },
    {
      id: "ann-uuid-0008",
      title: "Sisters' Halaqa — Weekly Starting April 28th",
      body: "A new weekly sisters' halaqa will begin this Monday after Dhuhr prayer. Sister Fatimah Al-Zahra will be leading a study of Surah Al-Baqarah. All sisters are warmly welcome.",
      category: "event",
      media_url: null,
      published_at: "2026-04-01T10:00:00Z",
    },
  ],
  metadata: {
    total_data: 31,
    total_page: 4,
    page: 1,
    limit: 10,
  },
};

const MOCK_CREATE_ANNOUNCEMENT: CreateAnnouncementResponse = {
  success: true,
  message: "Announcement created and broadcast successfully.",
  data: {
    id: "ann-uuid-new-0099",
    masjid_id: "msj-uuid-al-noor-0001",
    title: "Jumuah Khutbah — Change of Time",
    category: "jumuah",
    broadcast_status: "queued",
    follower_count: 1284,
    published_at: "2026-04-23T08:00:00Z",
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * ANN-02 — GET paginated announcements list (PUBLIC)
 * Query params: page, limit, category
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

    const { searchParams } = new URL(req.url);

    // Validate category filter
    const categoryFilter = searchParams.get("category");
    if (categoryFilter && !VALID_CATEGORIES.has(categoryFilter as AnnouncementCategory)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid category: "${categoryFilter}".`,
          errors: {
            category: [`Must be one of: ${[...VALID_CATEGORIES].join(", ")}.`],
          },
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

    return proxyGET<GetAnnouncementsResponse>(
      req,
      `/masjids/${masjid_id}/announcements`,
      MOCK_ANNOUNCEMENTS_LIST
    );
  } catch (error) {
    console.error("[ANN-02] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * ANN-01 — POST create a new announcement
 * Body: { title, body, category, media_url? }
 * Auth: Bearer JWT · notifications:send
 */
export async function POST(
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
      media_url,
    } = body as Record<string, unknown>;

    // Validate required fields
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

    // Optional media_url — must be a valid URL string if provided
    if (media_url !== undefined && media_url !== null) {
      if (typeof media_url !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { media_url: ["media_url must be a string URL."] },
          },
          { status: 422 }
        );
      }
      try {
        new URL(media_url);
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { media_url: ["media_url must be a valid URL."] },
          },
          { status: 422 }
        );
      }
    }

    return proxyPOST<CreateAnnouncementResponse>(
      req,
      `/masjids/${masjid_id}/announcements`,
      MOCK_CREATE_ANNOUNCEMENT
    );
  } catch (error) {
    console.error("[ANN-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}