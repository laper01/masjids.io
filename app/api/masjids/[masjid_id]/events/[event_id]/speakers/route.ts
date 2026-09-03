/**
 * Route Handler — Event Extension · Add Speaker / Host
 *
 * EVT-EXT-06  POST /api/masjids/:masjid_id/events/:event_id/speakers
 *   → Associates a speaker or host with an event.
 *     Speakers are displayed on event detail pages and indexed for
 *     the global search bar ("Find events, speakers, or workshops").
 *     Multiple speakers can be added per event.
 *
 * Auth: Bearer JWT · events:manage
 *
 * Request Body:
 *   {
 *     name:        string             — required
 *     role:        speaker|host|panelist|moderator — required
 *     bio:         string             — required
 *     avatar_url?: string             — optional URL
 *     user_id?:    string             — optional platform user link
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { AddSpeakerResponse, SpeakerRole } from "@/types/events";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; event_id: string }>;
}

// ─── Valid Enum Values ────────────────────────────────────────────────────────

const VALID_ROLES: Set<SpeakerRole> = new Set([
  "speaker",
  "host",
  "panelist",
  "moderator",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ADD_SPEAKER: AddSpeakerResponse = {
  success: true,
  message: "Speaker added successfully.",
  data: {
    id: "spk-uuid-0001",
    event_id: "evt-uuid-0001",
    name: "Ustadh Ibrahim Al-Mazrui",
    role: "speaker",
    bio: "Islamic scholar and author specialising in contemporary Muslim ethics. Graduate of Al-Azhar University with over 15 years of teaching experience.",
    avatar_url: "https://cdn.masjids.io/speakers/ustadh-ibrahim.jpg",
    user_id: "usr-uuid-ibrahim-0009",
    added_at: "2026-05-05T10:00:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * EVT-EXT-06 — POST add a speaker or host to an event
 * Body: { name, role, bio, avatar_url?, user_id? }
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

    let body: unknown;
    try {
      body = await req.clone().json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const { name, role, bio, avatar_url, user_id } =
      body as Record<string, unknown>;

    // name
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { name: ["name is required."] } },
        { status: 422 }
      );
    }

    // role
    if (!role || typeof role !== "string") {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { role: ["role is required."] } },
        { status: 422 }
      );
    }

    if (!VALID_ROLES.has(role as SpeakerRole)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid role: "${role}".`,
          errors: { role: [`Must be one of: ${[...VALID_ROLES].join(", ")}.`] },
        },
        { status: 422 }
      );
    }

    // bio
    if (!bio || typeof bio !== "string" || bio.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { bio: ["bio is required."] } },
        { status: 422 }
      );
    }

    // optional avatar_url
    if (avatar_url !== undefined && avatar_url !== null) {
      if (typeof avatar_url !== "string") {
        return NextResponse.json(
          { success: false, message: "Validation failed.", errors: { avatar_url: ["avatar_url must be a string URL."] } },
          { status: 422 }
        );
      }
      try { new URL(avatar_url as string); } catch {
        return NextResponse.json(
          { success: false, message: "Validation failed.", errors: { avatar_url: ["avatar_url must be a valid URL."] } },
          { status: 422 }
        );
      }
    }

    // optional user_id
    if (user_id !== undefined && user_id !== null && typeof user_id !== "string") {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { user_id: ["user_id must be a string when provided."] } },
        { status: 422 }
      );
    }

    return proxyPOST<AddSpeakerResponse>(
      req,
      `/masjids/${masjid_id}/events/${event_id}/speakers`,
      MOCK_ADD_SPEAKER
    );
  } catch (error) {
    console.error("[EVT-EXT-06] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}