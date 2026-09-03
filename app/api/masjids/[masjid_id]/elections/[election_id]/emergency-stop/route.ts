/**
 * VB-04  POST /api/masjids/:masjid_id/elections/:election_id/emergency-stop
 * Instantly freezes all active voting sessions.
 * Requires elections:emergency scope (super-admin only).
 * Returns 409 if already frozen, 422 if not active.
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { EmergencyStopResponse, EmergencyStopReason } from "@/types/elections";

interface RouteContext { params: Promise<{ masjid_id: string; election_id: string }>; }

const VALID_REASONS: Set<EmergencyStopReason> = new Set(["suspected_fraud", "technical_failure", "admin_request"]);

const MOCK: EmergencyStopResponse = {
  success: true,
  message: "Emergency stop executed. All voting sessions frozen.",
  data: {
    election_id: "elec-uuid-0001",
    status: "frozen",
    sessions_killed: 23,
    frozen_at: "2026-05-06T14:30:00Z",
    audit_event: "CRIT-0042",
  },
};

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, election_id } = await context.params;
    if (!masjid_id || !election_id) return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { reason, initiated_by } = body as Record<string, unknown>;

    if (!reason || !VALID_REASONS.has(reason as EmergencyStopReason))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { reason: [`Must be one of: ${[...VALID_REASONS].join(", ")}.`] } }, { status: 422 });

    if (!initiated_by || typeof initiated_by !== "string")
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { initiated_by: ["initiated_by (user ID) is required."] } }, { status: 422 });

    return proxyPOST<EmergencyStopResponse>(req, `/masjids/${masjid_id}/elections/${election_id}/emergency-stop`, MOCK);
  } catch (error) {
    console.error("[VB-04]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
