/**
 * Route Handler — Admin Memberships · Single Resource
 *
 * MEM-MISS-02  GET    /api/masjids/:masjid_id/memberships/:membership_id
 *   → Full membership detail (admin) or self (own membership_id).
 *     Auth: Bearer JWT · members:manage OR self
 *
 * MEM-MISS-03  PATCH  /api/masjids/:masjid_id/memberships/:membership_id
 *   → Partial update: status, can_vote, reason.
 *     Auth: Bearer JWT · members:manage
 *
 * MEM-MISS-04  DELETE /api/masjids/:masjid_id/memberships/:membership_id
 *   → Soft-cancel with immediate access revocation.
 *     Auth: Bearer JWT · members:manage OR self
 *
 * FIX: DELETE previously used `proxyDELETE(req, path, mockData)`, a helper
 * with no way to specify a request body, so the validated `reason` field
 * was never actually forwarded to the upstream backend — the backend
 * received a bodyless DELETE and rejected/failed it, even though the exact
 * same request sent directly with a JSON body (bypassing this BFF route)
 * succeeds. Switched to `proxyRequest({ method: "DELETE", ... })`, the same
 * helper the PATCH handler above already uses successfully, which does
 * forward the request body upstream.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxyHelper";
import type {
  AdminMembershipDetail,
  UpdateMembershipData,
  CancelMembershipData,
  MembershipStatus,
} from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string; membership_id: string }>;
}

const VALID_STATUSES: Set<MembershipStatus> = new Set([
  "active", "cancelled", "expired", "pending", "suspended",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DETAIL: AdminMembershipDetail = {
  id: "mem_uuid_001",
  user_id: "usr-uuid-zubair-0001",
  display_name: "Zubair Malik",
  tier: {
    id: "tier_uuid_1",
    name: "Premium Supporting Member",
    price: 100,
    currency: "USD",
    interval: "monthly",
  },
  status: "active",
  can_vote: true,
  payment_method: "credit_card",
  started_at: "2026-04-01T08:00:00Z",
  renewed_at: "2026-05-01T08:00:00Z",
  expires_at: "2026-06-01T08:00:00Z",
  payment_count: 2,
  total_paid: 200,
};

const MOCK_UPDATE = {
  success: true,
  message: "Membership updated successfully.",
  data: {
    status: "cancelled" as MembershipStatus,
    can_vote: false,
    reason: "Member requested cancellation via email",
    updated_at: "2026-05-19T11:00:00Z",
  },
};

const MOCK_CANCEL: CancelMembershipData = {
  id: "mem_uuid_001",
  status: "cancelled",
  cancelled_at: "2026-05-19T11:05:00Z",
  reason: "Member requested cancellation",
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, membership_id } = await context.params;
    if (!masjid_id || !membership_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    return proxyGET<AdminMembershipDetail>(req, `/masjids/${masjid_id}/memberships/${membership_id}`, MOCK_DETAIL);
  } catch (error) {
    console.error("[MEM-MISS-02]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, membership_id } = await context.params;
    if (!masjid_id || !membership_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { status, can_vote, reason } = body as Record<string, unknown>;

    if (status === undefined && can_vote === undefined)
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { body: ["At least one of status or can_vote must be provided."] } }, { status: 422 });

    if (status !== undefined && !VALID_STATUSES.has(status as MembershipStatus))
      return NextResponse.json({ success: false, message: `Invalid status: "${status}".`, errors: { status: [`Must be one of: ${[...VALID_STATUSES].join(", ")}.`] } }, { status: 422 });

    if (can_vote !== undefined && typeof can_vote !== "boolean")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { can_vote: ["can_vote must be a boolean."] } }, { status: 422 });

    if (reason !== undefined && typeof reason !== "string")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { reason: ["reason must be a string when provided."] } }, { status: 422 });

    return proxyRequest<UpdateMembershipData>(req, {
      path: `/masjids/${masjid_id}/memberships/${membership_id}`,
      method: "PATCH",
      mockData: MOCK_UPDATE,
    });
  } catch (error) {
    console.error("[MEM-MISS-03]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, membership_id } = await context.params;
    if (!masjid_id || !membership_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    // Always parse with req.clone().json() — req.json() would consume the
    // stream before proxyRequest below gets a chance to read and forward it.
    let body: unknown = {};
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { reason } = body as Record<string, unknown>;
    if (reason !== undefined && typeof reason !== "string")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { reason: ["reason must be a string when provided."] } }, { status: 422 });

    // FIX: proxyDELETE had no way to forward a request body, so `reason`
    // never reached the upstream backend even though we validated it here.
    // proxyRequest (same helper PATCH uses) does forward the body.
    return proxyRequest<CancelMembershipData>(req, {
      path: `/masjids/${masjid_id}/memberships/${membership_id}`,
      method: "DELETE",
      mockData: MOCK_CANCEL,
    });
  } catch (error) {
    console.error("[MEM-MISS-04]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}