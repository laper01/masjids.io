/**
 * Route Handler — User Invitation & Staff Management · Accept Invitation
 *
 * INV-04  POST /api/invitations/:token/accept
 *   → Accepts a staff invitation using the one-time token from the email link.
 *     Atomically assigns the mapped role template to the accepting user
 *     and writes an audit log entry with action: "template_assigned".
 *
 *     The token is single-use — it is invalidated immediately on acceptance.
 *     Expired or already-used tokens return 410 Gone.
 *     Tokens from revoked invitations return 410 Gone.
 *
 *     The accepting user must be authenticated — their identity is read
 *     from the Bearer JWT, not from the token itself.
 *
 * Auth: Bearer JWT (accepting user must be logged in)
 *       The token in the URL identifies the invitation; the JWT identifies the acceptor.
 *
 * Note: This route lives at /api/invitations/:token (NOT under /masjids/:id)
 *       because the invitee navigates here directly from their email link
 *       before they know which masjid they're joining.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { AcceptInvitationResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ token: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ACCEPT_INVITATION: AcceptInvitationResponse = {
  success: true,
  message: "Invitation accepted. Welcome to Masjid Al-Noor staff.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    masjid_name: "Masjid Al-Noor",
    role_template_id: "tmpl-moderator-0002",
    role_name: "Moderator",
    effective_scopes: [
      "members:manage",
      "members:view",
      "notifications:send",
    ],
    audit_entry_id: "audit-uuid-inv-accept-0020",
    accepted_at: "2026-04-23T15:30:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * INV-04 — POST accept a staff invitation via one-time token
 * No request body required.
 * Token is in the URL path — identity comes from the Bearer JWT.
 *
 * Returns 410 Gone if:
 *   - Token has already been used
 *   - Token has expired (> 72 hours since invitation)
 *   - Invitation was revoked by the admin
 *
 * Returns 409 Conflict if:
 *   - The authenticated user is already a staff member of this masjid
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { token } = await context.params;


        const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    console.log("[INV-04] session:", JSON.stringify(session));
    console.log("[INV-04] cookies:", req.headers.get("cookie"));
    console.log("[INV-04] auth header:", req.headers.get("authorization"));
    

    if (!token || token.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: token." },
        { status: 400 }
      );
    }

    // Basic token format guard — UUIDs or JWT-style tokens expected
    // Prevents obviously malformed or injection-attempt strings
    if (token.length < 16 || token.length > 512) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid invitation token format.",
        },
        { status: 400 }
      );
    }

    return proxyPOST<AcceptInvitationResponse>(
      req,
      `/invitations/${token}/accept`,
      MOCK_ACCEPT_INVITATION
    );
  } catch (error) {
    console.error("[INV-04] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}