/**
 * Route Handler — Masjid Media & Facility · Cover Photo
 *
 * DIR-03  GET  /api/masjids/:masjid_id/photo/cover
 *   → Returns current cover photo URL, dimensions, and upload metadata.
 *     Returns 404 if no cover photo has been set yet.
 *     PUBLIC — no auth required.
 *
 * DIR-04  POST /api/masjids/:masjid_id/photo/cover
 *   → Uploads the first cover photo for a masjid.
 *     Accepts multipart/form-data with a single image file.
 *     Replaces any existing cover photo and purges old CDN file.
 *     Auth: Bearer JWT · members:manage
 *
 * DIR-05  PUT  /api/masjids/:masjid_id/photo/cover
 *   → Replaces the existing cover photo.
 *     Returns 404 if no cover photo exists — use POST (DIR-04) first.
 *     Auth: Bearer JWT · members:manage
 *
 * File constraints (POST + PUT):
 *   - Format: JPEG, PNG, WEBP only
 *   - Max size: 5 MB (5,242,880 bytes)
 *   - Recommended dimensions: 1200×400 px (3:1 ratio)
 *
 * NOTE on multipart/form-data in the BFF layer:
 *   The proxyRequest helper forwards the raw request body and headers
 *   (including Content-Type: multipart/form-data; boundary=...) directly
 *   to the backend. No server-side file parsing happens in the BFF —
 *   validation here is limited to what can be inferred from headers.
 *   The backend performs actual file validation (size, type, dimensions).
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST, proxyPUT } from "@/lib/proxyHelper";
import type {
  GetCoverPhotoResponse,
  UploadCoverPhotoResponse,
  UpdateCoverPhotoResponse,
} from "@/types/media";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_COVER_PHOTO_GET: GetCoverPhotoResponse = {
  success: true,
  message: "Cover photo retrieved successfully.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    cover_photo_url:
      "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/cover.jpg",
    file_name: "cover.jpg",
    file_size_bytes: 204800,
    width: 1200,
    height: 400,
    uploaded_at: "2026-05-01T10:00:00Z",
    uploaded_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
  },
};

const MOCK_COVER_PHOTO_POST: UploadCoverPhotoResponse = {
  success: true,
  message: "Cover photo uploaded successfully.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    cover_photo_url:
      "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/cover.jpg",
    file_name: "cover.jpg",
    file_size_bytes: 204800,
    width: 1200,
    height: 400,
    uploaded_at: "2026-05-05T09:00:00Z",
    uploaded_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
  },
};

const MOCK_COVER_PHOTO_PUT: UpdateCoverPhotoResponse = {
  success: true,
  message: "Cover photo updated successfully.",
  data: {
    masjid_id: "msj-uuid-al-noor-0001",
    cover_photo_url:
      "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/cover_v2.jpg",
    file_name: "cover_v2.jpg",
    file_size_bytes: 180000,
    width: 1200,
    height: 400,
    updated_at: "2026-05-05T10:00:00Z",
    updated_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
  },
};

// ─── Multipart Validation Helper ──────────────────────────────────────────────

/**
 * Lightweight pre-check on multipart requests.
 * Verifies Content-Type header is multipart/form-data.
 * Actual file content validation (size, type, dimensions) is done by the backend.
 */
function validateMultipartContentType(req: NextRequest): NextResponse | null {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        success: false,
        message: "Request must use Content-Type: multipart/form-data.",
        errors: {
          file: ["Request must be sent as multipart/form-data with a file field."],
        },
      },
      { status: 415 }
    );
  }
  return null;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * DIR-03 — GET cover photo (PUBLIC)
 * Returns 404 if no cover photo has been set.
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

    return proxyGET<GetCoverPhotoResponse>(
      req,
      `/masjids/${masjid_id}/photo/cover`,
      MOCK_COVER_PHOTO_GET
    );
  } catch (error) {
    console.error("[DIR-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * DIR-04 — POST upload first cover photo
 * Body: multipart/form-data { file: <image> }
 * Auth: Bearer JWT · members:manage
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

    const contentTypeError = validateMultipartContentType(req);
    if (contentTypeError) return contentTypeError;

    return proxyPOST<UploadCoverPhotoResponse>(
      req,
      `/masjids/${masjid_id}/photo/cover`,
      MOCK_COVER_PHOTO_POST
    );
  } catch (error) {
    console.error("[DIR-04] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * DIR-05 — PUT replace existing cover photo
 * Body: multipart/form-data { file: <image> }
 * Auth: Bearer JWT · members:manage
 * Returns 404 if no cover photo exists — use POST (DIR-04) first.
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

    const contentTypeError = validateMultipartContentType(req);
    if (contentTypeError) return contentTypeError;

    return proxyPUT<UpdateCoverPhotoResponse>(
      req,
      `/masjids/${masjid_id}/photo/cover`,
      MOCK_COVER_PHOTO_PUT
    );
  } catch (error) {
    console.error("[DIR-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

// Export constraints for use in client-side validation
export { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES };