/**
 * hooks/donations/useDonations.ts
 *
 * Client-side data-fetching hook for the Donation Campaigns module
 * (DON-01 → DON-06). DON-07 (Stripe webhook) is server-only — no client hook needed.
 *
 * Provides:
 *   - getCampaigns(masjidId, query)             → DON-02 GET  [paginated, public]
 *   - getCampaignDetail(masjidId, campaignId)   → DON-03 GET  [public]
 *   - createCampaign(masjidId, payload)         → DON-01 POST [auth: donations:manage]
 *   - updateCampaign(masjidId, id, payload)     → DON-04 PUT  [auth: donations:manage]
 *   - initiateDonation(masjidId, id, payload)   → DON-05 POST [auth: required]
 *   - getDonations(masjidId, id, query)         → DON-06 GET  [auth: donations:view]
 *
 * Optimistic state updates:
 *   - createCampaign  → prepends new item to campaigns list
 *   - updateCampaign  → patches matching item in list + detail
 *
 * Stripe integration note:
 *   initiateDonation returns a client_secret. Pass it to Stripe.js:
 *     const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!);
 *     await stripe.confirmPayment({ clientSecret, confirmParams: { ... } });
 *
 * Usage:
 *   const {
 *     campaigns, campaignDetail, donations,
 *     loading, error,
 *     getCampaigns, getCampaignDetail, createCampaign,
 *     updateCampaign, initiateDonation, getDonations,
 *   } = useDonations();
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  GetCampaignsResponse,
  GetCampaignDetailResponse,
  CreateCampaignResponse,
  UpdateCampaignResponse,
  InitiateDonationResponse,
  GetDonationsResponse,
  ApiErrorResponse,
  GetCampaignsQuery,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  InitiateDonationRequest,
  GetDonationsQuery,
  CampaignListItem,
} from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface DonationsState {
  /** Paginated campaigns list for the last queried masjid */
  campaigns: GetCampaignsResponse | null;
  /** Full detail of the last fetched campaign */
  campaignDetail: GetCampaignDetailResponse | null;
  /** Paginated donations ledger for the last queried campaign */
  donations: GetDonationsResponse | null;
  /**
   * Stripe client_secret from the last initiateDonation call.
   * Pass this to Stripe.js confirmPayment() to complete the payment.
   * Clear after use — never persist this value.
   */
  stripeClientSecret: string | null;
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

export function useDonations() {
  const [state, setState] = useState<DonationsState>({
    campaigns: null,
    campaignDetail: null,
    donations: null,
    stripeClientSecret: null,
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── DON-02: GET campaigns list (PUBLIC, paginated) ────────────────────────

  const getCampaigns = useCallback(
    async (masjidId: string, query: GetCampaignsQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetCampaignsResponse>(
          `/api/masjids/${masjidId}/donations/campaigns${qs}`
        );
        setState((prev) => ({
          ...prev,
          campaigns: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch campaigns.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── DON-03: GET campaign detail (PUBLIC) ──────────────────────────────────

  const getCampaignDetail = useCallback(
    async (masjidId: string, campaignId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetCampaignDetailResponse>(
          `/api/masjids/${masjidId}/donations/campaigns/${campaignId}`
        );
        setState((prev) => ({
          ...prev,
          campaignDetail: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch campaign details.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── DON-01: POST create campaign ──────────────────────────────────────────

  const createCampaign = useCallback(
    async (masjidId: string, payload: CreateCampaignRequest) => {
      startLoading();
      try {
        const data = await apiFetch<CreateCampaignResponse>(
          `/api/masjids/${masjidId}/donations/campaigns`,
          { method: "POST", body: JSON.stringify(payload) }
        );

        // Optimistically prepend new campaign to list
        setState((prev) => {
          if (!prev.campaigns) {
            return { ...prev, loading: false, error: null };
          }

          const newItem: CampaignListItem = {
            id: data.data.id,
            title: data.data.title,
            goal_amount: data.data.goal_amount,
            raised_amount: 0,
            currency: data.data.currency,
            donation_type: data.data.donation_type,
            status: data.data.status,
            progress_pct: 0,
            donor_count: 0,
          };

          return {
            ...prev,
            loading: false,
            error: null,
            campaigns: {
              ...prev.campaigns,
              data: [newItem, ...prev.campaigns.data],
              metadata: {
                ...prev.campaigns.metadata,
                total_data: prev.campaigns.metadata.total_data + 1,
              },
            },
          };
        });

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create campaign.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── DON-04: PUT update campaign ───────────────────────────────────────────

  const updateCampaign = useCallback(
    async (
      masjidId: string,
      campaignId: string,
      payload: UpdateCampaignRequest
    ) => {
      startLoading();
      try {
        const data = await apiFetch<UpdateCampaignResponse>(
          `/api/masjids/${masjidId}/donations/campaigns/${campaignId}`,
          { method: "PUT", body: JSON.stringify(payload) }
        );

        setState((prev) => {
          // Patch list item
          const updatedCampaigns = prev.campaigns
            ? {
                ...prev.campaigns,
                data: prev.campaigns.data.map((c) =>
                  c.id === campaignId
                    ? {
                        ...c,
                        title: data.data.title,
                        goal_amount: data.data.goal_amount,
                        status: data.data.status,
                      }
                    : c
                ),
              }
            : null;

          // Patch detail if currently loaded
          const updatedDetail =
            prev.campaignDetail?.data?.id === campaignId
              ? {
                  ...prev.campaignDetail,
                  data: {
                    ...prev.campaignDetail.data,
                    title: data.data.title,
                    goal_amount: data.data.goal_amount,
                    status: data.data.status,
                  },
                }
              : prev.campaignDetail;

          return {
            ...prev,
            loading: false,
            error: null,
            campaigns: updatedCampaigns,
            campaignDetail: updatedDetail,
          };
        });

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update campaign.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── DON-05: POST initiate donation (Stripe PaymentIntent) ─────────────────

  const initiateDonation = useCallback(
    async (
      masjidId: string,
      campaignId: string,
      payload: InitiateDonationRequest
    ) => {
      startLoading();
      try {
        const data = await apiFetch<InitiateDonationResponse>(
          `/api/masjids/${masjidId}/donations/campaigns/${campaignId}/donate`,
          { method: "POST", body: JSON.stringify(payload) }
        );

        // Store client_secret for Stripe.js — caller must use it immediately
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          stripeClientSecret: data.data.client_secret,
        }));

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initiate donation.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── DON-06: GET donations ledger (paginated) ──────────────────────────────

  const getDonations = useCallback(
    async (
      masjidId: string,
      campaignId: string,
      query: GetDonationsQuery = {}
    ) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetDonationsResponse>(
          `/api/masjids/${masjidId}/donations/campaigns/${campaignId}/donations${qs}`
        );
        setState((prev) => ({
          ...prev,
          donations: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch donations.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── Derived helpers ───────────────────────────────────────────────────────

  /**
   * Clears the Stripe client_secret from state after it has been consumed
   * by Stripe.js. Call this after confirmPayment() resolves.
   */
  const clearClientSecret = useCallback(() => {
    setState((prev) => ({ ...prev, stripeClientSecret: null }));
  }, []);

  /** Clears the campaign detail — call on detail page unmount */
  const clearCampaignDetail = useCallback(() => {
    setState((prev) => ({ ...prev, campaignDetail: null }));
  }, []);

  /** Clears the donations ledger — call when switching campaigns */
  const clearDonations = useCallback(() => {
    setState((prev) => ({ ...prev, donations: null }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    campaigns: state.campaigns,
    campaignDetail: state.campaignDetail,
    donations: state.donations,
    stripeClientSecret: state.stripeClientSecret,
    loading: state.loading,
    error: state.error,

    // Actions
    getCampaigns,
    getCampaignDetail,
    createCampaign,
    updateCampaign,
    initiateDonation,
    getDonations,

    // Utils
    clearClientSecret,
    clearCampaignDetail,
    clearDonations,
    clearError,
  };
}