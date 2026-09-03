/**
 * Route Handler — Voting Booth · Election Single Resource
 *
 * VB-06  GET  /api/masjids/:masjid_id/elections/:election_id
 *   → Full election detail with live metrics and positions summary.
 *     Auth: Bearer JWT · elections:read
 *
 * (VB-01 ballot, VB-02 turnout, VB-03 notify, VB-04 stop are in sub-routes)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetElectionDetailResponse } from "@/types/elections";

interface RouteContext {
  params: Promise<{ masjid_id: string; election_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ELECTION_DETAIL: GetElectionDetailResponse = {
  success: true,
  message: "Election retrieved successfully.",
  data: {
    election_id: "elec-uuid-0001",
    slate_id: "slate-uuid-0001",
    label: "2026-2027 Governing Term",
    status: "active",
    eligible_voters: 1950,
    ballots_cast: 1248,
    participation_pct: 64,
    voting_deadline: "2026-05-20T23:59:59Z",
    time_remaining_s: 15734,
    ballot_integrity: "active",
    created_at: "2026-05-06T09:00:00Z",
    positions: [
      {
        position_id: "pos-uuid-0001",
        position_name: "General Secretary",
        role_bundle: "executive_admin",
        candidate_count: 3,
        ballots_for_position: 412,
      },
      {
        position_id: "pos-uuid-0002",
        position_name: "Treasurer",
        role_bundle: "treasurer",
        candidate_count: 2,
        ballots_for_position: 389,
      },
      {
        position_id: "pos-uuid-0003",
        position_name: "Community Outreach Officer",
        role_bundle: "general_council_member",
        candidate_count: 2,
        ballots_for_position: 301,
      },
    ],
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, election_id } = await context.params;
    if (!masjid_id || !election_id)
      return NextResponse.json({ success: false, message: "Missing masjid_id or election_id." }, { status: 400 });

    return proxyGET<GetElectionDetailResponse>(req, `/masjids/${masjid_id}/elections/${election_id}`, MOCK_ELECTION_DETAIL);
  } catch (error) {
    console.error("[VB-06]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
