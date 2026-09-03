/**
 * VB-03  POST /api/masjids/:masjid_id/elections/:election_id/notify-nonvoters
 * VB-04  POST /api/masjids/:masjid_id/elections/:election_id/emergency-stop
 */
import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type { NotifyNonVotersResponse, NotifyNonVotersRequest, NotificationTemplate, NotificationChannel } from "@/types/elections";

// These live in separate route files per Next.js App Router convention.
// This file is notify-nonvoters/route.ts
// emergency-stop/route.ts is a sibling file.

const VALID_TEMPLATES: Set<NotificationTemplate> = new Set(["gentle_reminder", "last_chance", "deadline_today"]);
const VALID_CHANNELS: Set<NotificationChannel> = new Set(["mobile_push", "sms"]);

interface RouteContext { params: Promise<{ masjid_id: string; election_id: string }>; }

const MOCK: NotifyNonVotersResponse = {
  success: true,
  message: "Notification job queued successfully.",
  data: {
    job_id: "notif-job-uuid-0001",
    recipients: 702,
    status: "queued",
    estimated_eta_s: 45,
    queued_at: "2026-05-06T14:25:00Z",
  },
};

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, election_id } = await context.params;
    if (!masjid_id || !election_id) return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    let body: unknown;
    try { body = await req.clone().json(); } catch {
      return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
    }

    const { message_template, channel } = body as Record<string, unknown>;

    if (!message_template || !VALID_TEMPLATES.has(message_template as NotificationTemplate))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { message_template: [`Must be one of: ${[...VALID_TEMPLATES].join(", ")}.`] } }, { status: 422 });

    if (channel !== undefined && !VALID_CHANNELS.has(channel as NotificationChannel))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { channel: [`Must be one of: ${[...VALID_CHANNELS].join(", ")}.`] } }, { status: 422 });

    return proxyPOST<NotifyNonVotersResponse>(req, `/masjids/${masjid_id}/elections/${election_id}/notify-nonvoters`, MOCK);
  } catch (error) {
    console.error("[VB-03]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
