/**
 * app/api/me/[masjid_id]/route.ts
 *
 * MEM-ME-02  GET    /me/memberships/:masjid_id  — Get my membership detail at a masjid
 * MEM-ME-04  DELETE /me/memberships/:masjid_id  — Cancel my membership at a masjid
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyDELETE } from "@/lib/proxyHelper";
import type { GetMyMembershipDetailResponse, CancelMyMembershipData } from "@/types/memberships";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_GET: GetMyMembershipDetailResponse = {
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

const MOCK_DELETE: CancelMyMembershipData = {
  membership_id: "mem-001",
  masjid_id: "bdba25bd-25a2-4195-a26e-4aef5a47cf6e",
  status: "cancelled",
  cancelled_at: new Date().toISOString(),
  reason: null,
  message: "Membership cancelled successfully.",
};

// ─── Route handlers ───────────────────────────────────────────────────────────

type Params = { params: Promise<{ masjid_id: string }> };

// MEM-ME-02 — GET my membership detail at a specific masjid
export async function GET(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { masjid_id } = await params;
  return proxyGET<GetMyMembershipDetailResponse>(
    req,
    `/me/memberships/${masjid_id}`,
    MOCK_GET
  );
}

// MEM-ME-04 — DELETE (cancel) my membership at a specific masjid
export async function DELETE(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { masjid_id } = await params;
  return proxyDELETE<CancelMyMembershipData>(
    req,
    `/me/memberships/${masjid_id}`,
    MOCK_DELETE
  );
}