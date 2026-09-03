/**
 * Route Handler — Event Extension · Register for Event
 *
 * EVT-EXT-03  POST /api/masjids/:masjid_id/events/:event_id/register
 *   → Registers the authenticated user for an event.
 *     Atomically decrements available spots and returns a QR token
 *     for event check-in. Triggers a confirmation notification.
 *     Idempotent — calling again returns 409.
 *
 * Auth: Bearer JWT (any authenticated user)
 *
 * Returns:
 *   409 — already registered
 *   422 — event is sold out (use EVT-EXT-04 to join waitlist instead)
 *   422 — event is cancelled
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { RegisterEventResponse } from "@/types/events";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; event_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_REGISTER: RegisterEventResponse = {
  success: true,
  message: "Registration successful.",
  data: {
    registration_id: "reg-uuid-0001",
    event_id: "evt-uuid-0001",
    event_name: "Spiritual Growth in a Modern World",
    user_id: "usr-uuid-zubair-0001",
    status: "confirmed",
    registered_at: "2026-05-05T10:00:00Z",
    qr_token: "data:image/png;base64,mockQRTokenBase64StringHere==",
    spots_left: 14,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * EVT-EXT-03 — POST register for event
 * Optional body: { notes?: string }
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, event_id } = await context.params;

    if (!masjid_id || !event_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters: masjid_id and event_id." },
        { status: 400 }
      );
    }

    // Parse optional body
    const contentType = req.headers.get("content-type") ?? "";
    let notes: unknown;

    if (contentType.includes("application/json")) {
      try {
        const body = await req.clone().json() as Record<string, unknown>;
        notes = body.notes;
      } catch {
        return NextResponse.json(
          { success: false, message: "Request body must be valid JSON." },
          { status: 400 }
        );
      }
    }

    // Validate optional notes
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { notes: ["notes must be a string when provided."] },
          },
          { status: 422 }
        );
      }
      if ((notes as string).length > 500) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { notes: ["notes must not exceed 500 characters."] },
          },
          { status: 422 }
        );
      }
    }

    return proxyPOST<RegisterEventResponse>(
      req,
      `/masjids/${masjid_id}/events/${event_id}/register`,
      MOCK_REGISTER
    );
  } catch (error) {
    console.error("[EVT-EXT-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}