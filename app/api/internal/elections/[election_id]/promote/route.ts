/**
 * Route Handler — Governance · Internal Election Promotion Webhook
 *
 * POST /api/internal/elections/:election_id/promote
 *
 * This is the HTTP entry point that invokes the GOV-02 internal job
 * (promoteElectionWinner). It is NOT a public API endpoint.
 *
 * ─── Security Model ───────────────────────────────────────────────────────────
 * Protected by a shared secret header: `x-internal-secret`.
 * The backend sends this header when an election is finalised.
 * The value must match the INTERNAL_WEBHOOK_SECRET environment variable.
 *
 * This route should NEVER be accessible to end users. In production:
 *   - Keep INTERNAL_WEBHOOK_SECRET out of client-side bundles
 *   - Restrict access via network rules (backend → Next.js only)
 *   - Consider IP allowlisting at the reverse proxy level
 *
 * ─── Invocation Scenarios ─────────────────────────────────────────────────────
 *   1. Backend webhook  → backend calls this route after finalising an election
 *   2. Cron job         → a Vercel Cron handler imports promoteElectionWinner
 *                         directly and calls it — bypasses this HTTP route
 *   3. Admin trigger    → an admin dashboard button POSTs here with the secret
 *
 * Auth: x-internal-secret header (shared secret, NOT a user JWT)
 */

import { NextRequest, NextResponse } from "next/server";
import { promoteElectionWinner } from "@/lib/jobs/promoteElectionWinner";

// ─── Route Context ────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ election_id: string }>;
}

// ─── Secret Validation ────────────────────────────────────────────────────────

const INTERNAL_SECRET = process.env.INTERNAL_WEBHOOK_SECRET ?? "";

function validateInternalSecret(req: NextRequest): boolean {
  if (!INTERNAL_SECRET) {
    // If secret is not configured, block all requests in production
    if (process.env.NODE_ENV === "production") return false;
    // Allow in development only if explicitly unset (dev convenience)
    return true;
  }
  const provided = req.headers.get("x-internal-secret");
  return provided === INTERNAL_SECRET;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST — trigger election winner promotion
 * No request body required — election_id is in the path.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // ── Auth: shared secret check ─────────────────────────────────────────────
  if (!validateInternalSecret(req)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  const { election_id } = await context.params;

  if (!election_id || election_id.trim() === "") {
    return NextResponse.json(
      { success: false, message: "Missing required parameter: election_id." },
      { status: 400 }
    );
  }

  console.info(
    `[GOV-02] Promotion triggered for election_id: ${election_id}`
  );

  const result = await promoteElectionWinner({ election_id });

  if (!result.success) {
    console.error(
      `[GOV-02] Promotion failed for election_id: ${election_id}`,
      result.error
    );
    return NextResponse.json(
      {
        success: false,
        message: result.message,
        error: result.error,
      },
      { status: 500 }
    );
  }

  console.info(
    `[GOV-02] Promotion succeeded — user ${result.data?.winner_user_id} → role ${result.data?.role_name}`
  );

  return NextResponse.json(
    { success: true, message: result.message, data: result.data },
    { status: 200 }
  );
}