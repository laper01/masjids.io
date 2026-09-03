/**
 * Route Handler — Admin Payments · Single Payment Detail
 *
 * MEM-MISS-07  GET /api/masjids/:masjid_id/payments/:payment_id
 *   → Full payment detail including failure_reason and gateway_ref.
 *     Auth: Bearer JWT · members:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { AdminPaymentDetail } from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string; payment_id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PAID: AdminPaymentDetail = {
  id: "pay_uuid_a01",
  membership_id: "mem_uuid_001",
  user_id: "usr-uuid-zubair-0001",
  display_name: "Zubair Malik",
  tier_name: "Premium Supporting Member",
  amount: 100,
  currency: "USD",
  status: "paid",
  failure_reason: null,
  gateway_ref: "ch_3QABCExamplePaid",
  payment_method: "credit_card",
  period_start: "2026-05-01T00:00:00Z",
  period_end: "2026-06-01T00:00:00Z",
  created_at: "2026-05-01T08:00:00Z",
  paid_at: "2026-05-01T08:05:00Z",   // ← add this
  invoice_url: "https://pay.stripe.com/invoice/inv_may_2026",
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id, payment_id } = await context.params;
    if (!masjid_id || !payment_id)
      return NextResponse.json({ success: false, message: "Missing required parameters." }, { status: 400 });

    return proxyGET<AdminPaymentDetail>(req, `/masjids/${masjid_id}/payments/${payment_id}`, MOCK_PAID);
  } catch (error) {
    console.error("[MEM-MISS-07]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}