/**
 * app/api/events/[event_id]/status/route.ts
 * Next.js Route Handler — Event Status
 *
 * PATCH /api/events/:event_id/status → EVT-MGT-03 Update event status
 */

import { proxyPATCH } from "@/lib/proxyHelper";
import type { UpdateEventStatusResponse } from "@/types/event-management";

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_UPDATE_STATUS: UpdateEventStatusResponse = {
  success: true,
  message: "Event status updated to published",
};

// ── Handler ────────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ event_id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const { event_id } = await params;
  return proxyPATCH<UpdateEventStatusResponse>(
    req,
    `/event/${event_id}/status`,
    MOCK_UPDATE_STATUS
  );
}