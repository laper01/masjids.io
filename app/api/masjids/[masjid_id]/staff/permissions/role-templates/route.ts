

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type {
  GetRoleTemplatesResponse,
  CreateRoleTemplateResponse,
} from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Valid Permission Scopes Registry ─────────────────────────────────────────
// Keep in sync with the Go backend seed data.

export const VALID_SCOPES = new Set([
  // Masjid profile
  "masjid:profile:edit",
  "masjid:settings:manage",
  // Members
  "members:view",
  "members:manage",
  "members:verify",
  "members:export",
  // Notifications
  "notifications:send",
  "notifications:manage",
  // Announcements
  "announcements:create",
  "announcements:delete",
  // Donations
  "donations:view",
  "donations:manage",
  "donations:report",
  "donations:refund",
  // Payouts
  "payouts:manage",
  // Website
  "website:edit",
  "website:publish",
  "website:domains",
  // Events
  "events:create",
  "events:manage",
  // Facilities
  "facilities:book",
  // Elections
  "elections:create",
  "elections:manage",
  "elections:view_results",
  // Nikkah / Reverts
  "nikkah:moderate",
  "reverts:manage",
  "matchmaking:access",
  // Permissions & Audit
  "permissions:manage",
  "audit:view",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ROLE_TEMPLATES: GetRoleTemplatesResponse = {
  success: true,
  message: "Role templates retrieved successfully.",
  data: [
    {
      id: "dd61fc61-1d6e-44b3-8d80-67f4b966a646",
      name: "President/Admin",
      description: "Full access to all masjid management features",
      permissions: [
        "masjid:profile:edit",
        "masjid:settings:manage",
        "members:view",
        "members:manage",
        "members:verify",
        "members:export",
        "notifications:send",
        "notifications:manage",
        "announcements:create",
        "announcements:delete",
        "donations:view",
        "donations:manage",
        "donations:report",
        "donations:refund",
        "payouts:manage",
        "website:edit",
        "website:publish",
        "website:domains",
        "events:create",
        "events:manage",
        "facilities:book",
        "elections:create",
        "elections:manage",
        "elections:view_results",
        "nikkah:moderate",
        "reverts:manage",
        "matchmaking:access",
        "permissions:manage",
        "audit:view",
      ],
      is_system: true,
      member_count: 0,
      created_at: "2026-04-25T12:54:52.956017Z",
      updated_at: "2026-04-25T14:10:57.491296Z",
      masjid_id: null,
    },
    {
      id: "a2b5f25e-28c2-4036-99d2-3553719f4e31",
      name: "Imam",
      description:
        "Spiritual leader with access to announcements, events, and member directory",
      permissions: [
        "notifications:send",
        "announcements:create",
        "events:create",
        "events:manage",
        "members:view",
        "nikkah:moderate",
        "reverts:manage",
      ],
      is_system: true,
      member_count: 0,
      created_at: "2026-04-25T12:54:52.958469Z",
      updated_at: "2026-04-25T14:10:57.49344Z",
      masjid_id: null,
    },
    {
      id: "b3451751-1f48-44d2-b92e-75142bbf0215",
      name: "Treasurer",
      description:
        "Handles all financial aspects, donations, and payout configurations",
      permissions: [
        "donations:view",
        "donations:manage",
        "donations:report",
        "payouts:manage",
        "donations:refund",
      ],
      is_system: true,
      member_count: 0,
      created_at: "2026-04-25T12:54:52.960062Z",
      updated_at: "2026-04-25T14:10:57.494959Z",
      masjid_id: null,
    },
    {
      id: "355f104c-4364-44f7-b66e-9b4e85832314",
      name: "Comms Officer",
      description:
        "Manages community engagement, notifications, and announcements",
      permissions: [
        "notifications:send",
        "notifications:manage",
        "announcements:create",
        "announcements:delete",
        "members:view",
      ],
      is_system: true,
      member_count: 0,
      created_at: "2026-04-25T12:54:52.961655Z",
      updated_at: "2026-04-25T14:10:57.496387Z",
      masjid_id: null,
    },
    {
      id: "e10b849b-8fa9-4ab3-bd51-3dda5fd71595",
      name: "Webmaster",
      description:
        "Responsible for website content, design, and domain management",
      permissions: [
        "website:edit",
        "website:publish",
        "website:domains",
        "masjid:profile:edit",
      ],
      is_system: true,
      member_count: 0,
      created_at: "2026-04-25T12:54:52.963004Z",
      updated_at: "2026-04-25T14:10:57.497929Z",
      masjid_id: null,
    },
    {
      id: "1e7d689b-47f8-4dec-8d2c-aceec654e0bf",
      name: "Volunteer",
      description:
        "Basic access for helping with events and viewing member lists",
      permissions: ["events:manage", "members:view"],
      is_system: true,
      member_count: 0,
      created_at: "2026-04-25T12:54:52.964392Z",
      updated_at: "2026-04-25T14:10:57.499514Z",
      masjid_id: null,
    },
    {
      id: "0038f067-a675-418e-9e7f-ec6243e7fbd8",
      name: "Member",
      description: "Standard community member with no administrative permissions",
      permissions: [],
      is_system: true,
      member_count: 0,
      created_at: "2026-04-25T12:54:52.965925Z",
      updated_at: "2026-04-25T14:10:57.500921Z",
      masjid_id: null,
    },
  ],
  metadata: {
    total_data: 7,
    total_page: 1,
    page: 1,
    limit: 10,
  },
};

const MOCK_CREATE_ROLE_TEMPLATE: CreateRoleTemplateResponse = {
  success: true,
  message: "Role template created successfully.",
  data: {
    id: "8b1ab823-b1b8-48da-aa65-ee260792343f",
    name: "Social Media Manager",
    description: "Handle community engagement and event announcements",
    permissions: [
      "notifications:send",
      "announcements:create",
      "announcements:delete",
      "events:manage",
    ],
    is_system: false,
    member_count: 0,
    created_at: "2026-04-25T14:27:48.562994Z",
    updated_at: "2026-04-25T14:27:48.562994Z",
    masjid_id: "69791e48-8493-419e-bbd2-7de83d614cff",
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * PERM-01 — GET role templates (paginated)
 * Query params: page, limit, type=system|custom
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

    return proxyGET<GetRoleTemplatesResponse>(
      req,
      `/masjids/${masjid_id}/permissions/role-templates`,
      MOCK_ROLE_TEMPLATES
    );
  } catch (error) {
    console.error("[PERM-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * PERM-02 — POST create a new custom role template
 * Body: { name, description, permissions[] }
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

    return proxyPOST<CreateRoleTemplateResponse>(
      req,
      `/masjids/${masjid_id}/permissions/role-templates`,
      MOCK_CREATE_ROLE_TEMPLATE
    );
  } catch (error) {
    console.error("[PERM-02] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}