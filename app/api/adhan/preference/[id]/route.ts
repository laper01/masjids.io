/**
 * Route Handler — Adhan Preference · Single Resource
 *
 * ADH-09  GET    /api/adhan/preference/[id]
 *   → Retrieve a specific Adhan preference by its ID.
 *
 * ADH-10  PUT    /api/adhan/preference/[id]
 *   → Update an existing Adhan preference.
 *     Body (JSON): { adhan_file_id?, prayer_times_configuration? }
 *
 * ADH-11  DELETE /api/adhan/preference/[id]
 *   → Remove an Adhan preference by its ID.
 *
 * Auth: Bearer JWT (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPUT, proxyDELETE } from "@/lib/proxyHelper";
import type {
  GetAdhanPreferenceDetailResponse,
  UpdateAdhanPreferenceResponse,
  DeleteAdhanPreferenceResponse,
} from "@/types/adhan";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PREFERENCE_DETAIL: GetAdhanPreferenceDetailResponse = {
  success: true,
  message: "Adhan preference retrieved successfully.",
  data: {
    id: "pref-uuid-0001",
    user_id: "user-uuid-0001",
    adhan_file_id: "adhan-uuid-0001",
    prayer_times_configuration: {
      name: "Default Configuration",
      method: "MUSLIM_WORLD_LEAGUE",
      asr_method: "SHAFI_HANBALI_MALIKI",
      high_latitude_rule: "MIDDLE_OF_THE_NIGHT",
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    },
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-04-15T08:30:00Z",
  },
};

const MOCK_UPDATE_PREFERENCE: UpdateAdhanPreferenceResponse = {
  success: true,
  message: "Adhan preference updated successfully.",
  data: {
    id: "pref-uuid-0001",
    user_id: "user-uuid-0001",
    adhan_file_id: "adhan-uuid-0001",
    prayer_times_configuration: {
      name: "Default Configuration",
      method: "MUSLIM_WORLD_LEAGUE",
      asr_method: "SHAFI_HANBALI_MALIKI",
      high_latitude_rule: "MIDDLE_OF_THE_NIGHT",
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    },
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-05-01T09:00:00Z",
  },
};

const MOCK_DELETE_PREFERENCE: DeleteAdhanPreferenceResponse = {
  success: true,
  message: "Adhan preference deleted successfully.",
  data: {
    id: "pref-uuid-0001",
    deleted: true,
    deleted_at: "2026-05-01T09:00:00Z",
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * ADH-09 — GET a single Adhan preference by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    return proxyGET<GetAdhanPreferenceDetailResponse>(
      req,
      `/adhan/preference/${id}`,
      MOCK_PREFERENCE_DETAIL
    );
  } catch (error) {
    console.error("[ADH-09] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * ADH-10 — PUT update an Adhan preference by ID
 * Body (JSON): { adhan_file_id?, prayer_times_configuration? }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    return proxyPUT<UpdateAdhanPreferenceResponse>(
      req,
      `/adhan/preference/${id}`,
      MOCK_UPDATE_PREFERENCE
    );
  } catch (error) {
    console.error("[ADH-10] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * ADH-11 — DELETE an Adhan preference by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    return proxyDELETE<DeleteAdhanPreferenceResponse>(
      req,
      `/adhan/preference/${id}`,
      MOCK_DELETE_PREFERENCE
    );
  } catch (error) {
    console.error("[ADH-11] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}