/**
 * Route Handler — Election Setup · Slate Positions
 *
 * ELS-02  POST /api/masjids/:masjid_id/elections/slate/:slate_id/positions
 *   → Adds a new electable position to an open slate.
 *     Returns 409 if slate is locked, 400 if position_name already exists.
 *     Auth: Bearer JWT · elections:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { CreatePositionResponse, RoleBundle } from "@/types/elections";

interface RouteContext {
  params: Promise<{ masjid_id: string; slate_id: string }>;
}

const VALID_ROLE_BUNDLES: Set<RoleBundle> = new Set([
  "executive_admin", "treasurer", "secretary", "general_council_member",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CREATE_POSITION: CreatePositionResponse = {
  success: true,
  message: "Position added to slate successfully.",
  data: {
    position_id: "pos-uuid-new-0099",
    slate_id: "slate-uuid-0001",
    position_name: "General Secretary",
    role_bundle: "executive_admin",
    status: "pending_draft",
    candidate_count: 0,
    created_at: "2026-05-01T10:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, slate_id } = await context.params;
    if (!masjid_id || !slate_id)
      return NextResponse.json({ success: false, message: "Missing masjid_id or slate_id." }, { status: 400 });

    let body: unknown;
    try {
      body = await req.clone().json();
    } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { position_name, role_bundle, term_start, term_end } = body as Record<string, unknown>;

    if (!position_name || typeof position_name !== "string" || position_name.trim() === "")
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { position_name: ["position_name is required."] } },
        { status: 422 }
      );

    if (!role_bundle || typeof role_bundle !== "string" || !VALID_ROLE_BUNDLES.has(role_bundle as RoleBundle))
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { role_bundle: [`Must be one of: ${[...VALID_ROLE_BUNDLES].join(", ")}.`] } },
        { status: 422 }
      );

    if (!term_start || typeof term_start !== "number")
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { term_start: ["term_start is required."] } },
        { status: 422 }
      );

    if (!term_end || typeof term_end !== "number")
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { term_end: ["term_end is required."] } },
        { status: 422 }
      );

    return proxyPOST<CreatePositionResponse>(req, `/masjids/${masjid_id}/elections/slate/${slate_id}/positions`, MOCK_CREATE_POSITION);
  } catch (error) {
    console.error("[ELS-02]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}