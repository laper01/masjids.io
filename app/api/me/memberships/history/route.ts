/**
 * Route Handler — Member Self-Service · My Payment History
 *
 * MEM-ME-03  GET /api/me/memberships/history
 *   → Unified payment history across ALL masjid subscriptions.
 *     Ordered by paid_at descending.
 *     Auth: Bearer JWT (self only)
 *
 * ROUTING NOTE:
 *   This file is at /me/memberships/history/route.ts (STATIC segment).
 *   Next.js resolves static paths before dynamic [masjid_id].
 *   Must be at this exact path to avoid being captured by [masjid_id].
 *
 * Query Params:
 *   page    number        — default 1
 *   limit   number        — default 20
 *   status  PaymentStatus — filter: paid|failed|refunded|pending
 *   from    ISO8601       — paid_at range start
 *   to      ISO8601       — paid_at range end
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type {
  GetMyPaymentHistoryResponse,
  PaymentStatus,
} from "@/types/memberships";

const VALID_PAYMENT_STATUSES: Set<PaymentStatus> = new Set([
  "paid", "failed", "refunded", "pending",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK: GetMyPaymentHistoryResponse = {
  success: true,
  message: "Payment history retrieved successfully.",
  data: {
    history: [
      {
        payment_id: "pay_uuid_1",
        masjid: { id: "64d60f66-9b91-474e-89f7-bf598851dd84", name: "Masjid Al-Noor" },
        tier_name: "Premium Supporting Member",
        amount: 100,
        currency: "USD",
        status: "paid",
        payment_method: "credit_card",
        period_start: "2026-05-01T00:00:00Z",
        period_end: "2026-06-01T00:00:00Z",
        paid_at: "2026-05-01T08:00:00Z",
        invoice_url: "https://pay.stripe.com/invoice/inv_may_2026_alnoor",
      },
      {
        payment_id: "pay_uuid_2",
        masjid: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", name: "Masjid Ar-Rahman" },
        tier_name: "Standard Member",
        amount: 50,
        currency: "USD",
        status: "paid",
        payment_method: "credit_card",
        period_start: "2026-05-01T00:00:00Z",
        period_end: "2026-06-01T00:00:00Z",
        paid_at: "2026-05-01T09:00:00Z",
        invoice_url: "https://pay.stripe.com/invoice/inv_may_2026_arrahman",
      },
      {
        payment_id: "pay_uuid_3",
        masjid: { id: "9651ad38-3f36-4a78-b6e2-aa69ae113144", name: "Masjid Al-Falah" },
        tier_name: "Basic Member",
        amount: 25,
        currency: "USD",
        status: "failed",
        payment_method: "credit_card",
        period_start: "2026-03-01T00:00:00Z",
        period_end: "2026-04-01T00:00:00Z",
        paid_at: null,
        invoice_url: null,
      },
      {
        payment_id: "pay_uuid_4",
        masjid: { id: "64d60f66-9b91-474e-89f7-bf598851dd84", name: "Masjid Al-Noor" },
        tier_name: "Premium Supporting Member",
        amount: 100,
        currency: "USD",
        status: "paid",
        payment_method: "credit_card",
        period_start: "2026-04-01T00:00:00Z",
        period_end: "2026-05-01T00:00:00Z",
        paid_at: "2026-04-01T08:00:00Z",
        invoice_url: "https://pay.stripe.com/invoice/inv_apr_2026_alnoor",
      },
      {
        payment_id: "pay_uuid_5",
        masjid: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", name: "Masjid Ar-Rahman" },
        tier_name: "Standard Member",
        amount: 50,
        currency: "USD",
        status: "refunded",
        payment_method: "credit_card",
        period_start: "2026-04-01T00:00:00Z",
        period_end: "2026-05-01T00:00:00Z",
        paid_at: "2026-04-01T09:00:00Z",
        invoice_url: "https://pay.stripe.com/invoice/inv_apr_2026_arrahman",
      },
    ],
  },
  metadata: { page: 1, limit: 20, total: 8 },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const statusFilter = searchParams.get("status");
    if (statusFilter && !VALID_PAYMENT_STATUSES.has(statusFilter as PaymentStatus))
      return NextResponse.json({ success: false, message: `Invalid status: "${statusFilter}".`, errors: { status: [`Must be one of: ${[...VALID_PAYMENT_STATUSES].join(", ")}.`] } }, { status: 422 });

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    if (fromParam && isNaN(Date.parse(fromParam)))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { from: ["from must be a valid ISO8601 date."] } }, { status: 422 });
    if (toParam && isNaN(Date.parse(toParam)))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { to: ["to must be a valid ISO8601 date."] } }, { status: 422 });
    if (fromParam && toParam && new Date(fromParam) > new Date(toParam))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { from: ["from must not be later than to."] } }, { status: 422 });

    return proxyGET<GetMyPaymentHistoryResponse>(req, "/me/memberships/history", MOCK);
  } catch (error) {
    console.error("[MEM-ME-03]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}