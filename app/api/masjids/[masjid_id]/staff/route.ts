/**
 * Route Handler — User Invitation & Staff Management · Staff Members (Collection)
 *
 * INV-05  GET    /api/masjids/:masjid_id/staff
 *   → Paginated list of all active staff members for this masjid.
 *     Includes role, effective scope count, and join date.
 *     Filterable by role_template_id or name search.
 *     Auth: Bearer JWT · members:view
 *
 * INV-06  DELETE /api/masjids/:masjid_id/staff/:user_id
 *   → Removes a staff member from the masjid, revoking all their permissions.
 *     Hard removal — all granted/revoked overrides and role assignments
 *     for this masjid are cleared. Creates an audit log entry.
 *     An admin cannot remove themselves via this endpoint (returns 403).
 *     Auth: Bearer JWT · members:manage
 *
 * Query Params (GET only):
 *   page              number  — default 1
 *   limit             number  — default 10, max 50
 *   search            string  — partial match on name or email
 *   role_template_id  string  — filter to members with this role template
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetStaffResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_STAFF_LIST: GetStaffResponse = {
  success: true,
  message: "Staff members retrieved successfully.",
  data: [
    {
      user_id: "usr-admin-ahmed-001",
      name: "Ahmed Khalil",
      email: "ahmed.khalil@masjidalnoor.org",
      avatar_url: "https://avatars.masjids.io/usr-admin-ahmed-001.jpg",
      role_template_id: "tmpl-admin-0001",
      role_name: "Admin",
      effective_scope_count: 7,
      joined_at: "2024-01-01T00:00:00Z",
    },
    {
      user_id: "usr-uuid-fatima-0002",
      name: "Fatimah Zahra",
      email: "fatimah.zahra@masjidalnoor.org",
      avatar_url: "https://avatars.masjids.io/usr-uuid-fatima-0002.jpg",
      role_template_id: "tmpl-admin-0001",
      role_name: "Admin",
      effective_scope_count: 7,
      joined_at: "2026-04-20T09:00:00Z",
    },
    {
      user_id: "usr-uuid-zubair-0001",
      name: "Zubair Malik",
      email: "zubair.malik@example.com",
      avatar_url: "https://avatars.masjids.io/usr-uuid-zubair-0001.jpg",
      role_template_id: "tmpl-treasurer-0003",
      role_name: "Treasurer",
      effective_scope_count: 3,
      joined_at: "2026-04-23T10:20:00Z",
    },
    {
      user_id: "usr-uuid-bilal-0003",
      name: "Bilal Hassan",
      email: "bilal.hassan@example.com",
      avatar_url: "https://avatars.masjids.io/usr-uuid-bilal-0003.jpg",
      role_template_id: "tmpl-custom-0005",
      role_name: "Community Outreach Lead",
      effective_scope_count: 2,
      joined_at: "2026-04-18T09:00:00Z",
    },
    {
      user_id: "usr-uuid-safiya-0010",
      name: "Safiyah Ndiaye",
      email: "safiyah.ndiaye@example.com",
      avatar_url: "https://avatars.masjids.io/usr-uuid-safiya-0010.jpg",
      role_template_id: "tmpl-moderator-0002",
      role_name: "Moderator",
      effective_scope_count: 3,
      joined_at: "2026-03-05T11:00:00Z",
    },
    {
      user_id: "usr-uuid-ibrahim-0009",
      name: "Ibrahim Al-Amin",
      email: "ibrahim.alamin@example.com",
      avatar_url: "https://avatars.masjids.io/usr-uuid-ibrahim-0009.jpg",
      role_template_id: "tmpl-webmaster-0004",
      role_name: "Webmaster",
      effective_scope_count: 2,
      joined_at: "2026-02-20T08:30:00Z",
    },
    {
      user_id: "usr-uuid-maryam-0008",
      name: "Maryam Idris",
      email: "maryam.idris@example.com",
      avatar_url: "https://avatars.masjids.io/usr-uuid-maryam-0008.jpg",
      role_template_id: "tmpl-moderator-0002",
      role_name: "Moderator",
      effective_scope_count: 3,
      joined_at: "2026-01-15T13:45:00Z",
    },
  ],
  metadata: {
    total_data: 7,
    total_page: 1,
    page: 1,
    limit: 10,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * INV-05 — GET paginated staff members list
 * Query params: page, limit, search, role_template_id
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

    // Validate search length guard
    const search = searchParams.get("search");
    if (search !== null && search.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { search: ["search query must not exceed 100 characters."] },
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

    return proxyGET<GetStaffResponse>(
      req,
      `/masjids/${masjid_id}/staff`,
      MOCK_STAFF_LIST
    );
  } catch (error) {
    console.error("[INV-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}