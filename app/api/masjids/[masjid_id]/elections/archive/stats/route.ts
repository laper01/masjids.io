/**
 * ARC-02  GET /api/masjids/:masjid_id/elections/archive/stats
 * Aggregate stats for the archive header row. Cached 5 min TTL.
 * Auth: Bearer JWT · elections:read
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetArchiveStatsResponse } from "@/types/elections";

interface RouteContext { params: Promise<{ masjid_id: string }>; }

const MOCK: GetArchiveStatsResponse = {
  success: true,
  message: "Archive stats retrieved successfully.",
  data: {
    total_elections: 12,
    total_elected_members: 24,
    avg_participation_pct: 77,
    terms_on_record: 6,
    year_range: { from: 2020, to: 2026 },
  },
};

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id) return NextResponse.json({ success: false, message: "Missing masjid_id." }, { status: 400 });
    return proxyGET<GetArchiveStatsResponse>(req, `/masjids/${masjid_id}/elections/archive/stats`, MOCK);
  } catch (error) {
    console.error("[ARC-02]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
