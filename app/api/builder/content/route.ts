// File: app/api/builder/content/route.ts

/**
 * Route Handler — Web Builder · Layout
 *
 * BLD-01  GET  /api/builder/content?masjid_id=xxx
 *   → Retrieve the current layout for a masjid.
 *
 * BLD-02  PUT  /api/builder/content?masjid_id=xxx
 *   → Save/update the layout (proxied as PATCH to backend).
 *
 * Auth: Bearer JWT (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPATCH } from "@/lib/proxyHelper";
import type { GetLayoutResponse, UpdateLayoutResponse } from "@/types/builder";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_GET_LAYOUT: GetLayoutResponse = {
  success: true,
  message: "Layout retrieved successfully.",
  data: {
    layout: {
      root: {
        type: "div",
        props: { style: { padding: "16px" } },
        children: [
          {
            type: "HeaderComponent",
            props: { text: "Welcome to Our Masjid" },
            children: [],
          },
          {
            type: "ParagraphComponent",
            props: { text: "Join us for daily prayers." },
            children: [],
          },
        ],
      },
    },
    version: 1,
    layoutUpdatedAt: "2026-05-01T10:00:00Z",
    publishedAt: null,
  },
};

const MOCK_UPDATE_LAYOUT: UpdateLayoutResponse = {
  success: true,
  message: "Layout updated successfully.",
  data: {
    layout: {
      root: {
        type: "div",
        props: { style: { padding: "16px" } },
        children: [],
      },
    },
    version: 2,
    layoutUpdatedAt: "2026-05-16T10:00:00Z",
    publishedAt: null,
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * BLD-01 — GET layout for a masjid
 * Query params: masjid_id (required)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const masjid_id = searchParams.get("masjid_id");

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "masjid_id is required." },
        { status: 400 }
      );
    }

    return proxyGET<GetLayoutResponse>(
      req,
      `/masjids/${masjid_id}/layout`,
      MOCK_GET_LAYOUT
    );
  } catch (error) {
    console.error("[BLD-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * BLD-02 — PUT (proxied as PATCH) update layout for a masjid
 * Query params: masjid_id (required)
 * Body: { layout, version }
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const masjid_id = searchParams.get("masjid_id");

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "masjid_id is required." },
        { status: 400 }
      );
    }

    return proxyPATCH<UpdateLayoutResponse>(
      req,
      `/masjids/${masjid_id}/layout`,
      MOCK_UPDATE_LAYOUT
    );
  } catch (error) {
    console.error("[BLD-02] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}