/**
 * app/api/timezone/route.ts
 *
 * Returns IANA timezone name for lat/lng — NO external library needed.
 * Uses a hardcoded lat/lng bounding-box table as primary (instant, no network),
 * falls back to timeapi.io (free, no API key), then Etc/GMT offset as last resort.
 *
 * Response: { tz_name: "America/New_York", source: "table" | "timeapi" | "fallback" }
 */

import { NextResponse } from "next/server";

// Bounding-box table: [minLat, maxLat, minLng, maxLng, "IANA/Timezone"]
// Ordered from most specific to least specific.
const TZ_TABLE: [number, number, number, number, string][] = [
  // USA
  [24, 50, -90, -66,   "America/New_York"],
  [24, 50, -105, -90,  "America/Chicago"],
  [24, 50, -115, -105, "America/Denver"],
  [24, 50, -125, -115, "America/Los_Angeles"],
  [42, 60, -66, -59,   "America/Halifax"],
  // Mexico
  [14, 32, -100, -86,  "America/Mexico_City"],
  // Brazil
  [-35, 5, -55, -35,   "America/Sao_Paulo"],
  // Argentina
  [-55, -21, -74, -53, "America/Argentina/Buenos_Aires"],
  // UK / Ireland
  [49, 61, -11, 2,     "Europe/London"],
  // Western Europe
  [35, 72, 2, 20,      "Europe/Paris"],
  // Eastern Europe
  [35, 72, 20, 40,     "Europe/Helsinki"],
  // Turkey
  [35, 45, 26, 45,     "Europe/Istanbul"],
  // Morocco
  [27, 36, -14, -1,    "Africa/Casablanca"],
  // Egypt
  [21, 32, 24, 37,     "Africa/Cairo"],
  // Nigeria / West Africa
  [3, 14, 2, 15,       "Africa/Lagos"],
  // East Africa
  [-12, 15, 33, 52,    "Africa/Nairobi"],
  // South Africa
  [-35, -22, 16, 33,   "Africa/Johannesburg"],
  // Gulf states (Saudi, Kuwait, Bahrain, Qatar, Iraq, Yemen)
  [12, 32, 38, 51,     "Asia/Riyadh"],
  // UAE
  [22, 27, 51, 57,     "Asia/Dubai"],
  // Pakistan
  [23, 38, 60, 78,     "Asia/Karachi"],
  // India
  [6, 37, 68, 98,      "Asia/Kolkata"],
  // Bangladesh
  [20, 27, 88, 93,     "Asia/Dhaka"],
  // Indonesia — WIB (Jakarta, Sumatra, Kalimantan Barat/Tengah)
  [-9, 7, 95, 116,     "Asia/Jakarta"],
  // Indonesia — WITA (Bali, NTB, NTT, Sulawesi, Kalimantan Timur)
  [-11, 5, 115, 125,   "Asia/Makassar"],
  // Indonesia — WIT (Maluku, Papua)
  [-11, 5, 124, 141,   "Asia/Jayapura"],
  // Malaysia / Singapore
  [0, 8, 99, 120,      "Asia/Kuala_Lumpur"],
  // Philippines
  [4, 22, 116, 128,    "Asia/Manila"],
  // China / HK / Taiwan
  [18, 55, 73, 135,    "Asia/Shanghai"],
  // Japan / Korea
  [30, 46, 126, 148,   "Asia/Tokyo"],
  // Australia East
  [-44, -10, 141, 154, "Australia/Sydney"],
  // Australia Central
  [-36, -10, 129, 141, "Australia/Darwin"],
  // Australia West
  [-36, -10, 113, 129, "Australia/Perth"],
];

function lookupTable(lat: number, lng: number): string | null {
  for (const [minLat, maxLat, minLng, maxLng, tz] of TZ_TABLE) {
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return tz;
    }
  }
  return null;
}

async function fetchTimeApi(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const tz: string = data?.timeZone ?? "";
    return tz.includes("/") ? tz : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const fromTable = lookupTable(lat, lng);
  if (fromTable) {
    return NextResponse.json({ tz_name: fromTable, source: "table" });
  }

  const fromApi = await fetchTimeApi(lat, lng);
  if (fromApi) {
    return NextResponse.json({ tz_name: fromApi, source: "timeapi" });
  }

  // Last resort — NOT DST-aware
  const offsetHours = Math.round(lng / 15);
  const sign = offsetHours >= 0 ? "-" : "+";
  return NextResponse.json({
    tz_name: `Etc/GMT${sign}${Math.abs(offsetHours)}`,
    source: "fallback",
  });
}