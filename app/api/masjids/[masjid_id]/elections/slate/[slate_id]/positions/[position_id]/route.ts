/**
 * Route Handler — Election Setup · Position Single Resource
 *
 * ELS-08  GET /api/masjids/:masjid_id/elections/slate/:slate_id/positions/:position_id
 *   → Full detail of a single position including candidates.
 *     Lightweight alternative to loading the full slate (ELS-07).
 *     Auth: Bearer JWT · elections:read
 *
 * ELS-03  PUT /api/masjids/:masjid_id/elections/slate/:slate_id/positions/:position_id
 *   → Updates name, role_bundle, or term window of a position.
 *     Partial updates supported — omitted fields retain existing values.
 *     Returns 423 Locked if slate is locked.
 *     Auth: Bearer JWT · elections:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPUT } from "@/lib/proxyHelper";
import type {
  GetPositionDetailResponse,
  UpdatePositionResponse,
  RoleBundle,
} from "@/types/elections";

interface RouteContext {
  params: Promise<{ masjid_id: string; slate_id: string; position_id: string }>;
}

const VALID_ROLE_BUNDLES: Set<RoleBundle> = new Set([
  "executive_admin", "treasurer", "secretary", "general_council_member",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_POSITION_DETAIL: GetPositionDetailResponse = {
  success: true,
  message: "Position retrieved successfully.",
  data: {
    position_id: "pos-uuid-0001",
    slate_id: "slate-uuid-0001",
    position_name: "General Secretary",
    role_bundle: "executive_admin",
    status: "locked",
    term_start: 2026,
    term_end: 2027,
    candidate_count: 3,
    candidates: [
      { user_id: "usr-ahmed-khan", name: "Ahmed Khan" },
      { user_id: "usr-sarah-alfarsi", name: "Sarah Al-Farsi" },
      { user_id: "usr-omar-siddiqui", name: "Omar Siddiqui" },
    ],
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-05-02T12:00:00Z",
  },
};

const MOCK_UPDATE_POSITION: UpdatePositionResponse = {
  success: true,
  message: "Position updated successfully.",
  data: {
    position_id: "pos-uuid-0001",
    position_name: "Educational Director",
    role_bundle: "secretary",
    status: "pending_draft",
    updated_at: "2026-05-02T11:00:00Z",
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, slate_id, position_id } = await context.params;
    if (!masjid_id || !slate_id || !position_id)
      return NextResponse.json({ success: false, message: "Missing required path parameters." }, { status: 400 });

    return proxyGET<GetPositionDetailResponse>(req, `/masjids/${masjid_id}/elections/slate/${slate_id}/positions/${position_id}`, MOCK_POSITION_DETAIL);
  } catch (error) {
    console.error("[ELS-08]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, slate_id, position_id } = await context.params;
    if (!masjid_id || !slate_id || !position_id)
      return NextResponse.json({ success: false, message: "Missing required path parameters." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { position_name, role_bundle, term_start, term_end } = body as Record<string, unknown>;

    // At least one field must be provided
    if (position_name === undefined && role_bundle === undefined && term_start === undefined && term_end === undefined)
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { body: ["At least one field must be provided for update."] } }, { status: 422 });

    if (position_name !== undefined && (typeof position_name !== "string" || (position_name as string).trim() === ""))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { position_name: ["position_name must be a non-empty string."] } }, { status: 422 });

    if (role_bundle !== undefined && !VALID_ROLE_BUNDLES.has(role_bundle as RoleBundle))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { role_bundle: [`Must be one of: ${[...VALID_ROLE_BUNDLES].join(", ")}.`] } }, { status: 422 });

    return proxyPUT<UpdatePositionResponse>(req, `/masjids/${masjid_id}/elections/slate/${slate_id}/positions/${position_id}`, MOCK_UPDATE_POSITION);
  } catch (error) {
    console.error("[ELS-03]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
