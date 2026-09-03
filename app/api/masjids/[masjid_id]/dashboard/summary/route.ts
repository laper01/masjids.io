/**
 * Route Handler — Dashboard Summary (DASH-01)
 *
 * GET /api/masjids/[masjid_id]/dashboard/summary?period=day|week|month
 *   → Upstream: GET /masjids/{masjid_id}/dashboard/summary
 *   Auth: forwarded automatically by proxyHelper
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { DashboardSummaryResponse } from "@/types/dashboard";

const MOCK_SUMMARY: DashboardSummaryResponse = {
  success: true,
  message: "ok",
  data: {
    community: { total_members: 1, verified_households: 1, growth_pct: 12 },
    revenue: { total_raised: 0, total_goal: 75008, progress_pct: 0, currency: "USD", days_remaining: null },
    staff: { total_staff: 1, active_today: 0 },
    governance: { has_active_election: false, active_election_id: null, active_election_label: null, ballots_cast: 0, participation_pct: 0 },
    campaigns: [],
    financial_chart: { period: "week", bars: [] },
    donation_stats: { average_donation: 0, recurring_donors: 0, refunds_requested: 0, currency: "USD" },
  },
};


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ masjid_id: string }> }
): Promise<NextResponse> {
  const { masjid_id } = await params;

  return proxyGET<DashboardSummaryResponse>(
    req,
    `/masjids/${masjid_id}/dashboard/summary`,
    MOCK_SUMMARY
  );
}