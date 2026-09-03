/**
 * Route Handler — Governance & Elections · Position Role Mapping
 *
 * GOV-01  PUT /api/masjids/:masjid_id/elections/positions/:id/role-mapping
 *   → Maps a specific election position to a role template.
 *     When an election concludes and a winner is determined, the backend's
 *     internal `promoteElectionWinner` job reads this mapping and automatically
 *     assigns the corresponding role template to the winning candidate.
 *
 *     This endpoint configures WHICH role template gets granted to the winner
 *     of WHICH position — it does not trigger the promotion itself.
 *
 *     Mapping is upserted — calling this on an already-mapped position
 *     replaces the previous mapping atomically.
 *
 * Auth: Bearer JWT · elections:manage
 *
 * Path Params:
 *   masjid_id  — the masjid owning this election
 *   id         — the election position ID to configure
 *
 * Request Body:
 *   { role_template_id: string, notes?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPUT } from "@/lib/proxyHelper";
import type { MapElectionRoleResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

/**
 * Realistic mock: mapping the "Chairperson" position to the "Admin" role template.
 * When the Chairperson election closes, the winner is automatically promoted to Admin.
 */
const MOCK_MAP_ELECTION_ROLE: MapElectionRoleResponse = {
  success: true,
  message: "Election position successfully mapped to role template.",
  data: {
    position_id: "pos-uuid-chairperson-0001",
    position_name: "Chairperson",
    role_template_id: "tmpl-admin-0001",
    role_name: "Admin",
    mapped_at: "2026-04-23T13:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * GOV-01 — PUT map an election position to a role template
 * Body: { role_template_id, notes? }
 *
 * Backend behaviour on success:
 *   - Stores the position → role_template mapping
 *   - When promoteElectionWinner job fires (election finalised), it reads this
 *     mapping and calls the permissions/assign-role-template endpoint
 *     on behalf of the system actor, producing an "election_promotion" audit entry
 *
 * Returns 404 if:
 *   - position_id does not belong to this masjid's elections
 *   - role_template_id does not exist or is not accessible to this masjid
 *
 * Returns 409 if the election for this position has already been finalised
 *   (i.e., winner has already been promoted — re-mapping would be ambiguous).
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

    const { role_template_id, notes } = body as Record<string, unknown>;

    // Validate role_template_id
    if (
      !role_template_id ||
      typeof role_template_id !== "string" ||
      role_template_id.trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: {
            role_template_id: ["role_template_id is required."],
          },
        },
        { status: 422 }
      );
    }

    // Validate optional notes
    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: {
            notes: ["notes must be a string when provided."],
          },
        },
        { status: 422 }
      );
    }

    if (typeof notes === "string" && notes.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: {
            notes: ["notes must not exceed 500 characters."],
          },
        },
        { status: 422 }
      );
    }

    return proxyPUT<MapElectionRoleResponse>(
      req,
      `/masjids/${masjid_id}/elections/positions/${id}/role-mapping`,
      MOCK_MAP_ELECTION_ROLE
    );
  } catch (error) {
    console.error("[GOV-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}