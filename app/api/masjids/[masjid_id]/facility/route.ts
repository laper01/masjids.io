/**
 * Route Handler — Masjid Media & Facility · Facility & Capacity
 *
 * DIR-09  GET  /api/masjids/:masjid_id/facility
 *   → Returns prayer hall capacity, amenities, languages, and services.
 *     Returns 404 if facility info has not been set yet.
 *     PUBLIC — no auth required.
 *
 * DIR-10  POST /api/masjids/:masjid_id/facility
 *   → Creates the facility record for the first time.
 *     Returns 409 Conflict if facility data already exists — use PUT (DIR-11).
 *     Auth: Bearer JWT · members:manage
 *
 * DIR-11  PUT  /api/masjids/:masjid_id/facility
 *   → Full replacement of existing facility data (no partial updates).
 *     Returns 404 if no facility record exists — use POST (DIR-10) first.
 *     Read current values via GET (DIR-09) before submitting updates.
 *     Auth: Bearer JWT · members:manage
 *
 * Allowed services:
 *   Halal, Funeral, Nikah, Weekend School, Quran Classes, Youth Programs
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST, proxyPUT } from "@/lib/proxyHelper";
import type {
  GetFacilityResponse,
  CreateFacilityResponse,
  UpdateFacilityResponse,
  FacilityRequest,
  AllowedService,
} from "@/types/media";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Valid Values ─────────────────────────────────────────────────────────────

const ALLOWED_SERVICES: Set<AllowedService> = new Set([
  "Halal",
  "Funeral",
  "Nikah",
  "Weekend School",
  "Quran Classes",
  "Youth Programs",
]);

const AMENITY_KEYS = new Set([
  "parking",
  "wheelchair_accessible",
  "womens_section",
  "ablution_facilities",
  "library",
  "classroom",
  "funeral_services",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_FACILITY_GET: GetFacilityResponse = {
  success: true,
  message: "Facility information retrieved successfully.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    capacity: {
      main_hall: 500,
      womens_section: 150,
      total: 650,
    },
    amenities: {
      parking: true,
      wheelchair_accessible: true,
      womens_section: true,
      ablution_facilities: true,
      library: false,
      classroom: true,
      funeral_services: true,
    },
    languages: ["Indonesian", "Arabic", "English"],
    services: ["Halal", "Funeral", "Nikah", "Weekend School"],
    updated_at: "2026-04-10T08:00:00Z",
  },
};

const MOCK_FACILITY_POST: CreateFacilityResponse = {
  success: true,
  message: "Facility information created successfully.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    capacity: {
      main_hall: 500,
      womens_section: 150,
      total: 650,
    },
    amenities: {
      parking: true,
      wheelchair_accessible: true,
      womens_section: true,
      ablution_facilities: true,
      library: false,
      classroom: true,
      funeral_services: true,
    },
    languages: ["Indonesian", "Arabic", "English"],
    services: ["Halal", "Funeral", "Nikah", "Weekend School"],
    created_at: "2026-05-05T09:00:00Z",
    created_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
  },
};

const MOCK_FACILITY_PUT: UpdateFacilityResponse = {
  success: true,
  message: "Facility information updated successfully.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    capacity: {
      main_hall: 600,
      womens_section: 200,
      total: 800,
    },
    amenities: {
      parking: true,
      wheelchair_accessible: true,
      womens_section: true,
      ablution_facilities: true,
      library: true,
      classroom: true,
      funeral_services: true,
    },
    languages: ["Indonesian", "Arabic", "English", "Sasak"],
    services: ["Halal", "Funeral", "Nikah", "Weekend School", "Quran Classes"],
    updated_at: "2026-05-05T10:00:00Z",
    updated_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
  },
};

// ─── Body Validation Helper ───────────────────────────────────────────────────

function validateFacilityBody(
  body: Record<string, unknown>
): NextResponse | null {
  const { capacity, amenities, languages, services } = body;

  // capacity
  if (!capacity || typeof capacity !== "object" || Array.isArray(capacity)) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed.",
        errors: { capacity: ["capacity must be an object with main_hall, womens_section, and total."] },
      },
      { status: 422 }
    );
  }

  const cap = capacity as Record<string, unknown>;
  for (const field of ["main_hall", "womens_section", "total"]) {
    if (typeof cap[field] !== "number" || (cap[field] as number) < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { [`capacity.${field}`]: [`${field} must be a non-negative number.`] },
        },
        { status: 422 }
      );
    }
  }

  // amenities
  if (!amenities || typeof amenities !== "object" || Array.isArray(amenities)) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed.",
        errors: { amenities: ["amenities must be an object with boolean fields."] },
      },
      { status: 422 }
    );
  }

  const amen = amenities as Record<string, unknown>;
  for (const key of AMENITY_KEYS) {
    if (typeof amen[key] !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { [`amenities.${key}`]: [`${key} must be a boolean.`] },
        },
        { status: 422 }
      );
    }
  }

  // languages
  if (!Array.isArray(languages) || languages.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed.",
        errors: { languages: ["languages must be a non-empty array of strings."] },
      },
      { status: 422 }
    );
  }

  if (languages.some((l) => typeof l !== "string")) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed.",
        errors: { languages: ["All language entries must be strings."] },
      },
      { status: 422 }
    );
  }

  // services
  if (!Array.isArray(services) || services.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed.",
        errors: { services: ["services must be a non-empty array."] },
      },
      { status: 422 }
    );
  }

  const invalidServices = (services as unknown[]).filter(
    (s) => !ALLOWED_SERVICES.has(s as AllowedService)
  );

  if (invalidServices.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed.",
        errors: {
          services: [
            `Invalid service(s): ${invalidServices.join(", ")}. Allowed: ${[...ALLOWED_SERVICES].join(", ")}.`,
          ],
        },
      },
      { status: 422 }
    );
  }

  return null;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * DIR-09 — GET facility information (PUBLIC)
 * Returns 404 if facility has not been set.
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: masjid_id." },
        { status: 400 }
      );
    }

    return proxyGET<GetFacilityResponse>(
      req,
      `/masjids/${masjid_id}/facility`,
      MOCK_FACILITY_GET
    );
  } catch (error) {
    console.error("[DIR-09] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * DIR-10 — POST create facility record (first time only)
 * Body: { capacity, amenities, languages, services }
 * Auth: Bearer JWT · members:manage
 * Returns 409 if facility already exists — use PUT (DIR-11).
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: masjid_id." },
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

    const validationError = validateFacilityBody(body as Record<string, unknown>);
    if (validationError) return validationError;

    return proxyPOST<CreateFacilityResponse>(
      req,
      `/masjids/${masjid_id}/facility`,
      MOCK_FACILITY_POST
    );
  } catch (error) {
    console.error("[DIR-10] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * DIR-11 — PUT full-replace facility record
 * Body: { capacity, amenities, languages, services } — all fields required
 * Auth: Bearer JWT · members:manage
 * Returns 404 if no facility record exists — use POST (DIR-10) first.
 *
 * Full replace semantics: omitting a field resets it to null/false/empty.
 * Fetch current values via GET (DIR-09) before submitting.
 */
export async function PUT(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: masjid_id." },
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

    const validationError = validateFacilityBody(body as Record<string, unknown>);
    if (validationError) return validationError;

    return proxyPUT<UpdateFacilityResponse>(
      req,
      `/masjids/${masjid_id}/facility`,
      MOCK_FACILITY_PUT
    );
  } catch (error) {
    console.error("[DIR-11] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}