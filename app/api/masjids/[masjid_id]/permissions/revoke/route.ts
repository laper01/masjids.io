/**
 * Route Handler — Permissions Engine · Revoke Permission
 *
 * PERM-05  POST /api/masjids/:masjid_id/permissions/revoke
 *   → Revokes an individual permission scope from a member.
 *     Can revoke template-inherited scopes (override) or individually granted scopes.
 *     Creates an audit log entry.
 *
 * Auth: Bearer JWT · members:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { RevokePermissionResponse } from "@/types/api";
import { VALID_SCOPES } from "../role-templates/route";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_REVOKE_PERMISSION: RevokePermissionResponse = {
  success: true,
  message: "Permission scope revoked successfully.",
  data: {
    user_id: "8672bfdf-45c9-427f-97d9-31afa8adfb88",
    scope: "notifications:send",
    action: "revoked",
    effective_scopes: ["members:view", "donations:manage"],
    audit_entry_id: "audit-uuid-0012",
    revoked_at: "2026-04-23T10:15:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * PERM-05 — POST revoke an individual permission scope from a member
 * Body: { user_id, scope, reason }
 *
 * Adds scope to the member's revoked_scopes override list.
 * Effective permission computation at middleware layer respects this override.
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

    const { user_id, scope, reason } = body as Record<string, unknown>;

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

    if (!scope || typeof scope !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { scope: ["scope is required."] },
        },
        { status: 422 }
      );
    }

    if (!VALID_SCOPES.has(scope)) {
      return NextResponse.json(
        {
          success: false,
          message: `Unrecognized permission scope: "${scope}".`,
          errors: { scope: [`"${scope}" is not a valid permission scope.`] },
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

    return proxyPOST<RevokePermissionResponse>(
      req,
      `/masjids/${masjid_id}/permissions/revoke`,
      MOCK_REVOKE_PERMISSION
    );
  } catch (error) {
    console.error("[PERM-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}