/**
 * Route Handler — Memberships · Subscribe + Admin List
 *
 * GET  /api/masjids/:masjid_id/memberships  → MEM-MISS-01 admin list
 * POST /api/masjids/:masjid_id/memberships  → Subscribe to a tier
 *
 * Ported from old app (getServerSession + direct fetch) to new BFF pattern.
 * proxyHelper forwards the incoming Bearer JWT automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type {
  GetAdminMembershipsResponse,
  SubscribeToTierResponse,
  MembershipStatus,
} from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

const VALID_STATUSES: Set<MembershipStatus> = new Set([
  "active", "cancelled", "expired", "pending", "suspended",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ADMIN_LIST: GetAdminMembershipsResponse = {
  data: [
    {
      id: "mem_uuid_001",
      user_id: "usr-uuid-zubair-0001",
      display_name: "Zubair Malik",
      tier: { id: "tier_uuid_1", name: "Premium Supporting Member" },
      status: "active",
      payment_method: "credit_card",
      started_at: "2026-04-01T08:00:00Z",
      expires_at: "2026-05-01T08:00:00Z",
    },
    {
      id: "mem_uuid_002",
      user_id: "usr-uuid-fatima-0002",
      display_name: "Fatimah Zahra",
      tier: { id: "tier_uuid_1", name: "Premium Supporting Member" },
      status: "active",
      payment_method: "credit_card",
      started_at: "2026-03-15T08:00:00Z",
      expires_at: "2026-05-15T08:00:00Z",
    },
    {
      id: "mem_uuid_003",
      user_id: "usr-uuid-bilal-0003",
      display_name: "Bilal Hassan",
      tier: { id: "tier_uuid_2", name: "Basic Member" },
      status: "cancelled",
      payment_method: "credit_card",
      started_at: "2026-01-01T08:00:00Z",
      expires_at: "2026-03-01T08:00:00Z",
    },
  ],
  pagination: { page: 1, limit: 20, total: 142 },
};

const MOCK_SUBSCRIBE: SubscribeToTierResponse = {
  success: true,
  message: "Membership subscription created successfully.",
  data: {
    membership_id: "mem_uuid_new_9999",
    masjid_id: "msj-uuid-al-noor-0001",
    tier: { id: "tier_uuid_1", name: "Premium Supporting Member" },
    status: "active",
    can_vote: true,
    started_at: "2026-05-19T12:00:00Z",
    next_billing_at: "2026-06-19T12:00:00Z",
    client_secret: null,
    payment_url: null,
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/** MEM-MISS-01 — GET paginated memberships list (admin) */
export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing required parameter: masjid_id." }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    if (statusFilter && !VALID_STATUSES.has(statusFilter as MembershipStatus))
      return NextResponse.json({ success: false, message: `Invalid status: "${statusFilter}".`, errors: { status: [`Must be one of: ${[...VALID_STATUSES].join(", ")}.`] } }, { status: 422 });

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    if (fromParam && isNaN(Date.parse(fromParam)))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { from: ["Must be a valid ISO8601 date."] } }, { status: 422 });
    if (toParam && isNaN(Date.parse(toParam)))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { to: ["Must be a valid ISO8601 date."] } }, { status: 422 });
    if (fromParam && toParam && new Date(fromParam) > new Date(toParam))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { from: ["from must not be later than to."] } }, { status: 422 });

    return proxyGET<GetAdminMembershipsResponse>(req, `/masjids/${masjid_id}/memberships`, MOCK_ADMIN_LIST);
  } catch (error) {
    console.error("[MEM-MISS-01]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST — Subscribe to a membership tier
 * Body: { tier_id, payment_method_id? }
 *
 * Auth: Bearer JWT (self — user subscribing to the masjid)
 * Returns 409 if user already has an active membership.
 * Returns client_secret if Stripe payment confirmation is required.
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

    const { tier_id, payment_method_id } = body as Record<string, unknown>;

    if (!tier_id || typeof tier_id !== "string" || (tier_id as string).trim() === "")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { tier_id: ["tier_id is required."] } }, { status: 422 });

    if (payment_method_id !== undefined && payment_method_id !== null && typeof payment_method_id !== "string")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { payment_method_id: ["payment_method_id must be a string when provided."] } }, { status: 422 });

    return proxyPOST<SubscribeToTierResponse>(req, `/masjids/${masjid_id}/memberships`, MOCK_SUBSCRIBE);
  } catch (error) {
    console.error("[MEMBERSHIPS POST]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}