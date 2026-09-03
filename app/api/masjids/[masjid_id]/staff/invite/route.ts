/**
 * Route Handler — User Invitation & Staff Management · Send Invitation
 *
 * INV-01  POST /api/masjids/:masjid_id/staff/invite
 *   → Sends an email invitation to a user to join the masjid as staff.
 *     Creates a time-limited invitation token (expires in 72 hours).
 *     The invited user receives an email with a link containing the token.
 *     Inviting the same email again while a pending invitation exists
 *     returns 409 — revoke the existing invitation first.
 *
 * Auth: Bearer JWT · members:manage
 *
 * Request Body:
 *   {
 *     email:            string   — recipient email address
 *     role_template_id: string   — role to grant upon acceptance
 *     role_name:        string   — display name for the role (shown in email)
 *     message?:         string   — optional personal message in the email (max 500 chars)
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { InviteStaffResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_INVITE_STAFF: InviteStaffResponse = {
  success: true,
  message: "Invitation sent successfully. The invitee has 72 hours to accept.",
  data: {
    invite_id: "inv-uuid-0001",
    email: "hassan.ali@example.com",
    role_template_id: "tmpl-moderator-0002",
    role_name: "Moderator",
    status: "pending",
    expires_at: "2026-04-26T14:00:00Z",
    invited_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
    created_at: "2026-04-23T14:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * INV-01 — POST send a staff invitation email
 * Body: { email, role_template_id, role_name, message? }
 */
export async function POST(
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

    let body: unknown;
    try {
      body = await req.clone().json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const { email, role_template_id, role_name, message } =
      body as Record<string, unknown>;

    // email
    if (!email || typeof email !== "string" || email.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { email: ["email is required."] },
        },
        { status: 422 }
      );
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { email: ["email must be a valid email address."] },
        },
        { status: 422 }
      );
    }

    // role_template_id
    if (
      !role_template_id ||
      typeof role_template_id !== "string" ||
      role_template_id.trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { role_template_id: ["role_template_id is required."] },
        },
        { status: 422 }
      );
    }

    // role_name
    if (
      !role_name ||
      typeof role_name !== "string" ||
      role_name.trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { role_name: ["role_name is required."] },
        },
        { status: 422 }
      );
    }

    // optional message
    if (message !== undefined && message !== null) {
      if (typeof message !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { message: ["message must be a string when provided."] },
          },
          { status: 422 }
        );
      }
      if (message.length > 500) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { message: ["message must not exceed 500 characters."] },
          },
          { status: 422 }
        );
      }
    }

    return proxyPOST<InviteStaffResponse>(
      req,
      `/masjids/${masjid_id}/staff/invite`,
      MOCK_INVITE_STAFF
    );
  } catch (error) {
    console.error("[INV-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}