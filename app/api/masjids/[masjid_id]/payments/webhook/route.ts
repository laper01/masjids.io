/**
 * Route Handler — Admin Payments · Stripe Webhook
 *
 * MEM-MISS-08  POST /api/masjids/:masjid_id/payments/webhook
 *   → Receives Stripe lifecycle events for membership subscriptions.
 *     NO Bearer JWT — authenticated via Stripe-Signature HMAC header.
 *     Must NEVER be behind JWT middleware.
 *
 * Handled event types:
 *   invoice.payment_succeeded       → activate/renew membership
 *   invoice.payment_failed          → flag payment failed
 *   customer.subscription.deleted   → cancel membership
 *
 * Always return 200 — even for unrecognised events (Stripe retry prevention).
 * Handler is idempotent — Stripe may deliver the same event multiple times.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";
import type { WebhookAckResponse, StripeWebhookEventType } from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

const HANDLED_EVENTS: Set<StripeWebhookEventType> = new Set([
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.deleted",
]);

const MOCK: WebhookAckResponse = { received: true };

function hasValidStripeSignature(req: NextRequest): boolean {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return false;
  return sig.includes("t=") && sig.includes("v1=");
}

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing masjid_id." }, { status: 400 });

    // Verify Stripe-Signature header
    if (!hasValidStripeSignature(req)) {
      console.warn("[MEM-MISS-08] Missing or malformed Stripe-Signature header.");
      return NextResponse.json({ error: "invalid_signature", message: "Webhook signature verification failed" }, { status: 400 });
    }

    // Read raw body (MUST NOT parse as JSON — breaks HMAC)
    let rawBody: string;
    try { rawBody = await req.clone().text(); } catch {
      return NextResponse.json({ error: "bad_request", message: "Failed to read request body." }, { status: 400 });
    }

    if (!rawBody.trim())
      return NextResponse.json({ error: "bad_request", message: "Request body must not be empty." }, { status: 400 });

    // Parse event type for logging
    let eventType = "unknown";
    try {
      const parsed = JSON.parse(rawBody) as { type?: string };
      eventType = parsed?.type ?? "unknown";
    } catch {
      return NextResponse.json({ error: "bad_request", message: "Request body must be valid JSON." }, { status: 400 });
    }

    console.info(`[MEM-MISS-08] masjid=${masjid_id} event=${eventType}`);

    // Acknowledge unhandled events with 200 to prevent Stripe retries
    if (!HANDLED_EVENTS.has(eventType as StripeWebhookEventType)) {
      console.info(`[MEM-MISS-08] Unhandled event "${eventType}" — acknowledged.`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    return proxyRequest<WebhookAckResponse>(req, {
      path: `/masjids/${masjid_id}/payments/webhook`,
      method: "POST",
      mockData: MOCK,
      extraHeaders: {
        "stripe-signature": req.headers.get("stripe-signature") ?? "",
        "content-type": "application/json",
      },
    });
  } catch (error) {
    console.error("[MEM-MISS-08]", error);
    // Return 200 — system failures should not trigger Stripe retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}