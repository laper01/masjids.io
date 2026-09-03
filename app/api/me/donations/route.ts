import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";
import type { GetMyDonationsResponse } from "@/types/donations";

const MOCK_MY_DONATIONS: GetMyDonationsResponse = {
  success: true,
  message: "ok",
  data: {
    donations: [
      {
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
        status: "succeeded",
        donated_at: "2026-08-07T09:16:11.365146+08:00",
      },
    ],
    summary: {
      total_donated: 1,
      currency: "USD",
    },
  },
  metadata: {
    total_data: 1,
    total_page: 1,
    page: 1,
    limit: 20,
  },
};

/**
 * GET /api/me/donations
 * Self-service donation history for the currently authenticated user,
 * across all masjids/campaigns they've donated to.
 */
export async function GET(req: NextRequest) {
  return proxyRequest<GetMyDonationsResponse>(req, {
    path: "/me/donations",
    mockData: MOCK_MY_DONATIONS,
    method: "GET",
  });
}