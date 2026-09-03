/**
 * app/api/me/memberships/route.ts
 * MEM-ME-01 — GET /me/memberships
 * Returns all active subscriptions for the current user across all masjids.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetMyMembershipsResponse } from "@/types/memberships";

const MOCK: GetMyMembershipsResponse = {
  data: [
    {
      membership_id: "mem-001",
      masjid: {
        id: "bdba25bd-25a2-4195-a26e-4aef5a47cf6e",
        name: "Masjid Al-Noor",
        city: "New York",
      },
      tier: {
        id: "bbbeb3e8-cee1-4bb8-b357-beba29c526a8",
        name: "Premium Supporting Member 3",
        price: 100,
        currency: "USD",
        interval: "monthly",
        description: "Premium access to monthly board reports and full voting rights.",
      },
      status: "active",
      can_vote: true,
      started_at: "2024-01-15T00:00:00Z",
      next_billing_at: "2026-07-15T00:00:00Z",
      expires_at: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 1,
  },
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  return proxyGET<GetMyMembershipsResponse>(req, "/me/memberships", MOCK);
}