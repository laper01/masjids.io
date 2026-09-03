/**
 * Route Handler — Election Setup · Slate Single Resource
 *
 * ELS-07  GET  /api/masjids/:masjid_id/elections/slate/:slate_id
 *   → Full slate detail with all positions and candidates embedded.
 *     Auth: Bearer JWT · elections:read
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetSlateDetailResponse } from "@/types/elections";

interface RouteContext {
  params: Promise<{ masjid_id: string; slate_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SLATE_DETAIL: GetSlateDetailResponse = {
  success: true,
  message: "Slate retrieved successfully.",
  data: {
    slate_id: "slate-uuid-0001",
    label: "2026-2027 Governing Term",
    term_start: 2026,
    term_end: 2027,
    status: "locked",
    locked_at: "2026-05-06T09:00:00Z",
    created_at: "2026-05-01T09:00:00Z",
    positions: [
      {
        position_id: "pos-uuid-0001",
        position_name: "General Secretary",
        role_bundle: "executive_admin",
        status: "locked",
        term_start: 2026,
        term_end: 2027,
        candidate_count: 3,
        candidates: [
          { user_id: "usr-ahmed-khan", name: "Ahmed Khan" },
          { user_id: "usr-sarah-alfarsi", name: "Sarah Al-Farsi" },
          { user_id: "usr-omar-siddiqui", name: "Omar Siddiqui" },
        ],
      },
      {
        position_id: "pos-uuid-0002",
        position_name: "Treasurer",
        role_bundle: "treasurer",
        status: "locked",
        term_start: 2026,
        term_end: 2027,
        candidate_count: 2,
        candidates: [
          { user_id: "usr-uuid-zubair-0001", name: "Zubair Malik" },
          { user_id: "usr-uuid-bilal-0003", name: "Bilal Hassan" },
        ],
      },
      {
        position_id: "pos-uuid-0003",
        position_name: "Community Outreach Officer",
        role_bundle: "general_council_member",
        status: "pending_draft",
        term_start: 2026,
        term_end: 2027,
        candidate_count: 0,
        candidates: [],
      },
    ],
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, slate_id } = await context.params;
    if (!masjid_id || !slate_id)
      return NextResponse.json({ success: false, message: "Missing masjid_id or slate_id." }, { status: 400 });

    return proxyGET<GetSlateDetailResponse>(req, `/masjids/${masjid_id}/elections/slate/${slate_id}`, MOCK_SLATE_DETAIL);
  } catch (error) {
    console.error("[ELS-07]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}