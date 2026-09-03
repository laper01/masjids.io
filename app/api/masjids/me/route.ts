/**
 * Route Handler — User's Own Masjids
 *
 * ME-01  GET /api/masjids/me
 *   → Returns masjids created / managed by the authenticated user.
 *     Upstream: GET /api/v2/masjids/me
 *     Auth: Bearer JWT — forwarded automatically by proxyHelper
 *
 * File location: app/api/masjids/me/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { MasjidListResponse } from "@/types/masjid";

// ─── Mock Data (used when USE_MOCK_API=true) ──────────────────────────────────

const MOCK_MY_MASJIDS: MasjidListResponse = {
  success: true,
  message: "Masjids retrieved successfully",
  data: [
    {
      id: "64d60f66-9b91-474e-89f7-bf598851dd84",
      name: "masjid test follow",
      location: "Dearborn, Michigan",
      subDomain: "ica-dearborn1",
      is_verified: true,
      latitude: 42.3486,
      longitude: -83.2359,
      version: 1,
      address: {
        address_line_1: "19500 Ford Rd",
        address_line_2: "",
        city: "Dearborn",
        postal_code: "48128",
        country_code: "US",
      },
      phone_number: { country_code: "1", number: "3135930000" },
      prayer_times_configuration: {
        name: "ISNA Standard - Dearborn",
        method: "NORTH_AMERICA",
        fajr_angle: 15,
        isha_angle: 15,
        isha_interval: 0,
        asr_method: "SHAFI_HANBALI_MALIKI",
        high_latitude_rule: "MIDDLE_OF_THE_NIGHT",
        adjustments: { fajr: 15, dhuhr: 0, asr: 0, maghrib: 0, isha: 15 },
      },
    },
    {
      id: "69791e48-8493-419e-bbd2-7de83d614cff",
      name: "Islamic Center of America yusuf",
      location: "Dearborn, Michigan",
      subDomain: "masjid-yusuf",
      is_verified: true,
      latitude: 42.3486,
      longitude: -83.2359,
      version: 1,
      address: {
        address_line_1: "19500 Ford Rd",
        address_line_2: "",
        city: "Dearborn",
        postal_code: "48128",
        country_code: "US",
      },
      phone_number: { country_code: "1", number: "3135930000" },
      prayer_times_configuration: {
        name: "ISNA Standard - Dearborn",
        method: "NORTH_AMERICA",
        fajr_angle: 15,
        isha_angle: 15,
        isha_interval: 0,
        asr_method: "SHAFI_HANBALI_MALIKI",
        high_latitude_rule: "MIDDLE_OF_THE_NIGHT",
        adjustments: { fajr: 15, dhuhr: 0, asr: 0, maghrib: 0, isha: 15 },
      },
    },
  ],
  // /masjids/me doesn't return pagination but the type requires it
  metadata: { total_data: 2, total_page: 1, page: 1, limit: 10 },
};

// ─── GET /api/masjids/me ──────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // proxyHelper's buildForwardHeaders() automatically copies the
  // Authorization header from the browser request to the upstream call.
  return proxyGET<MasjidListResponse>(req, "/masjids/me", MOCK_MY_MASJIDS);
}