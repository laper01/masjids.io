/**
 * Route Handler — Donation Campaigns · Initiate Donation
 *
 * DON-05  POST /api/masjids/:masjid_id/donations/campaigns/:id/donate
 *   → Creates a Stripe PaymentIntent (one-time) or Subscription (recurring)
 *     and returns a client_secret for the frontend Stripe.js SDK to confirm.
 *
 * Auth: Bearer JWT (required — donor identity attached to payment record)
 *
 * Request Body:
 *   {
 *     amount:        number     — in major units (e.g. 25 = $25.00)
 *     currency:      string     — ISO 4217 (must match campaign currency)
 *     donation_type: "one_time" | "recurring"
 *     interval?:     "month" | "year"  — required when donation_type = "recurring"
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";
import type {
  InitiateDonationResponse,
  DonationInterval,
} from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; id: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_DONATION_TYPES = new Set(["one_time", "recurring"]);
const VALID_INTERVALS: Set<DonationInterval> = new Set(["month", "year"]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_INITIATE_DONATION: InitiateDonationResponse = {
  success: true,
  message: "Payment intent created. Use client_secret to confirm payment.",
  data: {
    payment_intent_id: "pi_3NkJ8fLkdIwHu7ix0Y2Rz1Qm",
    client_secret: "pi_3NkJ8fLkdIwHu7ix0Y2Rz1Qm_secret_mockClientSecretValue",
    stripe_account_id: "acct_1Th7MXQpaI3NuzSS",
    amount: 25,
    currency: "USD",
    status: "requires_payment_method",
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, id } = await context.params;

    if (!masjid_id || !id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters: masjid_id and id." },
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

    const { amount, currency, donation_type, interval } =
      body as Record<string, unknown>;

    // amount — must be a positive number
    if (amount === undefined || amount === null) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { amount: ["amount is required."] },
        },
        { status: 422 }
      );
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { amount: ["amount must be a positive number."] },
        },
        { status: 422 }
      );
    }

    // currency
    if (!currency || typeof currency !== "string" || currency.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { currency: ["currency is required."] },
        },
        { status: 422 }
      );
    }

    // donation_type
    if (!donation_type || typeof donation_type !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { donation_type: ["donation_type is required."] },
        },
        { status: 422 }
      );
    }

    if (!VALID_DONATION_TYPES.has(donation_type)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid donation_type: "${donation_type}".`,
          errors: {
            donation_type: [`Must be one of: ${[...VALID_DONATION_TYPES].join(", ")}.`],
          },
        },
        { status: 422 }
      );
    }

    // interval — required only when donation_type = "recurring"
    if (donation_type === "recurring") {
      if (!interval || typeof interval !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { interval: ['interval is required when donation_type is "recurring".'] },
          },
          { status: 422 }
        );
      }

      if (!VALID_INTERVALS.has(interval as DonationInterval)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid interval: "${interval}".`,
            errors: {
              interval: [`Must be one of: ${[...VALID_INTERVALS].join(", ")}.`],
            },
          },
          { status: 422 }
        );
      }
    }

    return proxyPOST<InitiateDonationResponse>(
      req,
      `/masjids/${masjid_id}/donations/campaigns/${id}/donate`,
      MOCK_INITIATE_DONATION
    );
  } catch (error) {
    console.error("[DON-05] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}