/**
 * Route Handler — Permissions Engine · Audit Log
 *
 * PERM-07  GET /api/masjids/:masjid_id/permissions/audit-log
 *   → Paginated, immutable permission audit log.
 *     Filter by actor, action type, target user, and date range.
 *     Log is append-only — no edit or delete operations exist.
 *
 * Auth: Bearer JWT · members:manage
 */

import { NextRequest, NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxyHelper";
import type { GetAuditLogResponse, AuditAction } from "@/types/api";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ masjid_id: string }>;
}

// ─── Valid Action Types ───────────────────────────────────────────────────────

const VALID_ACTIONS: Set<AuditAction> = new Set([
  "role_assigned",   // template assigned (manual or via election promotion)
  "scope_granted",
  "scope_revoked",
]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_AUDIT_LOG: GetAuditLogResponse = {
  success: true,
  message: "Audit log retrieved successfully.",
  data: [
    {
      id: "audit-uuid-0013",
      actor: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
      action: "role_assigned",
      target_user: { id: "usr-uuid-zubair-0001", name: "Zubair Malik" },
      // `scope` carries the role template name for role_assigned actions
      scope: "Treasurer",
      reason: "Appointed as new Treasurer after election.",
      timestamp: "2026-04-23T10:20:00Z",
    },
    {
      id: "audit-uuid-0012",
      actor: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
      action: "scope_revoked",
      target_user: { id: "usr-uuid-zubair-0001", name: "Zubair Malik" },
      scope: "notifications:send",
      reason: "Role reassignment pending election.",
      timestamp: "2026-04-23T10:15:00Z",
    },
    {
      id: "audit-uuid-0011",
      actor: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
      action: "scope_granted",
      target_user: { id: "usr-uuid-zubair-0001", name: "Zubair Malik" },
      scope: "donations:manage",
      reason: "Temporary cover for Treasurer absence.",
      timestamp: "2026-04-23T10:10:00Z",
    },
    {
      id: "audit-uuid-0010",
      // actor is null → system-initiated (election promotion job)
      actor: null,
      action: "role_assigned",
      target_user: { id: "usr-uuid-fatima-0002", name: "Fatimah Zahra" },
      // `scope` carries the role template name even for system-initiated promotions
      scope: "Admin",
      reason: "Promoted to Admin via election result — Chairperson position.",
      timestamp: "2026-04-20T09:00:00Z",
    },
    {
      id: "audit-uuid-0009",
      actor: { id: "usr-admin-ahmed-001", name: "Ahmed Khalil" },
      action: "role_assigned",
      target_user: { id: "usr-uuid-bilal-0003", name: "Bilal Hassan" },
      scope: "Community Outreach Lead",
      reason: "New volunteer joining outreach programme.",
      timestamp: "2026-04-18T08:00:00Z",
    },
  ],
  metadata: {
    total_data: 48,
    total_page: 5,
    page: 1,
    limit: 10,
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * PERM-07 — GET permission audit log (paginated)
 * Query params: page, limit, actor_id, action, target_user_id, from (ISO8601), to (ISO8601)
 *
 * Audit log is strictly append-only — no mutation endpoints exist.
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { masjid_id } = await context.params;

    if (!masjid_id) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: masjid_id." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Validate `action` filter if provided
    const actionFilter = searchParams.get("action");
    if (actionFilter && !VALID_ACTIONS.has(actionFilter as AuditAction)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid action filter: "${actionFilter}".`,
          errors: {
            action: [
              `Must be one of: ${[...VALID_ACTIONS].join(", ")}.`,
            ],
          },
        },
        { status: 422 }
      );
    }

    // Validate ISO8601 date range if provided
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (fromParam && isNaN(Date.parse(fromParam))) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { from: ["Must be a valid ISO8601 date string."] },
        },
        { status: 422 }
      );
    }

    if (toParam && isNaN(Date.parse(toParam))) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { to: ["Must be a valid ISO8601 date string."] },
        },
        { status: 422 }
      );
    }

    if (fromParam && toParam && new Date(fromParam) > new Date(toParam)) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: { from: ["'from' date must not be later than 'to' date."] },
        },
        { status: 422 }
      );
    }

    return proxyGET<GetAuditLogResponse>(
      req,
      `/masjids/${masjid_id}/permissions/audit-log`,
      MOCK_AUDIT_LOG
    );
  } catch (error) {
    console.error("[PERM-07] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}