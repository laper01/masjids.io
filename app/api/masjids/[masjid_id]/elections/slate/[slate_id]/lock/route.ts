/**
 * Route Handler — Election Setup · Lock Slate
 *
 * ELS-05  POST /api/masjids/:masjid_id/elections/slate/:slate_id/lock
 *   → Transitions slate open → locked. Immutable after this point.
 *     Triggers voting booth activation job for all active positions.
 *     All positions must be in active_setup status (≥2 candidates each).
 *     confirm_lock must be explicitly true to prevent accidents.
 *     Auth: Bearer JWT · elections:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { LockSlateResponse } from "@/types/elections";

interface RouteContext {
  params: Promise<{ masjid_id: string; slate_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_LOCK_SLATE: LockSlateResponse = {
  success: true,
  message: "Slate locked successfully. Voting booth activated.",
  data: {
    slate_id: "slate-uuid-0001",
    status: "locked",
    positions_locked: 3,
    voting_deadline: "2026-05-20T23:59:59Z",
    locked_at: "2026-05-06T09:00:00Z",
    audit_event_id: "AUD-9910",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, slate_id } = await context.params;
    if (!masjid_id || !slate_id)
      return NextResponse.json({ success: false, message: "Missing masjid_id or slate_id." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { deadline_days, confirm_lock } = body as Record<string, unknown>;

    if (confirm_lock !== true)
      return NextResponse.json({ success: false, message: "Explicit confirmation required.", errors: { confirm_lock: ["confirm_lock must be true to proceed."] } }, { status: 400 });

    if (deadline_days === undefined || deadline_days === null)
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { deadline_days: ["deadline_days is required."] } }, { status: 422 });

    const days = Number(deadline_days);
    if (!Number.isInteger(days) || days < 1 || days > 90)
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { deadline_days: ["deadline_days must be an integer between 1 and 90."] } }, { status: 422 });

    return proxyPOST<LockSlateResponse>(req, `/masjids/${masjid_id}/elections/slate/${slate_id}/lock`, MOCK_LOCK_SLATE);
  } catch (error) {
    console.error("[ELS-05]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
