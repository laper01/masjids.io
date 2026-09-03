/**
 * Route Handler — Permissions Engine · Role Template (Single Resource)
 *
 * PERM-03  PUT /api/masjids/:masjid_id/permissions/role-templates/:id
 *   → Updates a custom role template and re-evaluates effective permissions
 *     for all members currently assigned to it.
 *     System templates (is_system=true) return 403.
 *
 * Auth: Bearer JWT · members:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPUT } from "@/lib/proxyHelper";
import type { UpdateRoleTemplateResponse } from "@/types/api";
import { VALID_SCOPES } from "../route";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// Shape mirrors the real GET item shape + affected_member_count.

const MOCK_UPDATE_ROLE_TEMPLATE: UpdateRoleTemplateResponse = {
  success: true,
  message: "Role template updated successfully.",
  data: {
    id: "8b1ab823-b1b8-48da-aa65-ee260792343f",
    name: "Community Outreach Lead",
    description: "Updated role to manage both social media and live events",
    permissions: [
      "notifications:send",
      "announcements:create",
      "events:create",
      "members:view",
    ],
    is_system: false,
    member_count: 2,
    affected_member_count: 2,
    created_at: "2026-04-25T14:27:48.562994Z",
    updated_at: "2026-04-23T10:05:00Z",
    masjid_id: "69791e48-8493-419e-bbd2-7de83d614cff",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * PERM-03 — PUT update a custom role template
 * Body: { name, description, permissions[] }
 *
 * Returns 403 if template is a system template.
 * Re-evaluates effective permissions for all affected members immediately.
 */
export async function PUT(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, id } = await context.params;

    if (!masjid_id || !id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters: masjid_id and id.",
        },
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

    const { name, description, permissions } = body as Record<string, unknown>;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { name: ["Name is required."] },
        },
        { status: 422 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { description: ["Description is required."] },
        },
        { status: 422 }
      );
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: {
            permissions: ["At least one permission scope is required."],
          },
        },
        { status: 422 }
      );
    }

    // Validate each scope string against the known registry
    const invalidScopes = (permissions as unknown[]).filter(
      (s) => typeof s !== "string" || !VALID_SCOPES.has(s)
    );
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: {
            permissions: [
              `Unrecognized scope(s): ${invalidScopes.map((s) => `"${s}"`).join(", ")}.`,
            ],
          },
        },
        { status: 422 }
      );
    }

    return proxyPUT<UpdateRoleTemplateResponse>(
      req,
      `/masjids/${masjid_id}/permissions/role-templates/${id}`,
      MOCK_UPDATE_ROLE_TEMPLATE
    );
  } catch (error) {
    console.error("[PERM-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}