/**
 * Route Handler — Admin Payments · Collection
 *
 * MEM-MISS-06  GET  /api/masjids/:masjid_id/payments
 *   → All payment transactions across all memberships.
 *     Auth: Bearer JWT · members:manage
 *
 * NOTE on sibling static routes:
 *   /payments/webhook          → webhook/route.ts    (MEM-MISS-08)
 *   /payments/onboarding/status → onboarding/status/route.ts (MEM-MISS-09)
 *   /payments/:payment_id      → [payment_id]/route.ts (MEM-MISS-07)
 *   Next.js resolves static before dynamic — no conflict.
 *
 * Query Params:
 *   page     number        — default 1, max 100
 *   limit    number        — default 20
 *   status   PaymentStatus — paid|failed|refunded|pending
 *   tier_id  UUID
 *   from     ISO8601
 *   to       ISO8601
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type {
  GetAdminPaymentsResponse,
  PaymentStatus,
} from "@/types/memberships";

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

const VALID_STATUSES: Set<PaymentStatus> = new Set(["paid", "failed", "refunded", "pending"]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK: GetAdminPaymentsResponse = {
  summary: {
    total_collected: 12400,
    currency: "USD",
    period: "2026-04-01 to 2026-04-30",
  },
  data: [
    {
      id: "pay_uuid_a01",
      membership_id: "mem_uuid_001",
      user_id: "usr-uuid-zubair-0001",
      display_name: "Zubair Malik",
      tier_name: "Premium Supporting Member",
      amount: 100,
      currency: "USD",
      status: "paid",
      paid_at: "2026-05-01T08:00:00Z",
    },
    {
      id: "pay_uuid_a02",
      membership_id: "mem_uuid_002",
      user_id: "usr-uuid-fatima-0002",
      display_name: "Fatimah Zahra",
      tier_name: "Premium Supporting Member",
      amount: 100,
      currency: "USD",
      status: "paid",
      paid_at: "2026-05-01T09:00:00Z",
    },
    {
      id: "pay_uuid_a03",
      membership_id: "mem_uuid_004",
      user_id: "usr-uuid-aisha-0004",
      display_name: "Aisha Rahman",
      tier_name: "Basic Member",
      amount: 25,
      currency: "USD",
      status: "paid",
      paid_at: "2026-05-01T10:00:00Z",
    },
    {
      id: "pay_uuid_a04",
      membership_id: "mem_uuid_003",
      user_id: "usr-uuid-bilal-0003",
      display_name: "Bilal Hassan",
      tier_name: "Basic Member",
      amount: 25,
      currency: "USD",
      status: "failed",
      paid_at: null,
    },
  ],
  pagination: { page: 1, limit: 20, total: 124 },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;
    if (!masjid_id)
      return NextResponse.json({ success: false, message: "Missing required parameter: masjid_id." }, { status: 400 });

    const { searchParams } = new URL(req.url);

    const statusFilter = searchParams.get("status");
    if (statusFilter && !VALID_STATUSES.has(statusFilter as PaymentStatus))
      return NextResponse.json({ success: false, message: `Invalid status: "${statusFilter}".`, errors: { status: [`Must be one of: ${[...VALID_STATUSES].join(", ")}.`] } }, { status: 422 });

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    if (fromParam && isNaN(Date.parse(fromParam)))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { from: ["Must be a valid ISO8601 date."] } }, { status: 422 });
    if (toParam && isNaN(Date.parse(toParam)))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { to: ["Must be a valid ISO8601 date."] } }, { status: 422 });
    if (fromParam && toParam && new Date(fromParam) > new Date(toParam))
      return NextResponse.json({ success: false, message: "Validation failed.", errors: { from: ["from must not be later than to."] } }, { status: 422 });

    return proxyGET<GetAdminPaymentsResponse>(req, `/masjids/${masjid_id}/payments`, MOCK);
  } catch (error) {
    console.error("[MEM-MISS-06]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}