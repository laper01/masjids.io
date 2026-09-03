/**
 * Route Handler — Voting Booth · Elections Collection
 *
 * VB-05  GET /api/masjids/:masjid_id/elections
 *   → Paginated list of all elections, ordered by created_at descending.
 *     Elections are auto-created when a slate is locked (ELS-05).
 *     Filter by status: active | frozen | closed | all (default: all)
 *     Auth: Bearer JWT · elections:read
 *
 * NOTE: This route lives at /elections (not /elections/slate).
 *       Static segments (archive, slate) are resolved before this [election_id]
 *       handler in sibling routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetElectionsResponse, ElectionStatusFilter } from "@/types/elections";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

const VALID_STATUS_FILTERS: Set<ElectionStatusFilter> = new Set(["active", "frozen", "closed", "all"]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ELECTIONS_LIST: GetElectionsResponse = {
  data: [
    {
      election_id: "elec-uuid-0001",
      slate_id: "slate-uuid-0001",
      label: "2026-2027 Governing Term",
      status: "active",
      positions_count: 3,
      eligible_voters: 1950,
      ballots_cast: 1248,
      participation_pct: 64,
      voting_deadline: "2026-05-20T23:59:59Z",
      created_at: "2026-05-06T09:00:00Z",
    },
    {
      election_id: "elec-uuid-0002",
      slate_id: "slate-uuid-0002",
      label: "2024-2025 Governing Term",
      status: "closed",
      positions_count: 4,
      eligible_voters: 1800,
      ballots_cast: 1530,
      participation_pct: 85,
      voting_deadline: "2024-05-25T23:59:59Z",
      created_at: "2024-05-10T09:00:00Z",
    },
    {
      election_id: "elec-uuid-0003",
      slate_id: "slate-uuid-0003",
      label: "2022-2023 Governing Term",
      status: "closed",
      positions_count: 4,
      eligible_voters: 1620,
      ballots_cast: 1182,
      participation_pct: 73,
      voting_deadline: "2022-05-18T23:59:59Z",
      created_at: "2022-04-28T09:00:00Z",
    },
  ],
  pagination: { page: 1, limit: 20, total: 3 },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id) return NextResponse.json({ success: false, message: "Missing masjid_id." }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") ?? "all";

    if (!VALID_STATUS_FILTERS.has(statusFilter as ElectionStatusFilter))
      return NextResponse.json({ success: false, message: `Invalid status: "${statusFilter}".`, errors: { status: [`Must be one of: ${[...VALID_STATUS_FILTERS].join(", ")}.`] } }, { status: 422 });

    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");
    if (pageRaw !== null && (!Number.isInteger(Number(pageRaw)) || Number(pageRaw) < 1))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { page: ["page must be a positive integer."] } }, { status: 422 });
    if (limitRaw !== null) {
      const l = Number(limitRaw);
      if (!Number.isInteger(l) || l < 1 || l > 50)
        return NextResponse.json({ success: false, message: "Validation failed.", errors: { limit: ["limit must be between 1 and 50."] } }, { status: 422 });
    }

    return proxyGET<GetElectionsResponse>(req, `/masjids/${masjid_id}/elections`, MOCK_ELECTIONS_LIST);
  } catch (error) {
    console.error("[VB-05]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
