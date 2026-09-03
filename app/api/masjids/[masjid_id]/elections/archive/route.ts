/**
 * Route Handler — Election Archives · ARC-01, ARC-02, ARC-03
 *
 * ARC-01  GET /api/masjids/:masjid_id/elections/archive
 * ARC-02  GET /api/masjids/:masjid_id/elections/archive/stats
 * ARC-03  GET /api/masjids/:masjid_id/elections/archive/annual-report
 *
 * All three live under /elections/archive. Next.js resolves:
 *   /elections/archive          → this file (GET)
 *   /elections/archive/stats    → stats/route.ts
 *   /elections/archive/annual-report → annual-report/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetArchiveResponse, PositionType, ArchiveStatus } from "@/types/elections";

interface RouteContext { params: Promise<{ masjid_id: string }>; }

const VALID_POSITION_TYPES: Set<PositionType> = new Set(["executive_board", "trustees", "shura_council", "all"]);
const VALID_ARCHIVE_STATUSES: Set<ArchiveStatus> = new Set(["certified", "all"]);

const MOCK_ARCHIVE: GetArchiveResponse = {
  total_records: 12,
  page: 1,
  per_page: 6,
  results: [
    {
      term_period: "2026-2027",
      position: "General Secretary",
      position_type: "executive_board",
      winner_id: "usr-uuid-fatima-0002",
      winner_name: "Fatimah Zahra",
      votes_cast: 1050,
      eligible: 1950,
      participation: 0.54,
      status: "certified",
      role_mapped: true,
    },
    {
      term_period: "2024-2026",
      position: "Treasurer",
      position_type: "executive_board",
      winner_id: "usr-uuid-zubair-0001",
      winner_name: "Zubair Malik",
      votes_cast: 1400,
      eligible: 1800,
      participation: 0.78,
      status: "certified",
      role_mapped: true,
    },
    {
      term_period: "2024-2026",
      position: "General Secretary",
      position_type: "executive_board",
      winner_id: "usr-omar-farooq",
      winner_name: "Dr. Omar Farooq",
      votes_cast: 850,
      eligible: 1000,
      participation: 0.85,
      status: "certified",
      role_mapped: false,
    },
    {
      term_period: "2022-2023",
      position: "Community Outreach Officer",
      position_type: "trustees",
      winner_id: "usr-uuid-bilal-0003",
      winner_name: "Bilal Hassan",
      votes_cast: 760,
      eligible: 1620,
      participation: 0.47,
      status: "certified",
      role_mapped: true,
    },
  ],
};

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id) return NextResponse.json({ success: false, message: "Missing masjid_id." }, { status: 400 });

    const { searchParams } = new URL(req.url);

    const positionType = searchParams.get("position_type");
    if (positionType && !VALID_POSITION_TYPES.has(positionType as PositionType))
      return NextResponse.json({ success: false, message: `Invalid position_type: "${positionType}".`, errors: { position_type: [`Must be one of: ${[...VALID_POSITION_TYPES].join(", ")}.`] } }, { status: 422 });

    const statusFilter = searchParams.get("status");
    if (statusFilter && !VALID_ARCHIVE_STATUSES.has(statusFilter as ArchiveStatus))
      return NextResponse.json({ success: false, message: `Invalid status: "${statusFilter}".`, errors: { status: [`Must be one of: ${[...VALID_ARCHIVE_STATUSES].join(", ")}.`] } }, { status: 422 });

    const yearFrom = searchParams.get("year_from");
    const yearTo = searchParams.get("year_to");
    if (yearFrom && isNaN(Number(yearFrom))) return NextResponse.json({ success: false, message: "Validation failed.", errors: { year_from: ["year_from must be a number."] } }, { status: 422 });
    if (yearTo && isNaN(Number(yearTo))) return NextResponse.json({ success: false, message: "Validation failed.", errors: { year_to: ["year_to must be a number."] } }, { status: 422 });
    if (yearFrom && yearTo && Number(yearFrom) > Number(yearTo)) return NextResponse.json({ success: false, message: "Validation failed.", errors: { year_from: ["year_from must not be greater than year_to."] } }, { status: 422 });

    return proxyGET<GetArchiveResponse>(req, `/masjids/${masjid_id}/elections/archive`, MOCK_ARCHIVE);
  } catch (error) {
    console.error("[ARC-01]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
