/**
 * lib/jobs/promoteElectionWinner.ts
 *
 * GOV-02 — Internal Job: Promote Election Winner
 *
 * This is NOT an HTTP Route Handler. It is a server-side service function
 * called internally (e.g. from a cron job, a webhook, or a finalisation
 * trigger) when an election is closed and the winner is determined.
 *
 * Execution flow:
 *   1. Receive election_id
 *   2. Look up the winning candidate and the election's position
 *   3. Read the position → role_template mapping (set via GOV-01)
 *   4. Call the backend's assign-role-template endpoint on behalf of the
 *      system actor using a server-to-server service token
 *   5. Backend writes an audit log entry with action: "election_promotion"
 *      and actor: null (system-initiated)
 *
 * ─── Why this is not a Route Handler ─────────────────────────────────────────
 * This job runs on the backend trigger — not from a user browser request.
 * Exposing it as a public HTTP endpoint would create a dangerous unauthenticated
 * promotion vector. Instead it is invoked:
 *   - By a scheduled cron (e.g. Vercel Cron or a separate worker)
 *   - By an internal webhook from the backend when election status → "finalised"
 *   - By an admin-only internal API route protected by a shared secret header
 *
 * ─── Mock Mode ────────────────────────────────────────────────────────────────
 * When USE_MOCK_API=true, the function skips the real backend call and returns
 * a realistic mock promotion result. This makes it safe to call from tests
 * or dev environments.
 */

import type {
  AssignRoleTemplateResponse,
  PromoteElectionWinnerInput,
} from "@/types/api";

// ─── Environment ──────────────────────────────────────────────────────────────

const NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v2";

const USE_MOCK =
  process.env.USE_MOCK_API === "true" || process.env.USE_MOCK_API === "1";

/**
 * Service-to-service bearer token for system-actor calls.
 * Must be set in production environment variables.
 */
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromotionResult {
  election_id: string;
  winner_user_id: string;
  position_id: string;
  position_name: string;
  role_template_id: string;
  role_name: string;
  effective_scopes: string[];
  audit_entry_id: string;
  promoted_at: string;
}

export interface PromoteElectionWinnerResult {
  success: boolean;
  message: string;
  data: PromotionResult | null;
  error?: string;
}

// ─── Mock Result ──────────────────────────────────────────────────────────────

function buildMockResult(electionId: string): PromoteElectionWinnerResult {
  return {
    success: true,
    message: "[MOCK] Election winner promoted successfully.",
    data: {
      election_id: electionId,
      winner_user_id: "usr-uuid-fatima-0002",
      position_id: "pos-uuid-chairperson-0001",
      position_name: "Chairperson",
      role_template_id: "tmpl-admin-0001",
      role_name: "Admin",
      effective_scopes: [
        "members:manage",
        "members:view",
        "donations:manage",
        "donations:view",
        "notifications:send",
        "notifications:manage",
        "elections:manage",
      ],
      audit_entry_id: "audit-uuid-election-promo-0099",
      promoted_at: new Date().toISOString(),
    },
  };
}

// ─── Main Job Function ────────────────────────────────────────────────────────

/**
 * Promotes the winner of a finalised election to their mapped role template.
 *
 * @param input  { election_id: string }
 * @returns      PromoteElectionWinnerResult — never throws; errors are returned
 *               in the result shape so callers can log and retry safely.
 *
 * @example
 * // Called from a Vercel Cron handler or internal webhook route:
 * const result = await promoteElectionWinner({ election_id: "elec-uuid-0005" });
 * if (!result.success) {
 *   logger.error("Promotion failed", result.error);
 * }
 */
export async function promoteElectionWinner(
  input: PromoteElectionWinnerInput
): Promise<PromoteElectionWinnerResult> {
  const { election_id } = input;

  if (!election_id || typeof election_id !== "string") {
    return {
      success: false,
      message: "election_id is required.",
      data: null,
      error: "INVALID_INPUT",
    };
  }

  // ── Mock mode ────────────────────────────────────────────────────────────
  if (USE_MOCK) {
    console.info(`[promoteElectionWinner] MOCK — election_id: ${election_id}`);
    return buildMockResult(election_id);
  }

  // ── Guard: service token must be set in production ───────────────────────
  if (!SERVICE_TOKEN) {
    const error =
      "INTERNAL_SERVICE_TOKEN is not set. Cannot make system-actor backend call.";
    console.error(`[promoteElectionWinner] ${error}`);
    return { success: false, message: error, data: null, error: "MISSING_TOKEN" };
  }

  // ── Step 1: Fetch election details (winner + position) ───────────────────
  let electionData: {
    winner_user_id: string;
    masjid_id: string;
    position_id: string;
  };

  try {
    const electionRes = await fetch(
      `${NEXT_PUBLIC_API_URL}/elections/${election_id}`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!electionRes.ok) {
      const body = await electionRes.text();
      return {
        success: false,
        message: `Failed to fetch election: ${electionRes.status}`,
        data: null,
        error: body,
      };
    }

    const json = await electionRes.json();
    electionData = json.data;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[promoteElectionWinner] Fetch election failed:", error);
    return {
      success: false,
      message: "Failed to fetch election details from backend.",
      data: null,
      error,
    };
  }

  // ── Step 2: Fetch role mapping for the position ───────────────────────────
  let roleMapping: { role_template_id: string; role_name: string };

  try {
    const mappingRes = await fetch(
      `${NEXT_PUBLIC_API_URL}/masjids/${electionData.masjid_id}/elections/positions/${electionData.position_id}/role-mapping`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!mappingRes.ok) {
      const body = await mappingRes.text();
      return {
        success: false,
        message: `Failed to fetch role mapping: ${mappingRes.status}`,
        data: null,
        error: body,
      };
    }

    const json = await mappingRes.json();
    roleMapping = json.data;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[promoteElectionWinner] Fetch role mapping failed:", error);
    return {
      success: false,
      message: "Failed to fetch role mapping from backend.",
      data: null,
      error,
    };
  }

  // ── Step 3: Assign the role template to the winner ────────────────────────
  let assignResult: AssignRoleTemplateResponse;

  try {
    const assignRes = await fetch(
      `${NEXT_PUBLIC_API_URL}/masjids/${electionData.masjid_id}/permissions/assign-role-template`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: electionData.winner_user_id,
          role_template_id: roleMapping.role_template_id,
          reason: `Automatic promotion from election result — election_id: ${election_id}`,
        }),
      }
    );

    if (!assignRes.ok) {
      const body = await assignRes.text();
      return {
        success: false,
        message: `Failed to assign role template: ${assignRes.status}`,
        data: null,
        error: body,
      };
    }

    assignResult = await assignRes.json();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[promoteElectionWinner] Assign role template failed:", error);
    return {
      success: false,
      message: "Failed to assign role template to winner.",
      data: null,
      error,
    };
  }

  // ── Step 4: Return promotion result ──────────────────────────────────────
  return {
    success: true,
    message: "Election winner promoted successfully.",
    data: {
      election_id,
      winner_user_id: electionData.winner_user_id,
      position_id: electionData.position_id,
      position_name: assignResult.data.role_name, // resolved via mapping
      role_template_id: assignResult.data.role_template_id,
      role_name: assignResult.data.role_name,
      effective_scopes: assignResult.data.effective_scopes,
      audit_entry_id: assignResult.data.audit_entry_id,
      promoted_at: assignResult.data.assigned_at,
    },
  };
}