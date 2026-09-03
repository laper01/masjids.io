/**
 * Route Handler — User Invitation & Staff Management · Invitations (Collection)
 *
 * INV-02  GET    /api/masjids/:masjid_id/staff/invitations
 *   → Paginated list of all invitations sent for this masjid.
 *     Includes pending, accepted, expired, and revoked invitations.
 *     Useful for the admin "pending invitations" dashboard panel.
 *     Auth: Bearer JWT · members:manage
 *
 * INV-03  DELETE /api/masjids/:masjid_id/staff/invitations/:invite_id
 *   → Revokes a pending invitation. Accepted or expired invitations
 *     cannot be revoked and will return 409.
 *     The invitation token is immediately invalidated server-side.
 *     Auth: Bearer JWT · members:manage
 *
 * Query Params (GET only):
 *   page    number                              — default 1
 *   limit   number                              — default 10, max 50
 *   status  pending | accepted | expired | revoked  — filter by status
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetInvitationsResponse, InvitationStatus } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Valid Enum Values ────────────────────────────────────────────────────────

const VALID_STATUSES: Set<InvitationStatus> = new Set([
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_INVITATIONS_LIST: GetInvitationsResponse = {
  success: true,
  message: "Invitations retrieved successfully.",
  data: [
    {
      invite_id: "inv-uuid-0001",
      email: "hassan.ali@example.com",
      role_template_id: "tmpl-moderator-0002",
      role_name: "Moderator",
      status: "pending",
      expires_at: "2026-04-26T14:00:00Z",
      invited_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
      created_at: "2026-04-23T14:00:00Z",
    },
    {
      invite_id: "inv-uuid-0002",
      email: "yasmin.omar@example.com",
      role_template_id: "tmpl-custom-0005",
      role_name: "Community Outreach Lead",
      status: "pending",
      expires_at: "2026-04-25T10:30:00Z",
      invited_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
      created_at: "2026-04-22T10:30:00Z",
    },
    {
      invite_id: "inv-uuid-0003",
      email: "bilal.hassan@example.com",
      role_template_id: "tmpl-treasurer-0003",
      role_name: "Treasurer",
      status: "accepted",
      expires_at: "2026-04-21T09:00:00Z",
      invited_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
      created_at: "2026-04-18T09:00:00Z",
    },
    {
      invite_id: "inv-uuid-0004",
      email: "nadia.sheikh@example.com",
      role_template_id: "tmpl-webmaster-0004",
      role_name: "Webmaster",
      status: "expired",
      expires_at: "2026-04-15T08:00:00Z",
      invited_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
      created_at: "2026-04-12T08:00:00Z",
    },
    {
      invite_id: "inv-uuid-0005",
      email: "tariq.mahmood@example.com",
      role_template_id: "tmpl-moderator-0002",
      role_name: "Moderator",
      status: "revoked",
      expires_at: "2026-04-13T16:00:00Z",
      invited_by: { id: "usr-uuid-fatima-0002", name: "Fatimah Zahra" },
      created_at: "2026-04-10T16:00:00Z",
    },
  ],
  metadata: {
    total_data: 5,
    total_page: 1,
    page: 1,
    limit: 10,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * INV-02 — GET paginated invitations list
 * Query params: page, limit, status
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: masjid_id." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Validate status filter
    const statusFilter = searchParams.get("status");
    if (statusFilter && !VALID_STATUSES.has(statusFilter as InvitationStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status filter: "${statusFilter}".`,
          errors: {
            status: [`Must be one of: ${[...VALID_STATUSES].join(", ")}.`],
          },
        },
        { status: 422 }
      );
    }

    // Validate pagination
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    if (pageRaw !== null) {
      const page = Number(pageRaw);
      if (!Number.isInteger(page) || page < 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { page: ["page must be a positive integer."] },
          },
          { status: 422 }
        );
      }
    }

    if (limitRaw !== null) {
      const limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { limit: ["limit must be an integer between 1 and 50."] },
          },
          { status: 422 }
        );
      }
    }

    return proxyGET<GetInvitationsResponse>(
      req,
      `/masjids/${masjid_id}/staff/invitations`,
      MOCK_INVITATIONS_LIST
    );
  } catch (error) {
    console.error("[INV-02] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}