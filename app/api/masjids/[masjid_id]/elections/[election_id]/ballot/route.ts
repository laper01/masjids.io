/**
 * Route Handler — Voting Booth · Ballot
 *
 * VB-01  POST /api/masjids/:masjid_id/elections/:election_id/ballot
 *   → Submits a cryptographically signed anonymous ballot.
 *     Returns a verification_hash the voter can use to audit their vote.
 *     Returns 409 if already voted, 403 if not eligible, 422 if election closed.
 *     Auth: Bearer JWT · elections:vote
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { CastBallotResponse } from "@/types/elections";

interface RouteContext {
  params: Promise<{ masjid_id: string; election_id: string }>;
}

const MOCK_CAST_BALLOT: CastBallotResponse = {
  success: true,
  message: "Ballot cast successfully.",
  data: {
    ballot_id: "blt-uuid-0001",
    verification_hash: "8f2kd9x1a4m7p3qz...a92b",
    status: "cast",
    cast_at: "2026-05-06T14:22:00Z",
    session_closed: true,
  },
};

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, election_id } = await context.params;
    if (!masjid_id || !election_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { position_id, candidate_id, session_token } = body as Record<string, unknown>;

    if (!position_id || typeof position_id !== "string")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { position_id: ["position_id is required."] } }, { status: 422 });
    if (!candidate_id || typeof candidate_id !== "string")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { candidate_id: ["candidate_id is required."] } }, { status: 422 });
    if (!session_token || typeof session_token !== "string")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { session_token: ["session_token is required."] } }, { status: 422 });

    return proxyPOST<CastBallotResponse>(req, `/masjids/${masjid_id}/elections/${election_id}/ballot`, MOCK_CAST_BALLOT);
  } catch (error) {
    console.error("[VB-01]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
