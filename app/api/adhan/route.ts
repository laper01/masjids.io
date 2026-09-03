/**
 * Route Handler — Adhan Files
 *
 * ADH-01  GET  /api/adhan
 *   → Paginated list of Adhan files. Optionally filter by ?masjid_id=...
 *
 * ADH-02  POST /api/adhan
 *   → Upload a new Adhan file (multipart/form-data).
 *     FormData fields: file (audio), name (string), masjid_id (string)
 *
 * Auth: Bearer JWT (required)
 *
 * Query Params (GET):
 *   masjid_id  string  — filter by masjid
 *   page       number  — default 1
 *   limit      number  — default 10, max 50
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type {
  GetAdhanListResponse,
  UploadAdhanResponse,
} from "@/types/adhan";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ADHAN_LIST: GetAdhanListResponse = {
  success: true,
  message: "Adhan files retrieved successfully.",
  data: [
    {
      id: "adhan-uuid-0001",
      name: "Adhan Makkah",
      url: "https://cdn.example.com/adhan/makkah.mp3",
      masjid_id: "msj-uuid-al-noor-0001",
      created_at: "2026-01-10T08:00:00Z",
      updated_at: "2026-03-01T12:00:00Z",
    },
    {
      id: "adhan-uuid-0002",
      name: "Adhan Madinah",
      url: "https://cdn.example.com/adhan/madinah.mp3",
      masjid_id: "msj-uuid-al-noor-0001",
      created_at: "2026-01-15T09:30:00Z",
      updated_at: null,
    },
    {
      id: "adhan-uuid-0003",
      name: "Adhan Al-Aqsa",
      url: "https://cdn.example.com/adhan/aqsa.mp3",
      masjid_id: "msj-uuid-al-iman-0002",
      created_at: "2026-02-20T11:00:00Z",
      updated_at: "2026-04-05T09:00:00Z",
    },
  ],
  metadata: {
    total_data: 3,
    total_page: 1,
    page: 1,
    limit: 10,
  },
};

const MOCK_UPLOAD_ADHAN: UploadAdhanResponse = {
  success: true,
  message: "Adhan file uploaded successfully.",
  data: {
    id: "adhan-uuid-0001",
    name: "Adhan Makkah",
    url: "https://cdn.example.com/adhan/makkah.mp3",
    masjid_id: "msj-uuid-al-noor-0001",
    created_at: "2026-01-10T08:00:00Z",
    updated_at: null,
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * ADH-01 — GET list of Adhan files
 * Query params: masjid_id, page, limit (max 50)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
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

    return proxyGET<GetAdhanListResponse>(
      req,
      `/adhan?${searchParams.toString()}`,
      MOCK_ADHAN_LIST
    );
  } catch (error) {
    console.error("[ADH-01] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * ADH-02 — POST upload a new Adhan file
 * Body: multipart/form-data — { file, name, masjid_id }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    return proxyPOST<UploadAdhanResponse>(req, `/adhan/upload`, MOCK_UPLOAD_ADHAN, {
      useFormData: "true",
    });
  } catch (error) {
    console.error("[ADH-02] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}