/**
 * Route Handler — Membership Tiers · Single Resource
 *
 * GET    /api/masjids/:masjid_id/tiers/:tier_id
 *   → Single tier detail including all benefits and member count.
 *     PUBLIC — no auth required (shown on subscription selection page).
 *
 * PUT    /api/masjids/:masjid_id/tiers/:tier_id
 *   → Full or partial update of a tier.
 *     Cannot lower price if active subscribers exist (backend enforces).
 *     Auth: Bearer JWT · members:manage
 *
 * DELETE /api/masjids/:masjid_id/tiers/:tier_id
 *   → Soft-deletes (deactivates) the tier.
 *     Cannot delete a tier with active subscribers.
 *     Returns 204 on success (no body).
 *     Auth: Bearer JWT · members:manage
 *
 * ─── Ported from old app ──────────────────────────────────────────────────────
 * Old pattern: GET was public (no session), PUT/DELETE used getServerSession.
 * New pattern: proxyHelper forwards Bearer JWT from incoming request.
 *   - GET: no auth header forwarded (public)
 *   - PUT/DELETE: Bearer JWT from request forwarded automatically
 * Old app handled 204 (no body) explicitly — preserved here.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPUT, proxyDELETE } from "@/lib/proxyHelper";
import type {
  GetTierDetailResponse,
  UpdateTierResponse,
  DeleteTierResponse,
  TierBillingCycle,
  TierVisibility,
} from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string; tier_id: string }>;
}

const VALID_BILLING_CYCLES: Set<TierBillingCycle> = new Set(["monthly", "yearly", ]);
const VALID_VISIBILITIES: Set<TierVisibility> = new Set(["public", "private", "invite_only"]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_TIER_DETAIL: GetTierDetailResponse = {
  success: true,
  message: "Tier retrieved successfully.",
  data: {
    id: "tier_uuid_1",
    masjid_id: "msj-uuid-al-noor-0001",
    name: "Premium Supporting Member",
    description: "Full voting rights, monthly board reports, priority event booking, and recognition in the annual masjid report.",
    price: 100,
    currency: "USD",
    interval: "monthly",
    visibility: "public",
    can_vote: true,
    max_members: 200,
    current_member_count: 87,
    benefits: [
      "Full voting rights in masjid elections",
      "Monthly financial transparency report",
      "Priority registration for events",
      "Annual report recognition",
    ],
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
};

const MOCK_UPDATE_TIER: UpdateTierResponse = {
  success: true,
  message: "Tier updated successfully.",
  data: {
    id: "tier_uuid_1",
    masjid_id: "msj-uuid-al-noor-0001",
    name: "Premium Supporting Member — Updated",
    description: "Updated description.",
    price: 120,
    currency: "USD",
    interval: "monthly",
    visibility: "public",
    can_vote: true,
    max_members: 250,
    current_member_count: 87,
    benefits: [
      "Full voting rights in masjid elections",
      "Monthly financial transparency report",
      "Priority registration for events",
      "Annual report recognition",
      "Exclusive access to board meetings",
    ],
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-05-19T12:00:00Z",
  },
};

const MOCK_DELETE_TIER: DeleteTierResponse = {
  success: true,
  message: "Tier deactivated successfully.",
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET — Tier detail (PUBLIC)
 */
export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, tier_id } = await context.params;
    if (!masjid_id || !tier_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    return proxyGET<GetTierDetailResponse>(req, `/masjids/${masjid_id}/tiers/${tier_id}`, MOCK_TIER_DETAIL);
  } catch (error) {
    console.error("[TIER GET]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

/**
 * PUT — Update tier (partial update supported)
 * Body: any subset of { name, description, price, interval, visibility, can_vote, max_members, benefits, is_active }
 * Auth: Bearer JWT · members:manage
 */
export async function PUT(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, tier_id } = await context.params;
    if (!masjid_id || !tier_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const updateFields = body as Record<string, unknown>;

    // At least one field must be provided
    if (Object.keys(updateFields).length === 0)
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { body: ["At least one field must be provided for update."] } }, { status: 422 });

    const { name, description, price, interval, visibility, can_vote, max_members, benefits, is_active } = updateFields;

    if (name !== undefined && (typeof name !== "string" || (name as string).trim() === ""))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { name: ["name must be a non-empty string."] } }, { status: 422 });

    if (description !== undefined && (typeof description !== "string" || (description as string).trim() === ""))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { description: ["description must be a non-empty string."] } }, { status: 422 });

    if (price !== undefined) {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0)
        return NextResponse.json({ success: false, message: "Validation failed.", errors: { price: ["price must be a non-negative number."] } }, { status: 422 });
    }

    if (interval !== undefined && !VALID_BILLING_CYCLES.has(interval as TierBillingCycle))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { interval: [`Must be one of: ${[...VALID_BILLING_CYCLES].join(", ")}.`] } }, { status: 422 });

    if (visibility !== undefined && !VALID_VISIBILITIES.has(visibility as TierVisibility))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { visibility: [`Must be one of: ${[...VALID_VISIBILITIES].join(", ")}.`] } }, { status: 422 });

    if (can_vote !== undefined && typeof can_vote !== "boolean")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { can_vote: ["can_vote must be a boolean."] } }, { status: 422 });

    if (is_active !== undefined && typeof is_active !== "boolean")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { is_active: ["is_active must be a boolean."] } }, { status: 422 });

    if (max_members !== undefined && max_members !== null && (!Number.isInteger(Number(max_members)) || Number(max_members) < 1))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { max_members: ["max_members must be a positive integer when provided."] } }, { status: 422 });

    if (benefits !== undefined && !Array.isArray(benefits))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { benefits: ["benefits must be an array of strings."] } }, { status: 422 });

    return proxyPUT<UpdateTierResponse>(req, `/masjids/${masjid_id}/tiers/${tier_id}`, MOCK_UPDATE_TIER);
  } catch (error) {
    console.error("[TIER PUT]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE — Deactivate tier (soft delete)
 * No request body required.
 * Returns 204 No Content on success (matching old app behaviour).
 * Returns 409 if tier has active subscribers.
 * Auth: Bearer JWT · members:manage
 */
export async function DELETE(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, tier_id } = await context.params;
    if (!masjid_id || !tier_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    const result = await proxyDELETE<DeleteTierResponse>(
      req,
      `/masjids/${masjid_id}/tiers/${tier_id}`,
      MOCK_DELETE_TIER
    );

    // Backend returns 204 for successful deletion — preserve that behaviour
    if (result.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    return result;
  } catch (error) {
    console.error("[TIER DELETE]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}