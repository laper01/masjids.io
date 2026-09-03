/**
 * Route Handler — Notifications Infrastructure · Mark All Notifications Read
 *
 * NOTIF-03  PATCH /api/notifications/read-all
 *   → Bulk-marks all unread notifications as read for the authenticated user.
 *     Optionally scoped to a single masjid via `masjid_id` in the request body.
 *     Returns total count of notifications marked + new unread_count (always 0
 *     unless masjid_id scope was used).
 *
 * Auth: Bearer JWT (required)
 *
 * Request Body (optional):
 *   { masjid_id?: string }  — when provided, only marks notifications
 *                             from that masjid as read.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";
import type { MarkAllReadResponse } from "@/types/api";

// ─── Mock Data ────────────────────────────────────────────────────────────────

/** Mock for mark-all with no masjid scope (all notifications cleared) */
const MOCK_MARK_ALL_READ_GLOBAL: MarkAllReadResponse = {
  success: true,
  message: "All notifications marked as read.",
  data: {
    marked_count: 4,
    unread_count: 0,
    updated_at: "2026-04-23T11:35:00Z",
  },
};

/** Mock for mark-all scoped to one masjid */
const MOCK_MARK_ALL_READ_SCOPED: MarkAllReadResponse = {
  success: true,
  message: "All notifications from this masjid marked as read.",
  data: {
    marked_count: 2,
    unread_count: 2,
    updated_at: "2026-04-23T11:35:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * NOTIF-03 — PATCH mark all notifications as read
 * Optional body: { masjid_id?: string }
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    let body: Record<string, unknown> = {};

    // Body is optional — parse only if Content-Type is application/json
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        body = await req.clone().json();
      } catch {
        return NextResponse.json(
          { success: false, message: "Request body must be valid JSON." },
          { status: 400 }
        );
      }
    }

    // Validate optional masjid_id
    if (
      body.masjid_id !== undefined &&
      (typeof body.masjid_id !== "string" || body.masjid_id.trim() === "")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { masjid_id: ["masjid_id must be a non-empty string when provided."] },
        },
        { status: 422 }
      );
    }

    // Choose mock based on whether scope is applied
    const mockData =
      typeof body.masjid_id === "string" && body.masjid_id.trim().length > 0
        ? MOCK_MARK_ALL_READ_SCOPED
        : MOCK_MARK_ALL_READ_GLOBAL;

    return proxyRequest<MarkAllReadResponse>(req, {
      path: "/notifications/read-all",
      method: "PATCH",
      mockData,
    });
  } catch (error) {
    console.error("[NOTIF-03] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}