/**
 * hooks/staff/useStaff.ts
 *
 * Client-side data-fetching hook for the User Invitation & Staff Management
 * module (INV-01 → INV-06).
 *
 * Provides:
 *   - inviteStaff(masjidId, payload)           → INV-01 POST
 *   - getInvitations(masjidId, query)          → INV-02 GET  [paginated]
 *   - revokeInvitation(masjidId, inviteId)     → INV-03 DELETE
 *   - acceptInvitation(token)                  → INV-04 POST
 *   - getStaff(masjidId, query)                → INV-05 GET  [paginated]
 *   - removeStaff(masjidId, userId)            → INV-06 DELETE
 *
 * Optimistic state updates:
 *   - inviteStaff       → prepends new invitation to invitations list
 *   - revokeInvitation  → patches status → "revoked" in invitations list
 *   - removeStaff       → removes member from staff list
 *
 * Usage:
 *   const {
 *     staff, invitations,
 *     loading, error,
 *     getStaff, getInvitations, inviteStaff,
 *     revokeInvitation, removeStaff, acceptInvitation,
 *   } = useStaff();
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  InviteStaffResponse,
  GetInvitationsResponse,
  RevokeInvitationResponse,
  AcceptInvitationResponse,
  GetStaffResponse,
  RemoveStaffResponse,
  ApiErrorResponse,
  InviteStaffRequest,
  GetInvitationsQuery,
  GetStaffQuery,
  InvitationData,
} from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface StaffState {
  /** Paginated staff members list */
  staff: GetStaffResponse | null;
  /** Paginated invitations list (all statuses) */
  invitations: GetInvitationsResponse | null;
  /**
   * Result of the most recent acceptInvitation call.
   * Contains masjid info + effective scopes granted to the new member.
   */
  acceptedInvitation: AcceptInvitationResponse | null;
  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    new URLSearchParams(
      entries.map(([k, v]) => [k, String(v)])
    ).toString()
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useStaff() {
  const [state, setState] = useState<StaffState>({
    staff: null,
    invitations: null,
    acceptedInvitation: null,
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── INV-01: POST send staff invitation ────────────────────────────────────

  const inviteStaff = useCallback(
    async (masjidId: string, payload: InviteStaffRequest) => {
      startLoading();
      try {
        const data = await apiFetch<InviteStaffResponse>(
          `/api/masjids/${masjidId}/staff/invite`,
          { method: "POST", body: JSON.stringify(payload) }
        );

        // Optimistically prepend new invitation to list
        setState((prev) => {
          if (!prev.invitations) {
            return { ...prev, loading: false, error: null };
          }

          const newInvitation: InvitationData = data.data;

          return {
            ...prev,
            loading: false,
            error: null,
            invitations: {
              ...prev.invitations,
              data: [newInvitation, ...prev.invitations.data],
              metadata: {
                ...prev.invitations.metadata,
                total_data: prev.invitations.metadata.total_data + 1,
              },
            },
          };
        });

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send invitation.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── INV-02: GET paginated invitations list ────────────────────────────────

  const getInvitations = useCallback(
    async (masjidId: string, query: GetInvitationsQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetInvitationsResponse>(
          `/api/masjids/${masjidId}/staff/invitations${qs}`
        );
        setState((prev) => ({
          ...prev,
          invitations: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch invitations.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── INV-03: DELETE revoke a pending invitation ────────────────────────────

  const revokeInvitation = useCallback(
    async (masjidId: string, inviteId: string) => {
      startLoading();
      try {
        const data = await apiFetch<RevokeInvitationResponse>(
          `/api/masjids/${masjidId}/staff/invitations/${inviteId}`,
          { method: "DELETE" }
        );

        // Optimistically patch the invitation status in list
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          invitations: prev.invitations
            ? {
                ...prev.invitations,
                data: prev.invitations.data.map((inv) =>
                  inv.invite_id === inviteId
                    ? { ...inv, status: "revoked" as const }
                    : inv
                ),
              }
            : null,
        }));

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to revoke invitation.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── INV-04: POST accept invitation via token ──────────────────────────────

  const acceptInvitation = useCallback(async (token: string) => {
    startLoading();
    try {
      const data = await apiFetch<AcceptInvitationResponse>(
        `/api/invitations/${token}/accept`,
        { method: "POST" }
      );

      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        acceptedInvitation: data,
      }));

      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to accept invitation.";
      setError(message);
      return null;
    }
  }, []);

  // ── INV-05: GET paginated staff list ──────────────────────────────────────

  const getStaff = useCallback(
    async (masjidId: string, query: GetStaffQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetStaffResponse>(
          `/api/masjids/${masjidId}/staff${qs}`
        );
        setState((prev) => ({
          ...prev,
          staff: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch staff members.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── INV-06: DELETE remove a staff member ──────────────────────────────────

  const removeStaff = useCallback(
    async (masjidId: string, userId: string) => {
      startLoading();
      try {
        const data = await apiFetch<RemoveStaffResponse>(
          `/api/masjids/${masjidId}/staff/${userId}`,
          { method: "DELETE" }
        );

        // Optimistically remove member from staff list
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          staff: prev.staff
            ? {
                ...prev.staff,
                data: prev.staff.data.filter((m) => m.user_id !== userId),
                metadata: {
                  ...prev.staff.metadata,
                  total_data: Math.max(0, prev.staff.metadata.total_data - 1),
                },
              }
            : null,
        }));

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove staff member.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── Derived helpers ───────────────────────────────────────────────────────

  /** Count of pending invitations from current list state */
  const pendingInvitationCount = state.invitations
    ? state.invitations.data.filter((inv) => inv.status === "pending").length
    : 0;

  /** Clear the accepted invitation result — call after onboarding flow completes */
  const clearAcceptedInvitation = useCallback(() => {
    setState((prev) => ({ ...prev, acceptedInvitation: null }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    staff: state.staff,
    invitations: state.invitations,
    acceptedInvitation: state.acceptedInvitation,
    pendingInvitationCount,
    loading: state.loading,
    error: state.error,

    // Actions
    inviteStaff,
    getInvitations,
    revokeInvitation,
    acceptInvitation,
    getStaff,
    removeStaff,

    // Utils
    clearAcceptedInvitation,
    clearError,
  };
}