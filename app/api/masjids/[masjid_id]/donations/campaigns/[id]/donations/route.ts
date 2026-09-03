/**
 * Route Handler — Donation Campaigns · Donations List
 *
 * DON-06  GET /api/masjids/:masjid_id/donations/campaigns/:id/donations
 *   → Paginated list of individual donation records for a campaign.
 *     Includes donor info, amount, type, and Stripe payment status.
 *     Useful for the masjid admin donation ledger view.
 *
 * Auth: Bearer JWT · donations:view (required — donor PII must not be public)
 *
 * Query Params:
 *   page   number              — default 1
 *   limit  number              — default 10, max 50
 *   type   one_time|recurring  — filter by donation type
 *   from   ISO8601 string      — filter donations on or after this date
 *   to     ISO8601 string      — filter donations on or before this date
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetDonationsResponse } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string; id: string }>;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DONATIONS: GetDonationsResponse = {
  success: true,
  message: "Donations retrieved successfully.",
  data: {
    campaign_id: "camp-uuid-0001",
    total_raised: 87430,
    donor_count: 412,
    data: [
      {
        id: "don-uuid-0001",
        user: { id: "usr-uuid-zubair-0001", name: "Zubair Malik" },
        amount: 10000,
        currency: "GBP",
        donation_type: "one_time",
        status: "succeeded",
        donated_at: "2026-04-23T12:00:00Z",
      },
      {
        id: "don-uuid-0002",
        user: { id: "usr-uuid-fatima-0002", name: "Fatimah Zahra" },
        amount: 2500,
        currency: "GBP",
        donation_type: "recurring",
        status: "succeeded",
        donated_at: "2026-04-23T10:30:00Z",
      },
      {
        id: "don-uuid-0003",
        user: { id: "usr-uuid-bilal-0003", name: "Bilal Hassan" },
        amount: 5000,
        currency: "GBP",
        donation_type: "one_time",
        status: "succeeded",
        donated_at: "2026-04-22T18:15:00Z",
      },
      {
        id: "don-uuid-0004",
        user: { id: "usr-uuid-aisha-0004", name: "Aisha Rahman" },
        amount: 1000,
        currency: "GBP",
        donation_type: "recurring",
        status: "succeeded",
        donated_at: "2026-04-22T14:00:00Z",
      },
      {
        id: "don-uuid-0005",
        user: { id: "usr-uuid-umar-0007", name: "Umar Farooq" },
        amount: 20000,
        currency: "GBP",
        donation_type: "one_time",
        status: "succeeded",
        donated_at: "2026-04-21T09:45:00Z",
      },
      {
        id: "don-uuid-0006",
        user: { id: "usr-uuid-khadijah-0006", name: "Khadijah Usman" },
        amount: 500,
        currency: "GBP",
        donation_type: "recurring",
        status: "succeeded",
        donated_at: "2026-04-21T08:00:00Z",
      },
      {
        id: "don-uuid-0007",
        user: { id: "usr-uuid-ibrahim-0009", name: "Ibrahim Al-Amin" },
        amount: 3000,
        currency: "GBP",
        donation_type: "one_time",
        status: "succeeded",
        donated_at: "2026-04-20T16:30:00Z",
      },
      {
        id: "don-uuid-0008",
        user: { id: "usr-uuid-maryam-0008", name: "Maryam Idris" },
        amount: 7500,
        currency: "GBP",
        donation_type: "one_time",
        status: "succeeded",
        donated_at: "2026-04-20T11:00:00Z",
      },
      {
        id: "don-uuid-0009",
        user: { id: "usr-uuid-yusuf-0005", name: "Yusuf Al-Qardawi" },
        amount: 2500,
        currency: "GBP",
        donation_type: "recurring",
        status: "pending",
        donated_at: "2026-04-20T09:15:00Z",
      },
      {
        id: "don-uuid-0010",
        user: { id: "usr-uuid-safiya-0010", name: "Safiyah Ndiaye" },
        amount: 1500,
        currency: "GBP",
        donation_type: "one_time",
        status: "failed",
        donated_at: "2026-04-19T17:00:00Z",
      },
    ],
    metadata: {
      total_data: 412,
      total_page: 42,
      page: 1,
      limit: 10,
    },
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * DON-06 — GET paginated donations list for a campaign
 * Query params: page, limit, type, from, to
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id, id } = await context.params;

    if (!masjid_id || !id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters: masjid_id and id.",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Validate type filter
    const typeFilter = searchParams.get("type");
    if (typeFilter && !["one_time", "recurring"].includes(typeFilter)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid type filter: "${typeFilter}".`,
          errors: { type: ['Must be one of: one_time, recurring.'] },
        },
        { status: 422 }
      );
    }

    // Validate date range
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (fromParam && isNaN(Date.parse(fromParam))) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { from: ["from must be a valid ISO8601 date string."] },
        },
        { status: 422 }
      );
    }

    if (toParam && isNaN(Date.parse(toParam))) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { to: ["to must be a valid ISO8601 date string."] },
        },
        { status: 422 }
      );
    }

    if (fromParam && toParam && new Date(fromParam) > new Date(toParam)) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { from: ["from date must not be later than to date."] },
        },
        { status: 422 }
      );
    }

    // Validate pagination
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    if (pageRaw !== null) {
      const page = Number(pageRaw);
      if (!Number.isInteger(page) || page < 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { page: ["page must be a positive integer."] },
          },
          { status: 422 }
        );
      }
    }

    if (limitRaw !== null) {
      const limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed.",
            errors: { limit: ["limit must be an integer between 1 and 50."] },
          },
          { status: 422 }
        );
      }
    }

    return proxyGET<GetDonationsResponse>(
      req,
      `/masjids/${masjid_id}/donations/campaigns/${id}/donations`,
      MOCK_DONATIONS
    );
  } catch (error) {
    console.error("[DON-06] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}