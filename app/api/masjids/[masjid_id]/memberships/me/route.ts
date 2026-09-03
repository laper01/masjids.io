/**
 * Route Handler — Memberships · My Membership at This Masjid
 *
 * GET /api/masjids/:masjid_id/memberships/me
 *   → Returns the authenticated user's current membership record
 *     for this specific masjid (tier, status, voting rights, billing dates).
 *     Returns 404 if the user has no membership here.
 *
 * Auth: Bearer JWT (self only — reads from JWT identity, no scope needed)
 *
 * ─── Ported from old app ──────────────────────────────────────────────────────
 * Old pattern:
 *   getServerSession → fetch(`${NEXT_PUBLIC_API_URL}masjids/${id}/memberships/me`)
 *
 * New pattern:
 *   proxyGET forwards the incoming Bearer JWT from the request headers directly.
 *   No getServerSession needed in the BFF — auth is delegated to the backend.
 *
 * ROUTING NOTE:
 *   This file is at /memberships/me/route.ts (STATIC segment).
 *   Next.js resolves it BEFORE /memberships/[membership_id].
 *   Must stay at this exact path.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetMyMasjidMembershipResponse } from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ACTIVE: GetMyMasjidMembershipResponse = {
  success: true,
  message: "Membership retrieved successfully.",
  data: {
    membership_id: "mem_uuid_001",
    masjid_id: "msj-uuid-al-noor-0001",
    tier: {
      id: "tier_uuid_1",
      name: "Premium Supporting Member",
      price: 100,
      currency: "USD",
      interval: "monthly",
    },
    status: "active",
    can_vote: true,
    started_at: "2026-04-01T08:00:00Z",
    renewed_at: "2026-05-01T08:00:00Z",
    next_billing_at: "2026-06-01T08:00:00Z",
    expires_at: "2026-06-01T08:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing required parameter: masjid_id." }, { status: 400 });

    return proxyGET<GetMyMasjidMembershipResponse>(
      req,
      `/masjids/${masjid_id}/memberships/me`,
      MOCK_ACTIVE
    );
  } catch (error) {
    console.error("[MEMBERSHIPS ME GET]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}