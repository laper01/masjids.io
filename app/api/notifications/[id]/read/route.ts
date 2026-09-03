/**
 * Route Handler — Notifications Infrastructure · Mark Single Notification Read
 *
 * NOTIF-02  PATCH /api/notifications/:id/read
 *   → Marks a single notification as read for the authenticated user.
 *     Idempotent — marking an already-read notification returns 200.
 *     Returns updated unread_count so client can sync badge without refetch.
 *
 * Auth: Bearer JWT (required)
 *     The backend verifies the notification belongs to the requesting user.
 *     Attempting to mark another user's notification returns 403.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";
import type { MarkNotificationReadResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MARK_READ: MarkNotificationReadResponse = {
  success: true,
  message: "Notification marked as read.",
  data: {
    id: "notif-uuid-0001",
    read: true,
    read_at: "2026-04-23T11:30:00Z",
    unread_count: 3,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * NOTIF-02 — PATCH mark a single notification as read
 * No request body required.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id || id.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: id." },
        { status: 400 }
      );
    }

    return proxyRequest<MarkNotificationReadResponse>(req, {
      path: `/notifications/${id}/read`,
      method: "PATCH",
      mockData: MOCK_MARK_READ,
    });
  } catch (error) {
    console.error("[NOTIF-02] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}