/**
 * Route Handler — Admin Memberships · Payment History
 *
 * MEM-MISS-05  GET /api/masjids/:masjid_id/memberships/:membership_id/history
 *   → Paginated payment transactions for a single membership.
 *     Auth: Bearer JWT · members:manage OR self (own membership)
 *
 * Query Params:
 *   page    number        — default 1
 *   limit   number        — default 20
 *   status  PaymentStatus — paid|failed|refunded|pending
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type {
  GetMembershipHistoryResponse,
  PaymentStatus,
} from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string; membership_id: string }>;
}

const VALID_STATUSES: Set<PaymentStatus> = new Set(["paid", "failed", "refunded", "pending"]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK: GetMembershipHistoryResponse = {
  data: [
    {
      id: "pay_uuid_may",
      amount: 100,
      currency: "USD",
      status: "paid",
      payment_method: "credit_card",
      period_start: "2026-05-01T00:00:00Z",
      period_end: "2026-06-01T00:00:00Z",
      paid_at: "2026-05-01T08:00:00Z",
      invoice_url: "https://pay.stripe.com/invoice/inv_may_2026",
    },
    {
      id: "pay_uuid_apr",
      amount: 100,
      currency: "USD",
      status: "paid",
      payment_method: "credit_card",
      period_start: "2026-04-01T00:00:00Z",
      period_end: "2026-05-01T00:00:00Z",
      paid_at: "2026-04-01T08:00:00Z",
      invoice_url: "https://pay.stripe.com/invoice/inv_apr_2026",
    },
  ],
  pagination: { page: 1, limit: 20, total: 2 },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, membership_id } = await context.params;
    if (!masjid_id || !membership_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    if (statusFilter && !VALID_STATUSES.has(statusFilter as PaymentStatus))
      return NextResponse.json({ success: false, message: `Invalid status: "${statusFilter}".`, errors: { status: [`Must be one of: ${[...VALID_STATUSES].join(", ")}.`] } }, { status: 422 });

    return proxyGET<GetMembershipHistoryResponse>(req, `/masjids/${masjid_id}/memberships/${membership_id}/history`, MOCK);
  } catch (error) {
    console.error("[MEM-MISS-05]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}