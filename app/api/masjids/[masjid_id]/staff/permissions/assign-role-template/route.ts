/**
 * Route Handler — Permissions Engine · Assign Role Template
 *
 * PERM-06  POST /api/masjids/:masjid_id/permissions/assign-role-template
 *   → Assigns a role template to a member, computing their full effective
 *     permission set. Replaces any previously assigned template atomically.
 *     Individual granted/revoked overrides are preserved.
 *     Writes an audit log entry. Primary permission-provisioning endpoint.
 *
 * Auth: Bearer JWT · members:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { AssignRoleTemplateResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// NOTE: granted_overrides and revoked_overrides are null when no individual
// overrides exist — match this in AssignRoleTemplateResponse type.

const MOCK_ASSIGN_ROLE_TEMPLATE: AssignRoleTemplateResponse = {
  success: true,
  message: "Role assigned successfully.",
  data: {
    user_id: "74af0b60-98b4-4476-b662-40deeb60de70",
    role_template_id: "8b1ab823-b1b8-48da-aa65-ee260792343f",
    role_name: "Social Media Manager",
    effective_scopes: [
      "announcements:create",
      "announcements:delete",
      "events:manage",
      "notifications:send",
    ],
    // Real API returns null when no individual overrides exist
    granted_overrides: null,
    revoked_overrides: null,
    audit_entry_id: "558414b5-684e-4161-9858-10a915d145fd",
    assigned_at: "2026-04-25T14:31:16.882373Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * PERM-06 — POST assign a role template to a member
 * Body: { user_id, role_template_id, reason }
 *
 * Previous template assignment is atomically replaced.
 * Returns 404 if template_id does not belong to this masjid or is not a system template.
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

    const { user_id, role_template_id, reason } = body as Record<
      string,
      unknown
    >;

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { user_id: ["user_id is required."] },
        },
        { status: 422 }
      );
    }

    if (!role_template_id || typeof role_template_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { role_template_id: ["role_template_id is required."] },
        },
        { status: 422 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { reason: ["A reason is required for audit purposes."] },
        },
        { status: 422 }
      );
    }

    return proxyPOST<AssignRoleTemplateResponse>(
      req,
      `/masjids/${masjid_id}/permissions/assign-role-template`,
      MOCK_ASSIGN_ROLE_TEMPLATE
    );
  } catch (error) {
    console.error("[PERM-06] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}