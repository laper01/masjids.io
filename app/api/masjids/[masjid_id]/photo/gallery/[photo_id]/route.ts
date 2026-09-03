/**
 * Route Handler — Masjid Media & Facility · Gallery Photo (Single Resource)
 *
 * DIR-08  PUT /api/masjids/:masjid_id/photo/gallery/:photo_id
 *   → Updates a specific gallery photo.
 *     Supports replacing the image file, updating the caption, or both.
 *     At least one of file or caption must be provided.
 *     If file is replaced, the old CDN file is purged.
 *     Returns 404 if photo_id does not belong to this masjid.
 *
 * Auth: Bearer JWT · members:manage
 *
 * Body: multipart/form-data
 *   file?:    <image>  — optional, replaces existing image
 *   caption?: string   — optional, updates caption only (lightweight op)
 *
 * Note: Caption-only updates may be sent as application/json or
 * multipart/form-data. File updates must be multipart/form-data.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";
import type { UpdateGalleryPhotoResponse } from "@/types/media";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; photo_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_UPDATE_GALLERY_PHOTO: UpdateGalleryPhotoResponse = {
  success: true,
  message: "Gallery photo updated successfully.",
  data: {
    id: "photo-uuid-0001",
    masjid_id: "msj-uuid-al-noor-0001",
    photo_url:
      "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/gallery/photo-0001-v2.jpg",
    caption: "Updated caption for main prayer hall photo",
    file_name: "prayer-hall-v2.jpg",
    file_size_bytes: 480000,
    updated_at: "2026-05-05T10:00:00Z",
    updated_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * DIR-08 — PUT update a gallery photo (file, caption, or both)
 * Body: multipart/form-data OR application/json (caption-only)
 *
 * Returns 404 if photo_id does not belong to this masjid.
 * Returns 422 if neither file nor caption is provided.
 */
export async function PUT(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, photo_id } = await context.params;

    if (!masjid_id || !photo_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters: masjid_id and photo_id.",
        },
        { status: 400 }
      );
    }

    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    const isJson = contentType.includes("application/json");

    // Must be either multipart (file upload) or JSON (caption-only update)
    if (!isMultipart && !isJson) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Request must use Content-Type: multipart/form-data (with file) or application/json (caption-only).",
        },
        { status: 415 }
      );
    }

    // For JSON (caption-only) requests — validate body has caption field
    if (isJson) {
      let body: unknown;
      try {
        body = await req.clone().json();
      } catch {
        return NextResponse.json(
          { success: false, message: "Request body must be valid JSON." },
          { status: 400 }
        );
      }

      const { caption } = body as Record<string, unknown>;

      if (caption === undefined || caption === null) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: {
              body: [
                "At least one of file (multipart) or caption (JSON) must be provided.",
              ],
            },
          },
          { status: 422 }
        );
      }

      if (typeof caption !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { caption: ["caption must be a string."] },
          },
          { status: 422 }
        );
      }

      if (caption.length > 300) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { caption: ["caption must not exceed 300 characters."] },
          },
          { status: 422 }
        );
      }
    }

    return proxyRequest<UpdateGalleryPhotoResponse>(req, {
      path: `/masjids/${masjid_id}/photo/gallery/${photo_id}`,
      method: "PUT",
      mockData: MOCK_UPDATE_GALLERY_PHOTO,
    });
  } catch (error) {
    console.error("[DIR-08] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}