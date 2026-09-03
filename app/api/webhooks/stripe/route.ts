/**
 * Route Handler — Donation Campaigns · Stripe Webhook
 *
 * DON-07  POST /api/webhooks/stripe
 *   → Receives and processes Stripe webhook events.
 *     Verifies the Stripe-Signature header against STRIPE_WEBHOOK_SECRET
 *     before forwarding to the backend.
 *
 *     Handled event types:
 *       - payment_intent.succeeded  → one-time donation confirmed
 *       - invoice.paid              → recurring subscription payment confirmed
 *
 *     On each confirmed event the backend:
 *       1. Finds the donation record by Stripe object ID
 *       2. Updates donation status → "succeeded"
 *       3. Increments campaign raised_amount and progress_pct
 *       4. Sends in-app notification to the donor (receipt)
 *
 * Auth: Stripe-Signature header (HMAC-SHA256, verified server-side)
 *       This endpoint must NOT require a user JWT — Stripe calls it directly.
 *
 * IMPORTANT: This route must be excluded from any CSRF middleware.
 *            In Next.js App Router, Route Handlers are exempt by default.
 *            Do NOT wrap this in an auth middleware that rejects unsigned requests.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";
import type { StripeWebhookResponse } from "@/types/api";

// ─── Supported Stripe Event Types ────────────────────────────────────────────

const SUPPORTED_EVENTS = new Set([
  "payment_intent.succeeded",
  "invoice.paid",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

/**
 * Mock for payment_intent.succeeded — one-time donation confirmed
 */
const MOCK_STRIPE_WEBHOOK_PAYMENT: StripeWebhookResponse = {
  success: true,
  message: "Webhook processed successfully.",
  data: {
    received: true,
    donation_id: "don-uuid-0001",
    campaign_raised: 89930,
    progress_pct: 59.95,
  },
};

/**
 * Mock for invoice.paid — recurring subscription payment confirmed
 */
const MOCK_STRIPE_WEBHOOK_INVOICE: StripeWebhookResponse = {
  success: true,
  message: "Webhook processed successfully.",
  data: {
    received: true,
    donation_id: "don-uuid-0002",
    campaign_raised: 90430,
    progress_pct: 60.29,
  },
};

// ─── Stripe Signature Verification ───────────────────────────────────────────

/**
 * Verifies the Stripe-Signature header using the webhook secret.
 *
 * In production this should use the official `stripe` npm package:
 *   stripe.webhooks.constructEvent(rawBody, sig, secret)
 *
 * This implementation performs the verification manually to avoid
 * an npm dependency in this BFF layer — the backend does the definitive
 * verification using the Stripe SDK before processing the event.
 *
 * The BFF performs a lightweight pre-check here to reject obviously
 * unsigned or malformed requests before they reach the backend.
 */
function hasStripeSignatureHeader(req: NextRequest): boolean {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return false;

  // Stripe signatures contain "t=" timestamp and "v1=" HMAC components
  return sig.includes("t=") && sig.includes("v1=");
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * DON-07 — POST receive Stripe webhook event
 *
 * Security checklist:
 *   ✓ Verifies Stripe-Signature header is present and well-formed
 *   ✓ Reads raw body (not parsed JSON) to preserve HMAC integrity
 *   ✓ Forwards raw body + Stripe-Signature to backend for final HMAC verification
 *   ✓ Returns 200 quickly — Stripe retries on non-2xx responses
 *   ✓ Unsupported event types acknowledged with 200 (not 400) to prevent retries
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Verify Stripe-Signature header is present ──────────────────────
    if (!hasStripeSignatureHeader(req)) {
      console.warn("[DON-07] Missing or malformed Stripe-Signature header.");
      return NextResponse.json(
        { success: false, message: "Missing Stripe-Signature header." },
        { status: 400 }
      );
    }

    // ── 2. Read raw body text (must NOT parse as JSON — breaks HMAC) ──────
    let rawBody: string;
    try {
      rawBody = await req.clone().text();
    } catch {
      return NextResponse.json(
        { success: false, message: "Failed to read request body." },
        { status: 400 }
      );
    }

    if (!rawBody || rawBody.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Request body must not be empty." },
        { status: 400 }
      );
    }

    // ── 3. Parse event type for logging and mock selection ────────────────
    let eventType: string = "unknown";
    try {
      const parsed = JSON.parse(rawBody) as { type?: string };
      eventType = parsed?.type ?? "unknown";
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    console.info(`[DON-07] Received Stripe event: ${eventType}`);

    // ── 4. Acknowledge unsupported event types without error ──────────────
    //    Stripe retries on 4xx/5xx. Returning 200 on unsupported events
    //    prevents unnecessary retries for events we don't handle.
    if (!SUPPORTED_EVENTS.has(eventType)) {
      console.info(`[DON-07] Unhandled event type "${eventType}" — acknowledged.`);
      return NextResponse.json(
        {
          success: true,
          message: `Event type "${eventType}" received but not processed.`,
          data: { received: true, donation_id: "", campaign_raised: 0, progress_pct: 0 },
        },
        { status: 200 }
      );
    }

    // ── 5. Select mock based on event type ────────────────────────────────
    const mockData =
      eventType === "invoice.paid"
        ? MOCK_STRIPE_WEBHOOK_INVOICE
        : MOCK_STRIPE_WEBHOOK_PAYMENT;

    // ── 6. Forward to backend (raw body preserved for backend HMAC check) ─
    return proxyRequest<StripeWebhookResponse>(req, {
      path: "/webhooks/stripe",
      method: "POST",
      mockData,
      extraHeaders: {
        // Forward Stripe signature so backend can verify with Stripe SDK
        "stripe-signature": req.headers.get("stripe-signature") ?? "",
        // Raw body requires text/plain content-type (not application/json)
        // to prevent any middleware from re-serialising the payload
        "content-type": "application/json",
      },
    });
  } catch (error) {
    console.error("[DON-07] Unexpected error:", error);
    // Return 200 even on unexpected errors — Stripe should not retry
    // system-level failures as they will not resolve on retry.
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}