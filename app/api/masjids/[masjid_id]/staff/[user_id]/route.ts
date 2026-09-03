/**
 * Route Handler — User Invitation & Staff Management · Remove Staff Member
 *
 * INV-06  DELETE /api/masjids/:masjid_id/staff/:user_id
 *   → Permanently removes a staff member from the masjid.
 *     All role template assignments, granted overrides, and revoked
 *     overrides specific to this masjid are cleared for the user.
 *     The user's account is NOT deleted — only their masjid membership.
 *     Creates an audit log entry for the removal.
 *
 * Auth: Bearer JWT · members:manage
 *
 * Returns 403 if:
 *   - The actor is attempting to remove themselves
 *   - The target is the last Admin of the masjid (would leave it ownerless)
 *
 * Returns 404 if:
 *   - user_id is not a staff member of this masjid
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyDELETE } from "@/lib/proxyHelper";
import type { RemoveStaffResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; user_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_REMOVE_STAFF: RemoveStaffResponse = {
  success: true,
  message: "Staff member removed successfully.",
  data: {
    user_id: "usr-uuid-bilal-0003",
    masjid_id: "msj-uuid-al-noor-0001",
    removed: true,
    audit_entry_id: "audit-uuid-removal-0030",
    removed_at: "2026-04-23T16:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * INV-06 — DELETE remove a staff member from the masjid
 * No request body required.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, user_id } = await context.params;

    if (!masjid_id || !user_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters: masjid_id and user_id.",
        },
        { status: 400 }
      );
    }

    return proxyDELETE<RemoveStaffResponse>(
      req,
      `/masjids/${masjid_id}/staff/${user_id}`,
      MOCK_REMOVE_STAFF
    );
  } catch (error) {
    console.error("[INV-06] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}