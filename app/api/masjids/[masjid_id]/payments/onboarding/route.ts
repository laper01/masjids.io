/**
 * app/api/masjids/[masjid_id]/payments/onboarding/route.ts
 *
 * POST /masjids/:masjid_id/payments/onboarding
 * Generates a Stripe Connect onboarding URL for the masjid admin.
 * Requires: { email: string } in request body.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyPOST } from "@/lib/proxyHelper";

interface OnboardingLinkData {
  onboarding_url: string;
}

interface OnboardingLinkResponse {
  success: boolean;
  message: string;
  data: OnboardingLinkData;
}

const MOCK: OnboardingLinkResponse = {
  success: true,
  message: "Onboarding link generated successfully",
  data: {
    onboarding_url: "https://connect.stripe.com/setup/e/acct_mock/mock_token",
  },
};

type Params = { params: Promise<{ masjid_id: string }> };

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { masjid_id } = await params;
  return proxyPOST<OnboardingLinkResponse>(
    req,
    `/masjids/${masjid_id}/payments/onboarding`,
    MOCK
  );
}