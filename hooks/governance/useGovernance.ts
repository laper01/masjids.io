/**
 * hooks/governance/useGovernance.ts
 *
 * Client-side data-fetching hook for the Governance & Elections module
 * (GOV-01 → GOV-02).
 *
 * Provides:
 *   - mapElectionRole(masjidId, positionId, payload)
 *       → GOV-01 PUT  — map a position to a role template
 *
 *   - triggerWinnerPromotion(electionId)
 *       → GOV-02 POST (internal webhook) — promote the election winner
 *         NOTE: Only usable from admin/server contexts. Requires the
 *         internal webhook secret to be forwarded via a server action.
 *         Calling this from an unauthenticated browser context will 401.
 *
 * State:
 *   - roleMappings: Record<positionId, MapElectionRoleResponse>
 *       Stores all mappings set in the current session, keyed by position ID.
 *   - loading: boolean
 *   - error: string | null
 *
 * Usage:
 *   const { mapElectionRole, roleMappings, loading, error } = useGovernance();
 *
 *   // Map Chairperson position to Admin role template
 *   await mapElectionRole(
 *     "msj-uuid-al-noor-0001",
 *     "pos-uuid-chairperson-0001",
 *     { role_template_id: "tmpl-admin-0001", notes: "Chairperson gets full admin access." }
 *   );
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  MapElectionRoleResponse,
  ApiErrorResponse,
  MapElectionRoleRequest,
} from "@/types/api";
import type { PromoteElectionWinnerResult } from "@/lib/jobs/promoteElectionWinner";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface GovernanceState {
  /**
   * Role mappings set in the current session, keyed by position ID.
   * Persists across multiple mapElectionRole calls so the UI can display
   * all configured positions without a refetch.
   */
  roleMappings: Record<string, MapElectionRoleResponse["data"]>;
  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useGovernance() {
  const [state, setState] = useState<GovernanceState>({
    roleMappings: {},
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── GOV-01: PUT map election position to a role template ──────────────────

  const mapElectionRole = useCallback(
    async (
      masjidId: string,
      positionId: string,
      payload: MapElectionRoleRequest
    ) => {
      startLoading();
      try {
        const data = await apiFetch<MapElectionRoleResponse>(
          `/api/masjids/${masjidId}/elections/positions/${positionId}/role-mapping`,
          { method: "PUT", body: JSON.stringify(payload) }
        );

        // Store mapping in session state keyed by position ID
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          roleMappings: {
            ...prev.roleMappings,
            [positionId]: data.data,
          },
        }));

        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to map election position to role template.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── GOV-02: POST trigger election winner promotion (internal/admin only) ──

  /**
   * Triggers the internal promotion job via the BFF's internal webhook route.
   *
   * IMPORTANT: This function requires the internal webhook secret to be
   * forwarded in the `x-internal-secret` header. In production this should
   * only be called from:
   *   - A Next.js Server Action (which can read INTERNAL_WEBHOOK_SECRET server-side)
   *   - An admin panel that proxies through a protected server route
   *
   * Calling this from a public browser context without the secret will receive 401.
   *
   * @param electionId  - The ID of the finalised election to process
   * @param secret      - The INTERNAL_WEBHOOK_SECRET value (server-side only)
   */
  const triggerWinnerPromotion = useCallback(
    async (electionId: string, secret?: string) => {
      startLoading();
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (secret) {
          headers["x-internal-secret"] = secret;
        }

        const data = await apiFetch<PromoteElectionWinnerResult>(
          `/api/internal/elections/${electionId}/promote`,
          { method: "POST", headers }
        );

        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to trigger election winner promotion.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── Derived helpers ───────────────────────────────────────────────────────

  /**
   * Returns the role mapping for a specific position ID if it was set
   * during the current session, or undefined if not yet mapped.
   */
  const getMappingForPosition = useCallback(
    (positionId: string) => state.roleMappings[positionId] ?? null,
    [state.roleMappings]
  );

  /**
   * Returns true if the given position has a role mapping configured
   * in the current session.
   */
  const isPositionMapped = useCallback(
    (positionId: string) => positionId in state.roleMappings,
    [state.roleMappings]
  );

  // ── Clear error ───────────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    roleMappings: state.roleMappings,
    loading: state.loading,
    error: state.error,

    // Actions
    mapElectionRole,
    triggerWinnerPromotion,

    // Derived helpers
    getMappingForPosition,
    isPositionMapped,

    // Utils
    clearError,
  };
}