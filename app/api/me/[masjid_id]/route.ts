/**
 * Route Handler — Member Self-Service · My Subscription at a Specific Masjid
 *
 * MEM-ME-02  GET    /api/me/memberships/:masjid_id
 *   → Full subscription detail for one masjid.
 *     Returns 404 if member has no subscription at this masjid.
 *     Auth: Bearer JWT (self only)
 *
 * MEM-ME-04  DELETE /api/me/memberships/:masjid_id
 *   → Cancel own subscription. Soft-delete. Immediate access revocation.
 *     Optional body: { reason?: string }
 *     Returns 409 if already cancelled or expired.
 *     Auth: Bearer JWT (self only)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyDELETE } from "@/lib/proxyHelper";
import type {
  GetMyMembershipDetailResponse,
  CancelMyMembershipData,
} from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DETAIL: GetMyMembershipDetailResponse = {
   success: true,
   message: "Membership detail retrieved successfully.",
   data: { membership_id: "mem_uuid_1",
  masjid: {
    id: "64d60f66-9b91-474e-89f7-bf598851dd84",
    name: "Masjid Al-Noor",
    city: "New York",
    logo_url: "https://cdn.masjids.io/logos/al-noor.png",
  },
  tier: {
    id: "tier_uuid_1",
    name: "Premium Supporting Member",
    price: 100,
    currency: "USD",
    interval: "monthly",
    description: "Premium access to monthly board reports and full voting rights.",
  },
  status: "active",
  can_vote: true,
  payment_method: "credit_card",
  started_at: "2026-04-01T08:00:00Z",
  renewed_at: "2026-05-01T08:00:00Z",
  next_billing_at: "2026-06-01T08:00:00Z",
  expires_at: "2026-06-01T08:00:00Z",
  payment_count: 2,
  total_paid: 200,}
};

const MOCK_CANCEL: CancelMyMembershipData = {
  membership_id: "mem_uuid_1",
  masjid_id: "64d60f66-9b91-474e-89f7-bf598851dd84",
  status: "cancelled",
  cancelled_at: "2026-05-19T10:00:00Z",
  reason: "I am relocating to another city",
  message: "Your membership has been cancelled. A confirmation has been sent to your email.",
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing required parameter: masjid_id." }, { status: 400 });

    return proxyGET<GetMyMembershipDetailResponse>(req, `/me/memberships/${masjid_id}`, MOCK_DETAIL);
  } catch (error) {
    console.error("[MEM-ME-02]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing required parameter: masjid_id." }, { status: 400 });

    // Parse optional body
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      let body: unknown;
      try { body = await req.clone().json(); } catch {
        return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
      }
      const { reason } = body as Record<string, unknown>;
      if (reason !== undefined && typeof reason !== "string")
        return NextResponse.json({ success: false, message: "Validation failed.", errors: { reason: ["reason must be a string when provided."] } }, { status: 422 });
      if (typeof reason === "string" && reason.length > 500)
        return NextResponse.json({ success: false, message: "Validation failed.", errors: { reason: ["reason must not exceed 500 characters."] } }, { status: 422 });
    }

    return proxyDELETE<CancelMyMembershipData>(req, `/me/memberships/${masjid_id}`, MOCK_CANCEL);
  } catch (error) {
    console.error("[MEM-ME-04]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}