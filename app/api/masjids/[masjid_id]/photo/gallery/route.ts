/**
 * Route Handler — Masjid Media & Facility · Photo Gallery (Collection)
 *
 * DIR-06  GET  /api/masjids/:masjid_id/photo/gallery
 *   → Paginated gallery ordered by upload date descending.
 *     Returns empty array (not 404) if no photos exist yet.
 *     PUBLIC — no auth required.
 *
 * DIR-07  POST /api/masjids/:masjid_id/photo/gallery
 *   → Batch-uploads 1–10 photos with optional captions.
 *     All files must be JPEG/PNG/WEBP, max 5 MB each.
 *     If any file fails validation the entire batch is rejected.
 *     Auth: Bearer JWT · members:manage
 *
 * Query Params (GET only):
 *   page   number — default 1
 *   limit  number — default 20, max 50
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type { GetGalleryResponse, UploadGalleryResponse } from "@/types/media";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_GALLERY_LIST: GetGalleryResponse = {
  success: true,
  message: "Gallery photos retrieved successfully.",
  data: [
    {
      id: "photo-uuid-0001",
      masjid_id: "msj-uuid-al-noor-0001",
      photo_url:
        "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/gallery/photo-0001.jpg",
      caption: "Main prayer hall during Ramadan Tarawih",
      file_name: "prayer-hall-ramadan.jpg",
      file_size_bytes: 512000,
      width: 1080,
      height: 720,
      uploaded_at: "2026-04-20T08:00:00Z",
      uploaded_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
    },
    {
      id: "photo-uuid-0002",
      masjid_id: "msj-uuid-al-noor-0001",
      photo_url:
        "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/gallery/photo-0002.jpg",
      caption: "New wudu facilities — brothers section",
      file_name: "wudu-brothers.jpg",
      file_size_bytes: 380000,
      width: 1080,
      height: 720,
      uploaded_at: "2026-04-15T11:00:00Z",
      uploaded_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
    },
    {
      id: "photo-uuid-0003",
      masjid_id: "msj-uuid-al-noor-0001",
      photo_url:
        "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/gallery/photo-0003.jpg",
      caption: "Sisters' prayer hall renovation complete",
      file_name: "sisters-hall.jpg",
      file_size_bytes: 420000,
      width: 1080,
      height: 720,
      uploaded_at: "2026-04-10T09:30:00Z",
      uploaded_by: { id: "usr-uuid-fatima-0002", name: "Fatimah Zahra" },
    },
    {
      id: "photo-uuid-0004",
      masjid_id: "msj-uuid-al-noor-0001",
      photo_url:
        "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/gallery/photo-0004.jpg",
      caption: null,
      file_name: "exterior-front.jpg",
      file_size_bytes: 620000,
      width: 1200,
      height: 800,
      uploaded_at: "2026-03-01T14:00:00Z",
      uploaded_by: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
    },
    {
      id: "photo-uuid-0005",
      masjid_id: "msj-uuid-al-noor-0001",
      photo_url:
        "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/gallery/photo-0005.jpg",
      caption: "Weekend Islamic School — Term 1 graduation",
      file_name: "school-graduation.jpg",
      file_size_bytes: 495000,
      width: 1080,
      height: 720,
      uploaded_at: "2026-02-20T16:00:00Z",
      uploaded_by: { id: "usr-uuid-bilal-0003", name: "Bilal Hassan" },
    },
  ],
  metadata: {
    total_data: 24,
    total_page: 2,
    page: 1,
    limit: 20,
  },
};

const MOCK_UPLOAD_GALLERY: UploadGalleryResponse = {
  success: true,
  message: "Gallery photos uploaded successfully.",
  data: [
    {
      id: "photo-uuid-new-0099",
      photo_url:
        "https://cdn.masjids.io/masjids/msj-uuid-al-noor-0001/gallery/photo-new-0099.jpg",
      caption: "Main prayer hall during Ramadan Tarawih",
      file_name: "prayer-hall-ramadan.jpg",
      file_size_bytes: 512000,
      uploaded_at: "2026-05-05T09:00:00Z",
    },
  ],
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * DIR-06 — GET paginated gallery photos (PUBLIC)
 * Query params: page, limit
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

    const { searchParams } = new URL(req.url);

    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    if (pageRaw !== null) {
      const page = Number(pageRaw);
      if (!Number.isInteger(page) || page < 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { page: ["page must be a positive integer."] },
          },
          { status: 422 }
        );
      }
    }

    if (limitRaw !== null) {
      const limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { limit: ["limit must be an integer between 1 and 50."] },
          },
          { status: 422 }
        );
      }
    }

    return proxyGET<GetGalleryResponse>(
      req,
      `/masjids/${masjid_id}/photo/gallery`,
      MOCK_GALLERY_LIST
    );
  } catch (error) {
    console.error("[DIR-06] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * DIR-07 — POST batch-upload gallery photos (1–10 files)
 * Body: multipart/form-data { files: [...], captions?: [...] }
 * Auth: Bearer JWT · members:manage
 *
 * The BFF validates Content-Type only.
 * Backend validates each file (type, size) and rejects entire batch if any fail.
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

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          message: "Request must use Content-Type: multipart/form-data.",
          errors: {
            files: ["Request must be sent as multipart/form-data with a files field."],
          },
        },
        { status: 415 }
      );
    }

    return proxyPOST<UploadGalleryResponse>(
      req,
      `/masjids/${masjid_id}/photo/gallery`,
      MOCK_UPLOAD_GALLERY
    );
  } catch (error) {
    console.error("[DIR-07] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}