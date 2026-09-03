import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";
import type { GetMyDonationDetailResponse } from "@/types/donations";

type Ctx = { params: Promise<{ donation_id: string }> };

const MOCK_MY_DONATION_DETAIL: GetMyDonationDetailResponse = {
  success: true,
  message: "ok",
  data: {
    id: "043c76f4-65f2-4bb6-bc4c-dfda6b5924e3",
    masjid: {
      id: "cd1e53ae-28dd-4d14-bb92-56baa719caec",
      name: "Islamic Center of America1",
    },
    campaign: {
      id: "0bd40fb3-4c1c-4924-9244-3aedab98850f",
      title: "Ramadhan Donation",
    },
    amount: 1,
    currency: "USD",
    donation_type: "one_time",
    status: "succeeded",
    payment_method: "one_time_stripe",
    receipt_url: "",
    donated_at: "2026-08-07T09:16:11.365146+08:00",
  },
};

/**
 * GET /api/me/donations/:donation_id
 * Full detail of a single donation belonging to the authenticated user.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { donation_id } = await params;

  return proxyRequest<GetMyDonationDetailResponse>(req, {
    path: `/me/donations/${donation_id}`,
    mockData: MOCK_MY_DONATION_DETAIL,
    method: "GET",
  });
}