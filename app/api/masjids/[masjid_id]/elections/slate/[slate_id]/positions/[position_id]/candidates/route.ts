/**
 * Route Handler — Election Setup · Set Candidates
 *
 * ELS-04  PUT /api/masjids/:masjid_id/elections/slate/:slate_id/positions/:position_id/candidates
 *   → Replaces the full candidate list for a position (idempotent).
 *     Sending an empty array clears candidates and reverts to pending_draft.
 *     Minimum 2 candidates required before the slate can be locked.
 *     Returns 423 Locked if slate is locked.
 *     Returns 422 if any user_id is not an active masjid member.
 *     Auth: Bearer JWT · elections:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPUT } from "@/lib/proxyHelper";
import type { SetCandidatesResponse } from "@/types/elections";

interface RouteContext {
  params: Promise<{
    masjid_id: string;
    slate_id: string;
    position_id: string;
  }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SET_CANDIDATES: SetCandidatesResponse = {
  success: true,
  message: "Candidates updated successfully.",
  data: {
    position_id: "pos-uuid-0001",
    candidate_count: 3,
    candidates: [
      { user_id: "usr-ahmed-khan", name: "Ahmed Khan" },
      { user_id: "usr-sarah-alfarsi", name: "Sarah Al-Farsi" },
      { user_id: "usr-omar-siddiqui", name: "Omar Siddiqui" },
    ],
    status: "active_setup",
    updated_at: "2026-05-02T12:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, slate_id, position_id } = await context.params;
    if (!masjid_id || !slate_id || !position_id)
      return NextResponse.json({ success: false, message: "Missing required path parameters." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { candidate_user_ids } = body as Record<string, unknown>;

    if (!Array.isArray(candidate_user_ids))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { candidate_user_ids: ["candidate_user_ids must be an array."] } }, { status: 422 });

    const invalid = (candidate_user_ids as unknown[]).filter((id) => typeof id !== "string" || (id as string).trim() === "");
    if (invalid.length > 0)
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { candidate_user_ids: ["All candidate_user_ids must be non-empty strings."] } }, { status: 422 });

    return proxyPUT<SetCandidatesResponse>(
      req,
      `/masjids/${masjid_id}/elections/slate/${slate_id}/positions/${position_id}/candidates`,
      MOCK_SET_CANDIDATES
    );
  } catch (error) {
    console.error("[ELS-04]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
