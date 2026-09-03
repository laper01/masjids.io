/**
 * Route Handler — Adhan Preference · Collection
 *
 * ADH-06  GET /api/adhan/preference?by=user
 *   → Retrieve all Adhan preferences belonging to the authenticated user.
 *     Actor is derived from the Bearer JWT — no path param needed.
 *
 * ADH-07  GET /api/adhan/preference?by=masjid&masjid_id={id}
 *   → Retrieve all Adhan preferences for a specific masjid.
 *
 * ADH-08  POST /api/adhan/preference
 *   → Create a new Adhan preference.
 *     Body (JSON): { adhan_file_id, prayer_times_configuration }
 *
 * Auth: Bearer JWT (required)
 *
 * Query Params (GET):
 *   by         "user" | "masjid"  — required, selects the lookup mode
 *   masjid_id  string             — required when by=masjid
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type {
  GetAdhanPreferenceByUserResponse,
  GetAdhanPreferenceByMasjidResponse,
  CreateAdhanPreferenceResponse,
  AdhanPreference,
} from "@/types/adhan";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PREFERENCE: AdhanPreference = {
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
};

const MOCK_PREFERENCE_LIST: GetAdhanPreferenceByUserResponse = {
  success: true,
  message: "Adhan preferences retrieved successfully.",
  data: [
    MOCK_PREFERENCE,
    {
      id: "pref-uuid-0002",
      user_id: "user-uuid-0001",
      adhan_file_id: "adhan-uuid-0002",
      prayer_times_configuration: {
        name: "Custom Karachi",
        method: "KARACHI",
        asr_method: "HANAFI",
        high_latitude_rule: "SEVENTH_OF_THE_NIGHT",
        adjustments: { fajr: -2, dhuhr: 0, asr: 3, maghrib: 0, isha: -1 },
      },
      created_at: "2026-03-10T14:00:00Z",
      updated_at: "2026-03-10T14:00:00Z",
    },
  ],
  metadata: {
    total_data: 2,
    total_page: 1,
    page: 1,
    limit: 10,
  },
};

const MOCK_CREATE_PREFERENCE: CreateAdhanPreferenceResponse = {
  success: true,
  message: "Adhan preference created successfully.",
  data: MOCK_PREFERENCE,
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * ADH-06 / ADH-07 — GET Adhan preferences (by user or by masjid)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const by = searchParams.get("by");
    const masjidId = searchParams.get("masjid_id");

    if (by === "user") {
      return proxyGET<GetAdhanPreferenceByUserResponse>(
        req,
        `/adhan/preference/by-user-id`,
        MOCK_PREFERENCE_LIST
      );
    }

    if (by === "masjid") {
      if (!masjidId) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: {
              masjid_id: ["masjid_id is required when by=masjid."],
            },
          },
          { status: 422 }
        );
      }

      return proxyGET<GetAdhanPreferenceByMasjidResponse>(
        req,
        `/adhan/preference/by-masjid-id/${masjidId}`,
        MOCK_PREFERENCE_LIST
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Validation failed.",
        errors: {
          by: ['Missing or invalid query param "by". Use ?by=user or ?by=masjid&masjid_id={id}.'],
        },
      },
      { status: 422 }
    );
  } catch (error) {
    console.error("[ADH-06/07] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * ADH-08 — POST create a new Adhan preference
 * Body (JSON): { adhan_file_id, prayer_times_configuration }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    return proxyPOST<CreateAdhanPreferenceResponse>(
      req,
      `/adhan/preference`,
      MOCK_CREATE_PREFERENCE
    );
  } catch (error) {
    console.error("[ADH-08] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}