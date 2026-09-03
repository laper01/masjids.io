/**
 * VB-08  GET /api/masjids/:masjid_id/elections/:election_id/ballot-status
 * Returns authenticated member's vote status for the election.
 * Never reveals which candidate they voted for.
 * Auth: Bearer JWT · elections:vote
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetBallotStatusResponse } from "@/types/elections";

interface RouteContext { params: Promise<{ masjid_id: string; election_id: string }>; }

// Two mocks — proxyHelper returns the mock as-is in mock mode.
// In real mode the backend reads from JWT identity.
const MOCK_NOT_VOTED: GetBallotStatusResponse = {
  success: true,
  message: "Ballot status retrieved successfully.",
  data: {
    election_id: "elec-uuid-0001",
    has_voted: false,
    voted_at: null,
    verification_hash: null,
  },
};

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, election_id } = await context.params;
    if (!masjid_id || !election_id) return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });
    return proxyGET<GetBallotStatusResponse>(req, `/masjids/${masjid_id}/elections/${election_id}/ballot-status`, MOCK_NOT_VOTED);
  } catch (error) {
    console.error("[VB-08]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
