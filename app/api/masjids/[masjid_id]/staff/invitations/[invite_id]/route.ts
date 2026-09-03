/**
 * Route Handler — User Invitation & Staff Management · Revoke Invitation
 *
 * INV-03  DELETE /api/masjids/:masjid_id/staff/invitations/:invite_id
 *   → Revokes a pending invitation, immediately invalidating its token.
 *     The invited user will receive a 410 Gone if they try to use the link.
 *
 *     Cannot revoke invitations with status: accepted | expired.
 *     Attempting to do so returns 409.
 *
 * Auth: Bearer JWT · members:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyDELETE } from "@/lib/proxyHelper";
import type { RevokeInvitationResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; invite_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_REVOKE_INVITATION: RevokeInvitationResponse = {
  success: true,
  message: "Invitation revoked successfully.",
  data: {
    invite_id: "inv-uuid-0001",
    email: "hassan.ali@example.com",
    status: "revoked",
    revoked_at: "2026-04-23T15:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * INV-03 — DELETE revoke a pending invitation
 * No request body required.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, invite_id } = await context.params;

    if (!masjid_id || !invite_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters: masjid_id and invite_id.",
        },
        { status: 400 }
      );
    }

    return proxyDELETE<RevokeInvitationResponse>(
      req,
      `/masjids/${masjid_id}/staff/invitations/${invite_id}`,
      MOCK_REVOKE_INVITATION
    );
  } catch (error) {
    console.error("[INV-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}