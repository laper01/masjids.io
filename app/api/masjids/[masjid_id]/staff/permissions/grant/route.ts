/**
 * Route Handler — Permissions Engine · Grant Permission
 *
 * PERM-04  POST /api/masjids/:masjid_id/permissions/grant
 *   → Grants an individual permission scope override to a specific member.
 *     Additive on top of their role template.
 *     Creates an audit log entry with actor, target, scope, and reason.
 *
 * Auth: Bearer JWT · members:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { GrantPermissionResponse } from "@/types/api";
import { VALID_SCOPES } from "../role-templates/route";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_GRANT_PERMISSION: GrantPermissionResponse = {
  success: true,
  message: "Permission scope granted successfully.",
  data: {
    user_id: "8672bfdf-45c9-427f-97d9-31afa8adfb88",
    scope: "notifications:send",
    action: "granted",
    effective_scopes: [
      "notifications:send",
      "members:view",
      "donations:manage",
    ],
    audit_entry_id: "audit-uuid-0011",
    granted_at: "2026-04-23T10:10:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * PERM-04 — POST grant an individual permission scope to a member
 * Body: { user_id, scope, reason }
 *
 * Returns 422 if scope is invalid or already in user's effective permission set.
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

    return proxyPOST<GrantPermissionResponse>(
      req,
      `/masjids/${masjid_id}/permissions/grant`,
      MOCK_GRANT_PERMISSION
    );
  } catch (error) {
    console.error("[PERM-04] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}