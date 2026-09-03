/**
 * Route Handler — Admin Payments · Stripe Connect Onboarding Status
 *
 * MEM-MISS-09  GET /api/masjids/:masjid_id/payments/onboarding/status
 *   → Current Stripe Connect onboarding state for the masjid.
 *     Shows charges_enabled, payouts_enabled, and pending requirements.
 *     onboarding_url expires after 24 hours — always fetch fresh.
 *     Auth: Bearer JWT · members:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { PaymentOnboardingStatus } from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK: PaymentOnboardingStatus = {
  masjid_id: "msj-uuid-al-noor-0001",
  onboarding_status: "incomplete",
  stripe_account_id: "acct_1QABCExampleXYZ",
  charges_enabled: false,
  payouts_enabled: false,
  requirements: {
    currently_due: ["individual.id_number", "bank_account"],
    eventually_due: ["business.tax_id"],
    past_due: [],
  },
  onboarding_url: "https://connect.stripe.com/setup/s/mockOnboardingToken123",
  checked_at: "2026-05-19T11:10:00Z",
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing required parameter: masjid_id." }, { status: 400 });

    return proxyGET<PaymentOnboardingStatus>(req, `/masjids/${masjid_id}/payments/onboarding/status`, MOCK);
  } catch (error) {
    console.error("[MEM-MISS-09]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}