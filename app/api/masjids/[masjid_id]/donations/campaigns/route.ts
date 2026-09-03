/**
 * Route Handler — Donation Campaigns · List Resource
 *
 * DON-02  GET  /api/masjids/:masjid_id/donations/campaigns
 * DON-01  POST /api/masjids/:masjid_id/donations/campaigns
 *
 * Field remapping (frontend → backend Go API):
 *   goal_amount   → target_amount
 *   donation_type → is_recurring (bool)
 *   currency      → omitted
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { GetCampaignsResponse } from "@/types/api";

type Params = { params: Promise<{ masjid_id: string }> };

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080/api/v2";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_LIST: GetCampaignsResponse = {
  success: true,
  message: "Campaigns retrieved successfully",
  data: [
    {
      id:            "camp-uuid-0001",
      title:         "Masjid Roof Restoration",
      goal_amount:   25000,
      raised_amount: 18500,
      currency:      "USD",
      donation_type: "both",
      status:        "active",
      progress_pct:  74,
      donor_count:   142,
    },
  ],
  metadata: { total_data: 1, total_page: 1, page: 1, limit: 10 },
};

const MOCK_CREATE = {
  success: true,
  message: "Campaign created successfully",
  data: {
    id:            "camp-new-001",
    masjid_id:     "mock-masjid-id",
    title:         "New Campaign",
    goal_amount:   5000,
    raised_amount: 0,
    currency:      "USD",
    donation_type: "one_time" as const,
    status:        "active"   as const,
    progress_pct:  0,
    donor_count:   0,
    created_at:    new Date().toISOString(),
  },
};

// ─── DON-02 GET ───────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { masjid_id } = await params;
  return proxyGET<GetCampaignsResponse>(
    req,
    `/masjids/${masjid_id}/donations/campaigns`,
    MOCK_LIST
  );
}

// ─── DON-01 POST ──────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { masjid_id } = await params;

  // ── Mock shortcut ─────────────────────────────────────────────────────────
  if (process.env.USE_MOCK_API === "true") {
    return NextResponse.json(MOCK_CREATE);
  }

  // ── Parse frontend body ───────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // ── Remap frontend → backend field names ──────────────────────────────────
  const endDate = body.end_date as string | undefined;
  const remapped: Record<string, unknown> = {
    title:         body.title,
    description:   body.description ?? "",
    target_amount: body.goal_amount,
    is_recurring:  body.donation_type === "recurring",
    end_date: endDate
      ? (endDate.includes("T") ? endDate : `${endDate}T23:59:59Z`)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // ── Resolve Bearer token ──────────────────────────────────────────────────
  // Priority 1: Authorization header already on the incoming request
  // Priority 2: NextAuth session accessToken
  let authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader) {
    const session = await getServerSession(authOptions);
    if (session?.accessToken) {
      authHeader = `Bearer ${session.accessToken}`;
    }
  }

  if (!authHeader) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  // ── Forward to backend ────────────────────────────────────────────────────
  const url = `${BACKEND_BASE}/masjids/${masjid_id}/donations/campaigns`;
  console.log("[DON-01] →", url, JSON.stringify(remapped));

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(remapped),
    });
  } catch (err) {
    console.error("[DON-01] fetch error:", err);
    return NextResponse.json(
      { success: false, message: "Upstream service unavailable." },
      { status: 502 }
    );
  }

  // ── Parse + normalise response ────────────────────────────────────────────
  let json: Record<string, unknown>;
  try {
    json = await upstream.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid response from backend." },
      { status: 502 }
    );
  }

  // Map target_amount → goal_amount so frontend types stay consistent
  if (
    json?.data &&
    typeof json.data === "object" &&
    (json.data as Record<string, unknown>).target_amount !== undefined &&
    (json.data as Record<string, unknown>).goal_amount === undefined
  ) {
    (json.data as Record<string, unknown>).goal_amount =
      (json.data as Record<string, unknown>).target_amount;
  }

  return NextResponse.json(json, { status: upstream.status });
}