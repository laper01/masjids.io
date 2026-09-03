/**
 * Route Handler — Membership Tiers · Collection
 *
 * GET  /api/masjids/:masjid_id/tiers
 *   → Lists all active membership tiers for a masjid.
 *     PUBLIC — no auth required (members browse tiers before subscribing).
 *     Shows pricing, benefits, voting rights, and availability.
 *
 * POST /api/masjids/:masjid_id/tiers
 *   → Creates a new membership tier for the masjid.
 *     Auth: Bearer JWT · members:manage
 *
 * ─── Ported from old app ──────────────────────────────────────────────────────
 * Old pattern: getServerSession → direct fetch to NEXT_PUBLIC_API_URL
 * New pattern: proxyGET / proxyPOST via proxyHelper.ts
 *   - GET was public in old app (no session check) — preserved here
 *   - POST required session — Bearer JWT forwarded automatically by proxy
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type {
  GetTiersResponse,
  CreateTierResponse,
  TierBillingCycle,
  TierVisibility,
} from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

const VALID_BILLING_CYCLES: Set<TierBillingCycle> = new Set(["monthly", "yearly"]);
const VALID_VISIBILITIES: Set<TierVisibility> = new Set(["public", "private", "invite_only"]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_TIERS_LIST: GetTiersResponse = {
  success: true,
  message: "Tiers retrieved successfully.",
  data: [
    {
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
    {
      id: "tier_uuid_2",
      masjid_id: "msj-uuid-al-noor-0001",
      name: "Basic Member",
      description: "Standard membership. Supports the masjid and grants access to member-only events and announcements.",
      price: 25,
      currency: "USD",
      interval: "monthly",
      visibility: "public",
      can_vote: false,
      max_members: null,
      current_member_count: 312,
      benefits: [
        "Access to member-only events",
        "Member announcements and newsletter",
        "Masjid directory listing",
      ],
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "tier_uuid_3",
      masjid_id: "msj-uuid-al-noor-0001",
      name: "Annual Supporter",
      description: "Single annual contribution. Ideal for those who prefer to pay once a year.",
      price: 250,
      currency: "USD",
      interval: "yearly",
      visibility: "public",
      can_vote: true,
      max_members: null,
      current_member_count: 45,
      benefits: [
        "Full voting rights in masjid elections",
        "All premium member benefits",
        "10% discount on paid events",
        "Special recognition at annual general meeting",
      ],
      is_active: true,
      created_at: "2026-02-01T00:00:00Z",
      updated_at: "2026-02-01T00:00:00Z",
    },
  ],
};

const MOCK_CREATE_TIER: CreateTierResponse = {
  success: true,
  message: "Tier created successfully.",
  data: {
    id: "tier_uuid_new_9999",
    masjid_id: "msj-uuid-al-noor-0001",
    name: "Student Member",
    description: "Discounted tier for full-time students.",
    price: 10,
    currency: "USD",
    interval: "monthly",
    visibility: "public",
    can_vote: false,
    max_members: 50,
    current_member_count: 0,
    benefits: ["Access to student events", "Member newsletter"],
    is_active: true,
    created_at: "2026-05-19T12:00:00Z",
    updated_at: "2026-05-19T12:00:00Z",
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET — List all tiers (PUBLIC)
 * No auth required. Used by the membership subscription page.
 */
export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing required parameter: masjid_id." }, { status: 400 });

    return proxyGET<GetTiersResponse>(req, `/masjids/${masjid_id}/tiers`, MOCK_TIERS_LIST);
  } catch (error) {
    console.error("[TIERS GET]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST — Create a new membership tier
 * Body: { name, description, price, currency, interval, visibility?, can_vote?, max_members?, benefits? }
 * Auth: Bearer JWT · members:manage
 */
export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing required parameter: masjid_id." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { name, description, price, currency, interval, visibility, can_vote, max_members, benefits } =
      body as Record<string, unknown>;

    // Required field validation
    if (!name || typeof name !== "string" || (name as string).trim() === "")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { name: ["name is required."] } }, { status: 422 });

    if (!description || typeof description !== "string" || (description as string).trim() === "")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { description: ["description is required."] } }, { status: 422 });

    if (price === undefined || price === null)
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { price: ["price is required."] } }, { status: 422 });

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0)
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { price: ["price must be a non-negative number."] } }, { status: 422 });

    if (!currency || typeof currency !== "string")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { currency: ["currency is required."] } }, { status: 422 });

    if (!interval || !VALID_BILLING_CYCLES.has(interval as TierBillingCycle))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { interval: [`Must be one of: ${[...VALID_BILLING_CYCLES].join(", ")}.`] } }, { status: 422 });

    // Optional field validation
    if (visibility !== undefined && !VALID_VISIBILITIES.has(visibility as TierVisibility))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { visibility: [`Must be one of: ${[...VALID_VISIBILITIES].join(", ")}.`] } }, { status: 422 });

    if (can_vote !== undefined && typeof can_vote !== "boolean")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { can_vote: ["can_vote must be a boolean."] } }, { status: 422 });

    if (max_members !== undefined && max_members !== null) {
      const maxNum = Number(max_members);
      if (!Number.isInteger(maxNum) || maxNum < 1)
        return NextResponse.json({ success: false, message: "Validation failed.", errors: { max_members: ["max_members must be a positive integer when provided."] } }, { status: 422 });
    }

    if (benefits !== undefined && !Array.isArray(benefits))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { benefits: ["benefits must be an array of strings."] } }, { status: 422 });

    return proxyPOST<CreateTierResponse>(req, `/masjids/${masjid_id}/tiers`, MOCK_CREATE_TIER);
  } catch (error) {
    console.error("[TIERS POST]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}