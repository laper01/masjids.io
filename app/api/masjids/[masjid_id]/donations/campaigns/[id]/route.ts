/**
 * Route Handler — Donation Campaigns · Single Resource
 *
 * DON-03  GET /api/masjids/:masjid_id/donations/campaigns/:id
 *   → Full detail of a single campaign including description and end_date.
 *     PUBLIC — no auth required.
 *
 * DON-04  PUT /api/masjids/:masjid_id/donations/campaigns/:id
 *   → Updates campaign metadata (title, description, goal_amount, status).
 *     Cannot change donation_type or currency after creation.
 *     Setting status to "closed" permanently ends the campaign — irreversible.
 *     Auth: Bearer JWT · donations:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPUT } from "@/lib/proxyHelper";
import type {
  GetCampaignDetailResponse,
  UpdateCampaignResponse,
  CampaignStatus,
} from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; id: string }>;
}

// ─── Valid Enum Values ────────────────────────────────────────────────────────

const VALID_STATUSES: Set<CampaignStatus> = new Set([
  "active",
  "paused",
  "closed",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CAMPAIGN_DETAIL: GetCampaignDetailResponse = {
  success: true,
  message: "Campaign retrieved successfully.",
  data: {
    id:              "camp-uuid-0001",
    masjid:          { id: "msj-uuid-al-noor-0001", name: "Masjid Al-Noor" },
    title:           "Masjid Expansion Fund",
    description:     "We are raising funds to expand the main prayer hall...",
    goal_amount:     150000,
    raised_amount:   87430,
    currency:        "GBP",
    donation_type:   "both",
    status:          "active",
    progress_pct:    58.29,
    donor_count:     412,
    end_date:        "2026-12-31T23:59:59Z",
    start_date:      "2026-01-01T00:00:00Z",   // ← tambah ini
    cover_image_url: null,                      // ← tambah ini
  },
};

const MOCK_UPDATE_CAMPAIGN: UpdateCampaignResponse = {
  success: true,
  message: "Campaign updated successfully.",
  data: {
    id: "camp-uuid-0001",
    title: "Masjid Expansion Fund",
    goal_amount: 150000,
    status: "active",
    updated_at: "2026-04-23T14:30:00Z",
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * DON-03 — GET campaign detail (PUBLIC)
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

    return proxyGET<GetCampaignDetailResponse>(
      req,
      `/masjids/${masjid_id}/donations/campaigns/${id}`,
      MOCK_CAMPAIGN_DETAIL
    );
  } catch (error) {
    console.error("[DON-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * DON-04 — PUT update campaign metadata
 * Body: { title?, description?, goal_amount?, status? }
 * Auth: Bearer JWT · donations:manage
 *
 * Constraints:
 *   - donation_type and currency are immutable after creation
 *   - Transitioning to "closed" is irreversible
 *   - goal_amount can only be raised, not lowered below raised_amount
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

    const { title, description, goal_amount, status } =
      body as Record<string, unknown>;

    // At least one field must be provided
    if (
      title === undefined &&
      description === undefined &&
      goal_amount === undefined &&
      status === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: {
            body: [
              "At least one field must be provided: title, description, goal_amount, or status.",
            ],
          },
        },
        { status: 422 }
      );
    }

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { title: ["title must be a non-empty string."] },
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
    }

    // Validate description if provided
    if (
      description !== undefined &&
      (typeof description !== "string" || description.trim() === "")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { description: ["description must be a non-empty string."] },
        },
        { status: 422 }
      );
    }

    // Validate goal_amount if provided
    if (goal_amount !== undefined) {
      const goalNum = Number(goal_amount);
      if (isNaN(goalNum) || goalNum <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { goal_amount: ["goal_amount must be a positive number."] },
          },
          { status: 422 }
        );
      }
    }

    // Validate status if provided
    if (status !== undefined) {
      if (typeof status !== "string" || !VALID_STATUSES.has(status as CampaignStatus)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid status: "${status}".`,
            errors: {
              status: [`Must be one of: ${[...VALID_STATUSES].join(", ")}.`],
            },
          },
          { status: 422 }
        );
      }
    }

    return proxyPUT<UpdateCampaignResponse>(
      req,
      `/masjids/${masjid_id}/donations/campaigns/${id}`,
      MOCK_UPDATE_CAMPAIGN
    );
  } catch (error) {
    console.error("[DON-04] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}