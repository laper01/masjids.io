/**
 * Route Handler — Voting Booth · Slate
 *
 * GET  /api/masjids/:masjid_id/elections/slate
 *   → Current/active slate for the masjid (draft or locked).
 *     Auth: Bearer JWT · elections:read
 *
 * POST /api/masjids/:masjid_id/elections/slate
 *   → Create a new slate (draft) for an upcoming election term.
 *     Auth: Bearer JWT · elections:write
 *
 * NOTE: Static segment "slate" resolves before [election_id] dynamic routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type { SlateResponse, CreateSlateRequest } from "@/types/elections";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SLATE: SlateResponse = {
  slate_id: "slate-uuid-0001",
  masjid_id: "c548335b-45f6-4e4f-a160-8bc717682d79",
  label: "2026-2027 Governing Term",
  term_start: 2026,
  term_end: 2027,
  status: "draft",
  candidates_count: 0,
  positions_count: 0,
  created_at: "2026-05-01T09:00:00Z",
  locked_at: null,
};

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id) return NextResponse.json({ success: false, message: "Missing masjid_id." }, { status: 400 });

    return proxyGET<SlateResponse>(req, `/masjids/${masjid_id}/elections/slate`, MOCK_SLATE);
  } catch (error) {
    console.error("[VB-SLATE-GET]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id) return NextResponse.json({ success: false, message: "Missing masjid_id." }, { status: 400 });

    // clone dulu — jangan baca body dari req asli, biar stream tetap utuh utk proxyPOST
    const body = (await req.clone().json()) as CreateSlateRequest;

    if (!body?.label || !body?.term_start || !body?.term_end) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: {
            ...(!body?.label && { label: ["label is required."] }),
            ...(!body?.term_start && { term_start: ["term_start is required."] }),
            ...(!body?.term_end && { term_end: ["term_end is required."] }),
          },
        },
        { status: 422 }
      );
    }

    if (body.term_end <= body.term_start) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { term_end: ["term_end must be after term_start."] } },
        { status: 422 }
      );
    }

    return proxyPOST<SlateResponse>(req, `/masjids/${masjid_id}/elections/slate`, MOCK_SLATE);
  } catch (error) {
    console.error("[VB-SLATE-POST]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}