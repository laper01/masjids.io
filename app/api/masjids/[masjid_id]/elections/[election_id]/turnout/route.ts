/**
 * VB-02  GET /api/masjids/:masjid_id/elections/:election_id/turnout
 * Real-time turnout metrics. Designed for 5s polling.
 * Rate-limited to 60 req/min per masjid_id.
 * Auth: Bearer JWT · elections:manage
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetTurnoutResponse } from "@/types/elections";

interface RouteContext { params: Promise<{ masjid_id: string; election_id: string }>; }

const MOCK: GetTurnoutResponse = {
  success: true,
  message: "Turnout stats retrieved successfully.",
  data: {
    participation_pct: 64,
    ballots_cast: 1248,
    eligible_voters: 1950,
    remaining_voters: 702,
    active_sessions: 23,
    avg_vote_seconds: 102,
    time_remaining_s: 15734,
    delta_pct_1hr: 4,
    ballot_integrity: "active",
    refreshed_at: "2026-05-06T14:22:14Z",
  },
};

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, election_id } = await context.params;
    if (!masjid_id || !election_id) return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });
    return proxyGET<GetTurnoutResponse>(req, `/masjids/${masjid_id}/elections/${election_id}/turnout`, MOCK);
  } catch (error) {
    console.error("[VB-02]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
