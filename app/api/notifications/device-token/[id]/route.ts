/**
 * Route Handler — Notifications Infrastructure · Device Token (Single Resource)
 *
 * NOTIF-05  DELETE /api/notifications/device-token/:id
 *   → Deactivates a registered push device token.
 *     Token is soft-deleted — `is_active` is set to false.
 *     Deactivated tokens no longer receive push notifications.
 *     Common use case: user logout or device switch.
 *
 * Auth: Bearer JWT (required)
 *     Backend verifies the token belongs to the requesting user.
 *     Attempting to deactivate another user's token returns 403.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyDELETE } from "@/lib/proxyHelper";
import type { DeactivateDeviceTokenResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DEACTIVATE_TOKEN: DeactivateDeviceTokenResponse = {
  success: true,
  message: "Device token deactivated successfully.",
  data: {
    id: "dtoken-uuid-0001",
    is_active: false,
    deactivated_at: "2026-04-23T11:45:00Z",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * NOTIF-05 — DELETE deactivate a push device token
 * No request body required.
 */
export async function DELETE(
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

    return proxyDELETE<DeactivateDeviceTokenResponse>(
      req,
      `/notifications/device-token/${id}`,
      MOCK_DEACTIVATE_TOKEN
    );
  } catch (error) {
    console.error("[NOTIF-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}