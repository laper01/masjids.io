/**
 * hooks/donations/useMyDonations.ts
 *
 * Client-side data-fetching hook for the authenticated user's own
 * donation history (self-service "me" namespace — NOT masjid-scoped).
 * This is separate from hooks/donations/useDonations.ts, which handles
 * masjid-scoped campaign management and per-campaign donation ledgers.
 *
 * Provides:
 *   - getMyDonations(query)            → GET /api/me/donations              [auth, paginated]
 *   - getMyDonationDetail(donationId)  → GET /api/me/donations/:donation_id [auth]
 *
 * Usage:
 *   const {
 *     myDonations, myDonationDetail,
 *     loading, error,
 *     getMyDonations, getMyDonationDetail,
 *     clearError, clearMyDonationDetail,
 *   } = useMyDonations();
 *
 *   useEffect(() => {
 *     getMyDonations({ page: 1, limit: 20 });
 *   }, [getMyDonations]);
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  GetMyDonationsResponse,
  GetMyDonationsQuery,
  GetMyDonationDetailResponse,
} from "@/types/donations";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface MyDonationsState {
  /** Paginated list of the current user's donations, cross-masjid */
  myDonations: GetMyDonationsResponse | null;
  /** Full detail of the last fetched donation */
  myDonationDetail: GetMyDonationDetailResponse | null;
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
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useMyDonations() {
  const [state, setState] = useState<MyDonationsState>({
    myDonations: null,
    myDonationDetail: null,
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── GET /me/donations — my donation history (paginated) ───────────────────

  const getMyDonations = useCallback(
    async (query: GetMyDonationsQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetMyDonationsResponse>(
          `/api/me/donations${qs}`
        );
        setState((prev) => ({
          ...prev,
          myDonations: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch your donations.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── GET /me/donations/:id — single donation detail ─────────────────────────

  const getMyDonationDetail = useCallback(
    async (donationId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetMyDonationDetailResponse>(
          `/api/me/donations/${donationId}`
        );
        setState((prev) => ({
          ...prev,
          myDonationDetail: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch donation detail.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── Utils ───────────────────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearMyDonationDetail = useCallback(() => {
    setState((prev) => ({ ...prev, myDonationDetail: null }));
  }, []);

  return {
    // State
    myDonations: state.myDonations,
    myDonationDetail: state.myDonationDetail,
    loading: state.loading,
    error: state.error,

    // Actions
    getMyDonations,
    getMyDonationDetail,

    // Utils
    clearError,
    clearMyDonationDetail,
  };
}