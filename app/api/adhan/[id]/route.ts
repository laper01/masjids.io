/**
 * Route Handler — Adhan File · Single Resource
 *
 * ADH-03  GET    /api/adhan/[id]
 *   → Retrieve details of a specific Adhan file.
 *
 * ADH-04  PUT    /api/adhan/[id]
 *   → Update an existing Adhan file (name and/or audio file).
 *     Body: multipart/form-data — { file?, name?, masjid_id? }
 *
 * ADH-05  DELETE /api/adhan/[id]
 *   → Remove an Adhan file permanently.
 *
 * Auth: Bearer JWT (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET, proxyPUT, proxyDELETE } from "@/lib/proxyHelper";
import type {
  GetAdhanDetailResponse,
  UpdateAdhanResponse,
  DeleteAdhanResponse,
} from "@/types/adhan";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ADHAN_DETAIL: GetAdhanDetailResponse = {
  success: true,
  message: "Adhan file retrieved successfully.",
  data: {
    id: "adhan-uuid-0001",
    name: "Adhan Makkah",
    url: "https://cdn.example.com/adhan/makkah.mp3",
    masjid_id: "msj-uuid-al-noor-0001",
    created_at: "2026-01-10T08:00:00Z",
    updated_at: "2026-03-01T12:00:00Z",
  },
};

const MOCK_UPDATE_ADHAN: UpdateAdhanResponse = {
  success: true,
  message: "Adhan file updated successfully.",
  data: {
    id: "adhan-uuid-0001",
    name: "Adhan Makkah",
    url: "https://cdn.example.com/adhan/makkah.mp3",
    masjid_id: "msj-uuid-al-noor-0001",
    created_at: "2026-01-10T08:00:00Z",
    updated_at: "2026-05-01T09:00:00Z",
  },
};

const MOCK_DELETE_ADHAN: DeleteAdhanResponse = {
  success: true,
  message: "Adhan file deleted successfully.",
  data: {
    id: "adhan-uuid-0001",
    deleted: true,
    deleted_at: "2026-05-01T09:00:00Z",
  },
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;  // ← await here

    return proxyGET<GetAdhanDetailResponse>(
      req,
      `/adhan/${id}`,
      MOCK_ADHAN_DETAIL
    );
  } catch (error) {
    console.error("[ADH-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;  // ← await here

    return proxyPUT<UpdateAdhanResponse>(req, `/adhan/${id}`, MOCK_UPDATE_ADHAN, {
      useFormData: "true",
    });
  } catch (error) {
    console.error("[ADH-04] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;  // ← await here

    return proxyDELETE<DeleteAdhanResponse>(req, `/adhan/${id}`, MOCK_DELETE_ADHAN);
  } catch (error) {
    console.error("[ADH-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}