/**
 * VB-07  GET /api/masjids/:masjid_id/elections/:election_id/candidates
 * Member/voter view of all positions and candidates.
 * No admin metadata or vote counts included.
 * Auth: Bearer JWT · elections:vote
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetElectionCandidatesResponse } from "@/types/elections";

interface RouteContext { params: Promise<{ masjid_id: string; election_id: string }>; }

const MOCK: GetElectionCandidatesResponse = {
  success: true,
  message: "Election candidates retrieved successfully.",
  data: {
    election_id: "elec-uuid-0001",
    label: "2026-2027 Governing Term",
    voting_deadline: "2026-05-20T23:59:59Z",
    positions: [
      {
        position_id: "pos-uuid-0001",
        position_name: "General Secretary",
        candidates: [
          { candidate_id: "cand-uuid-0001", name: "Ahmed Khan", bio: "Active community volunteer since 2018. Led three successful fundraising campaigns." },
          { candidate_id: "cand-uuid-0002", name: "Sarah Al-Farsi", bio: "Former treasurer with 5 years experience. Background in community development." },
          { candidate_id: "cand-uuid-0003", name: "Omar Siddiqui", bio: "Islamic studies teacher and long-standing committee member since 2015." },
        ],
      },
      {
        position_id: "pos-uuid-0002",
        position_name: "Treasurer",
        candidates: [
          { candidate_id: "cand-uuid-0004", name: "Zubair Malik", bio: "Chartered accountant with 10 years in non-profit financial management." },
          { candidate_id: "cand-uuid-0005", name: "Bilal Hassan", bio: "Finance director with extensive experience in community organisation budgeting." },
        ],
      },
    ],
  },
};

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, election_id } = await context.params;
    if (!masjid_id || !election_id) return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });
    return proxyGET<GetElectionCandidatesResponse>(req, `/masjids/${masjid_id}/elections/${election_id}/candidates`, MOCK);
  } catch (error) {
    console.error("[VB-07]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
