/**
 * hooks/memberships/useMemberships.ts
 *
 * Client-side data-fetching hook for the full Membership & Payment module.
 * Covers MEM-ME-01–04, MEM-MISS-01–09, Tier CRUD, and Subscribe.
 *
 * ─── Member self-service (no special scope) ──────────────────────────────────
 *   - getMyMemberships(query)                  MEM-ME-01  GET
 *   - getMyMembershipAt(masjidId)              MEM-ME-02  GET
 *   - getMyPaymentHistory(query)               MEM-ME-03  GET
 *   - cancelMyMembership(masjidId, reason?)    MEM-ME-04  DELETE
 *   - getMyMasjidMembership(masjidId)          GET  /masjids/:id/memberships/me
 *   - subscribeToTier(masjidId, tierId, pmId?) POST /masjids/:id/memberships
 *
 * ─── Tier management (public read / members:manage write) ────────────────────
 *   - getTiers(masjidId)                       GET    /masjids/:id/tiers
 *   - getTierDetail(masjidId, tierId)          GET    /masjids/:id/tiers/:tier_id
 *   - createTier(masjidId, payload)            POST   /masjids/:id/tiers
 *   - updateTier(masjidId, tierId, payload)    PUT    /masjids/:id/tiers/:tier_id
 *   - deleteTier(masjidId, tierId)             DELETE /masjids/:id/tiers/:tier_id
 *
 * ─── Admin membership management (members:manage) ────────────────────────────
 *   - getAdminMemberships(masjidId, query)     MEM-MISS-01 GET
 *   - getAdminMembershipDetail(msId, memId)    MEM-MISS-02 GET
 *   - updateMembership(msId, memId, body)      MEM-MISS-03 PATCH
 *   - cancelMembership(msId, memId, reason?)   MEM-MISS-04 DELETE
 *   - getMembershipHistory(msId, memId, q)     MEM-MISS-05 GET
 *
 * ─── Admin payment management (members:manage) ───────────────────────────────
 *   - getAdminPayments(masjidId, query)        MEM-MISS-06 GET
 *   - getAdminPaymentDetail(msId, payId)       MEM-MISS-07 GET
 *   - getOnboardingStatus(masjidId)            MEM-MISS-09 GET
 *
 * NOTE: MEM-MISS-08 (webhook) is server-only — no client hook needed.
 *
 * MEM-ME-02 (getMyMembershipAt) is used by the member self-service page to
 * fetch full detail for whichever masjid card the user has selected in the
 * multi-masjid membership strip — myMemberships (MEM-ME-01) only supplies
 * the summary list used to render that strip.
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ApiErrorResponse } from "@/types/api";
import type {
  GetMyMembershipsResponse, GetMyMembershipsQuery, MyMembershipItem,
  GetMyMembershipDetailResponse,
  GetMyPaymentHistoryResponse, GetMyPaymentHistoryQuery,
  CancelMyMembershipData,
  GetAdminMembershipsResponse, GetAdminMembershipsQuery,
  AdminMembershipDetail,
  UpdateMembershipData, UpdateMembershipRequest,
  CancelMembershipData,
  GetMembershipHistoryResponse, GetMembershipHistoryQuery,
  GetAdminPaymentsResponse, GetAdminPaymentsQuery,
  AdminPaymentDetail,
  PaymentOnboardingStatus,
  MembershipStatus,
  // Tiers
  GetTiersResponse,
  GetTierDetailResponse,
  CreateTierResponse, CreateTierRequest,
  UpdateTierResponse, UpdateTierRequest,
  DeleteTierResponse,
  // Subscribe + memberships/me
  SubscribeToTierResponse,
  GetMyMasjidMembershipResponse,
  GenerateOnboardingLinkResponse,
  GetOnboardingStatusResponse,
} from "@/types/memberships";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface MembershipsState {
  // Self-service
  myMemberships: GetMyMembershipsResponse | null;
  myMembershipDetail: GetMyMembershipDetailResponse | null;
  myPaymentHistory: GetMyPaymentHistoryResponse | null;
  /** My current membership at a specific masjid (from /memberships/me) */
  myMasjidMembership: GetMyMasjidMembershipResponse | null;

  // Tiers
  tiers: GetTiersResponse | null;
  tierDetail: GetTierDetailResponse | null;

  // Admin
  adminMemberships: GetAdminMembershipsResponse | null;
  adminMembershipDetail: AdminMembershipDetail | null;
  membershipHistory: GetMembershipHistoryResponse | null;
  adminPayments: GetAdminPaymentsResponse | null;
  adminPaymentDetail: AdminPaymentDetail | null;
  onboardingStatus: PaymentOnboardingStatus | null;

  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildQS(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useMemberships() {
  const [state, setState] = useState<MembershipsState>({
    myMemberships: null,
    myMembershipDetail: null,
    myPaymentHistory: null,
    myMasjidMembership: null,
    tiers: null,
    tierDetail: null,
    adminMemberships: null,
    adminMembershipDetail: null,
    membershipHistory: null,
    adminPayments: null,
    adminPaymentDetail: null,
    onboardingStatus: null,
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ─── SELF-SERVICE ──────────────────────────────────────────────────────────

  // MEM-ME-01: GET all my subscriptions
  const getMyMemberships = useCallback(
    async (query: GetMyMembershipsQuery = {}) => {
      startLoading();
      try {
        const data = await apiFetch<GetMyMembershipsResponse>(
          `/api/me/memberships${buildQS(query as Record<string, unknown>)}`
        );
        setState((prev) => ({ ...prev, myMemberships: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch your memberships.");
        return null;
      }
    }, []
  );

  // MEM-ME-02: GET my subscription at one masjid
  const getMyMembershipAt = useCallback(
    async (masjidId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetMyMembershipDetailResponse>(
          `/api/me/memberships/${masjidId}`
        );
        setState((prev) => ({ ...prev, myMembershipDetail: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch membership detail.");
        return null;
      }
    }, []
  );

  // MEM-ME-03: GET my payment history
  const getMyPaymentHistory = useCallback(
    async (query: GetMyPaymentHistoryQuery = {}) => {
      startLoading();
      try {
        const data = await apiFetch<GetMyPaymentHistoryResponse>(
          `/api/me/memberships/history${buildQS(query as Record<string, unknown>)}`
        );
        setState((prev) => ({ ...prev, myPaymentHistory: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch payment history.");
        return null;
      }
    }, []
  );

  // MEM-ME-04: DELETE cancel my subscription
  const cancelMyMembership = useCallback(
    async (masjidId: string, reason?: string) => {
      startLoading();
      try {
        const data = await apiFetch<CancelMyMembershipData>(
          `/api/me/memberships/${masjidId}`,
          {
            method: "DELETE",
            // Always send a JSON body — an empty/undefined body makes the
            // backend's json decoder fail with "EOF" since there's nothing
            // to parse. `reason` is optional, so send null when absent.
            body: JSON.stringify({ reason: reason ?? null }),
          }
        );
        // Optimistically update status in myMemberships list
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          myMemberships: prev.myMemberships
            ? {
              ...prev.myMemberships,
              data: prev.myMemberships.data.map((m: MyMembershipItem) =>
                m.masjid.id === masjidId
                  ? { ...m, status: "cancelled" as MembershipStatus, next_billing_at: null }
                  : m
              ),
            }
            : null,
          // myMembershipDetail is enveloped ({ success, message, data }),
          // so the masjid id lives at `.data.masjid.id`, not `.masjid.id`.
          myMembershipDetail:
            prev.myMembershipDetail?.data?.masjid?.id === masjidId
              ? null
              : prev.myMembershipDetail,
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cancel membership.");
        return null;
      }
    }, []
  );

  // ─── SUBSCRIBE + MEMBERSHIPS/ME ───────────────────────────────────────────

  // GET /masjids/:masjid_id/memberships/me — my membership at a specific masjid
const getMyMasjidMembership = useCallback(
  async (masjidId: string) => {
    startLoading();
    try {
      const data = await apiFetch<GetMyMasjidMembershipResponse>(
        `/api/masjids/${masjidId}/memberships/me`
      );
      setState((prev) => ({ ...prev, myMasjidMembership: data, loading: false, error: null }));
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // 400 "no active membership" is expected for non-members — not an error
      const isNoMembership =
        msg.toLowerCase().includes("no active membership") ||
        msg.includes("400");
      if (isNoMembership) {
        // Clear gracefully — user simply has no membership yet
        setState((prev) => ({
          ...prev,
          myMasjidMembership: null,
          loading: false,
          error: null,          // ← don't set error
        }));
      } else {
        setError(msg || "Failed to fetch your membership.");
      }
      return null;
    }
  }, []
);

  // POST /masjids/:masjid_id/memberships — subscribe to a tier
  const subscribeToTier = useCallback(
    async (masjidId: string, tierId: string, paymentMethod = "credit_card", paymentMethodId?: string) => {
      startLoading();
      try {
        const body: Record<string, unknown> = { tier_id: tierId, payment_method: paymentMethod ?? "credit_card",  };
        if (paymentMethodId) body.payment_method_id = paymentMethodId;

        const data = await apiFetch<SubscribeToTierResponse>(
          `/api/masjids/${masjidId}/memberships`,
          { method: "POST", body: JSON.stringify(body) }
        );

        // Optimistically update myMasjidMembership state
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          myMasjidMembership: {
            success: true,
            message: "Subscribed successfully.",
            data: {
              membership_id: data.data.membership_id,
              masjid_id: data.data.masjid_id,
              tier: data.data.tier,
              status: data.data.status,
              can_vote: data.data.can_vote,
              started_at: data.data.started_at,
              renewed_at: null,
              next_billing_at: data.data.next_billing_at,
              expires_at: null,
            },
          },
        }));

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to subscribe to tier.");
        return null;
      }
    }, []
  );

  // ─── TIER MANAGEMENT ──────────────────────────────────────────────────────

  // GET /masjids/:masjid_id/tiers — list all tiers (public)
  const getTiers = useCallback(
    async (masjidId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetTiersResponse>(
          `/api/masjids/${masjidId}/tiers`
        );
        setState((prev) => ({ ...prev, tiers: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch tiers.");
        return null;
      }
    }, []
  );

  // GET /masjids/:masjid_id/tiers/:tier_id — single tier detail (public)
  const getTierDetail = useCallback(
    async (masjidId: string, tierId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetTierDetailResponse>(
          `/api/masjids/${masjidId}/tiers/${tierId}`
        );
        setState((prev) => ({ ...prev, tierDetail: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch tier detail.");
        return null;
      }
    }, []
  );

  // POST /masjids/:masjid_id/tiers — create a tier (members:manage)
  const createTier = useCallback(
    async (masjidId: string, payload: CreateTierRequest) => {
      startLoading();
      try {
        const data = await apiFetch<CreateTierResponse>(
          `/api/masjids/${masjidId}/tiers`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        // Optimistically append to tiers list
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          tiers: prev.tiers
            ? { ...prev.tiers, data: [...prev.tiers.data, data.data] }
            : { success: true, message: "Tiers retrieved.", data: [data.data] },
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create tier.");
        return null;
      }
    }, []
  );

  // PUT /masjids/:masjid_id/tiers/:tier_id — update a tier (members:manage)
  const updateTier = useCallback(
    async (masjidId: string, tierId: string, payload: UpdateTierRequest) => {
      startLoading();
      try {
        const data = await apiFetch<UpdateTierResponse>(
          `/api/masjids/${masjidId}/tiers/${tierId}`,
          { method: "PUT", body: JSON.stringify(payload) }
        );
        // Patch matching tier in list and detail
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          tiers: prev.tiers
            ? {
              ...prev.tiers,
              data: prev.tiers.data.map((t) =>
                t.id === tierId ? data.data : t
              ),
            }
            : null,
          tierDetail:
            prev.tierDetail?.data?.id === tierId
              ? { ...prev.tierDetail, data: data.data }
              : prev.tierDetail,
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update tier.");
        return null;
      }
    }, []
  );

  // DELETE /masjids/:masjid_id/tiers/:tier_id — deactivate a tier (members:manage)
  const deleteTier = useCallback(
    async (masjidId: string, tierId: string) => {
      startLoading();
      try {
        // Backend returns 204 No Content on success
        const res = await fetch(`/api/masjids/${masjidId}/tiers/${tierId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (res.status === 204) {
          // Remove tier from list and clear detail if it matches
          setState((prev) => ({
            ...prev,
            loading: false,
            error: null,
            tiers: prev.tiers
              ? {
                ...prev.tiers,
                data: prev.tiers.data.filter((t) => t.id !== tierId),
              }
              : null,
            tierDetail:
              prev.tierDetail?.data?.id === tierId ? null : prev.tierDetail,
          }));
          return { success: true, message: "Tier deactivated successfully." } as DeleteTierResponse;
        }

        const json = await res.json();
        if (!res.ok) throw new Error(json?.message ?? `Request failed with status ${res.status}`);

        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          tiers: prev.tiers
            ? { ...prev.tiers, data: prev.tiers.data.filter((t) => t.id !== tierId) }
            : null,
          tierDetail:
            prev.tierDetail?.data?.id === tierId ? null : prev.tierDetail,
        }));

        return json as DeleteTierResponse;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete tier.");
        return null;
      }
    }, []
  );

  // ─── ADMIN MEMBERSHIP MANAGEMENT ──────────────────────────────────────────

  // MEM-MISS-01: GET all memberships (admin)
  const getAdminMemberships = useCallback(
    async (masjidId: string, query: GetAdminMembershipsQuery = {}) => {
      startLoading();
      try {
        const data = await apiFetch<GetAdminMembershipsResponse>(
          `/api/masjids/${masjidId}/memberships${buildQS(query as Record<string, unknown>)}`
        );
        setState((prev) => ({ ...prev, adminMemberships: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch memberships.");
        return null;
      }
    }, []
  );

  // MEM-MISS-02: GET membership detail (admin)
  const getAdminMembershipDetail = useCallback(
    async (masjidId: string, membershipId: string) => {
      startLoading();
      try {
        const data = await apiFetch<AdminMembershipDetail>(
          `/api/masjids/${masjidId}/memberships/${membershipId}`
        );
        setState((prev) => ({ ...prev, adminMembershipDetail: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch membership detail.");
        return null;
      }
    }, []
  );

  // MEM-MISS-03: PATCH update membership status (admin)
  const updateMembership = useCallback(
    async (masjidId: string, membershipId: string, payload: UpdateMembershipRequest) => {
      startLoading();
      try {
        const res = await apiFetch<UpdateMembershipData>(
          `/api/masjids/${masjidId}/memberships/${membershipId}`,
          { method: "PATCH", body: JSON.stringify(payload) }
        );
        // Response is enveloped ({ success, message, data }) — the actual
        // updated status/can_vote live under `.data`, not at the top level.
        // Reading `res.status`/`res.can_vote` directly was always undefined,
        // so the local table patch below silently wrote `undefined` and the
        // row never visually updated to the new status.
        const updated = res?.data;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          adminMemberships: prev.adminMemberships
            ? {
              ...prev.adminMemberships,
              data: prev.adminMemberships.data.map((m) =>
                m.id === membershipId
                  ? { ...m, status: updated?.status ?? m.status }
                  : m
              ),
            }
            : null,
          adminMembershipDetail:
            prev.adminMembershipDetail?.id === membershipId
              ? { ...prev.adminMembershipDetail, status: updated?.status, can_vote: updated?.can_vote }
              : prev.adminMembershipDetail,
        }));
        return res;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update membership.");
        return null;
      }
    }, []
  );

  // MEM-MISS-04: DELETE cancel membership (admin)
  const cancelMembership = useCallback(
    async (masjidId: string, membershipId: string, reason?: string) => {
      startLoading();
      try {
        const data = await apiFetch<CancelMembershipData>(
          `/api/masjids/${masjidId}/memberships/${membershipId}`,
          {
            method: "DELETE",
            // Always send a JSON body — same "EOF" decode issue as
            // cancelMyMembership above.
            body: JSON.stringify({ reason: reason ?? null }),
          }
        );
        // Remove from admin list
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          adminMemberships: prev.adminMemberships
            ? {
              ...prev.adminMemberships,
              data: prev.adminMemberships.data.map((m) =>
                m.id === membershipId ? { ...m, status: "cancelled" as MembershipStatus } : m
              ),
              // FIX: this assumed `pagination.total` always exists and
              // crashed with "Cannot read properties of undefined" when it
              // didn't. Some admin list endpoints return `metadata.total_data`
              // instead (same shape mismatch PaymentsTab already guards
              // against with `metadata?.total_data ?? pagination?.total`).
              // Only touch whichever field is actually present.
              ...(prev.adminMemberships.pagination
                ? {
                  pagination: {
                    ...prev.adminMemberships.pagination,
                    total: Math.max(0, (prev.adminMemberships.pagination.total ?? 0) - 1),
                  },
                }
                : {}),
              ...((prev.adminMemberships as any).metadata
                ? {
                  metadata: {
                    ...(prev.adminMemberships as any).metadata,
                    total_data: Math.max(0, ((prev.adminMemberships as any).metadata.total_data ?? 0) - 1),
                  },
                }
                : {}),
            }
            : null,
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cancel membership.");
        return null;
      }
    }, []
  );

  // MEM-MISS-05: GET membership payment history
  const getMembershipHistory = useCallback(
    async (masjidId: string, membershipId: string, query: GetMembershipHistoryQuery = {}) => {
      startLoading();
      try {
        const data = await apiFetch<GetMembershipHistoryResponse>(
          `/api/masjids/${masjidId}/memberships/${membershipId}/history${buildQS(query as Record<string, unknown>)}`
        );
        setState((prev) => ({ ...prev, membershipHistory: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch payment history.");
        return null;
      }
    }, []
  );

  // ─── ADMIN PAYMENT MANAGEMENT ─────────────────────────────────────────────

  // MEM-MISS-06: GET all payments (admin)
  const getAdminPayments = useCallback(
    async (masjidId: string, query: GetAdminPaymentsQuery = {}) => {
      startLoading();
      try {
        const data = await apiFetch<GetAdminPaymentsResponse>(
          `/api/masjids/${masjidId}/payments${buildQS(query as Record<string, unknown>)}`
        );
        setState((prev) => ({ ...prev, adminPayments: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch payments.");
        return null;
      }
    }, []
  );

  // MEM-MISS-07: GET single payment detail
  const getAdminPaymentDetail = useCallback(
    async (masjidId: string, paymentId: string) => {
      startLoading();
      try {
        const data = await apiFetch<AdminPaymentDetail>(
          `/api/masjids/${masjidId}/payments/${paymentId}`
        );
        setState((prev) => ({ ...prev, adminPaymentDetail: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch payment detail.");
        return null;
      }
    }, []
  );

  // MEM-MISS-09: GET Stripe Connect onboarding status
  const getOnboardingStatus = useCallback(async (masjidId: string) => {
    startLoading();
    try {
      const res = await apiFetch<GetOnboardingStatusResponse>(
        `/api/masjids/${masjidId}/payments/onboarding/status`
      );
      const data = res.data; // ← unwrap
      setState((prev) => ({ ...prev, onboardingStatus: data, loading: false, error: null }));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch onboarding status.");
      return null;
    }
  }, []);

  // After getOnboardingStatus — POST onboarding link
  const generateOnboardingLink = useCallback(
    async (masjidId: string, email: string) => {
      startLoading();
      try {
        const data = await apiFetch<GenerateOnboardingLinkResponse>(
          `/api/masjids/${masjidId}/payments/onboarding`,
          {
            method: "POST",
            body: JSON.stringify({ email }),
          }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate onboarding link.");
        return null;
      }
    },
    []
  );

  // ─── Derived helpers ───────────────────────────────────────────────────────

  /** Returns true if Stripe Connect is fully configured and ready for payments */
  const isPaymentReady =
    state.onboardingStatus?.charges_enabled === true &&
    state.onboardingStatus?.payouts_enabled === true;

  /** Active memberships count for the member home screen badge */
  const activeMembershipCount =
    state.myMemberships?.data.filter((m) => m.status === "active").length ?? 0;

  /** Whether the user currently has an active membership at the last-queried masjid */
  const isMemberOfMasjid = state.myMasjidMembership?.data?.status === "active";

  /** Whether the user has voting rights at the last-queried masjid */
  const canVoteAtMasjid = state.myMasjidMembership?.data?.can_vote === true;

  // ─── Utils ─────────────────────────────────────────────────────────────────

  const clearError = useCallback(() => setState((prev) => ({ ...prev, error: null })), []);
  const clearMyMasjidMembership = useCallback(() => setState((prev) => ({ ...prev, myMasjidMembership: null })), []);
  const clearMyMembershipDetail = useCallback(() => setState((prev) => ({ ...prev, myMembershipDetail: null })), []);
  const clearAdminMembershipDetail = useCallback(() => setState((prev) => ({ ...prev, adminMembershipDetail: null, membershipHistory: null })), []);
  const clearAdminPaymentDetail = useCallback(() => setState((prev) => ({ ...prev, adminPaymentDetail: null })), []);
  const clearTierDetail = useCallback(() => setState((prev) => ({ ...prev, tierDetail: null })), []);

  return {
    // State
    myMemberships: state.myMemberships,
    myMembershipDetail: state.myMembershipDetail,
    myPaymentHistory: state.myPaymentHistory,
    myMasjidMembership: state.myMasjidMembership,
    tiers: state.tiers,
    tierDetail: state.tierDetail,
    adminMemberships: state.adminMemberships,
    adminMembershipDetail: state.adminMembershipDetail,
    membershipHistory: state.membershipHistory,
    adminPayments: state.adminPayments,
    adminPaymentDetail: state.adminPaymentDetail,
    onboardingStatus: state.onboardingStatus,
    loading: state.loading,
    error: state.error,

    // Derived
    isPaymentReady,
    activeMembershipCount,
    isMemberOfMasjid,
    canVoteAtMasjid,

    // Self-service
    getMyMemberships,
    getMyMembershipAt,
    getMyPaymentHistory,
    cancelMyMembership,
    getMyMasjidMembership,
    subscribeToTier,

    // Tiers (public read / admin write)
    getTiers,
    getTierDetail,
    createTier,
    updateTier,
    deleteTier,

    // Admin memberships
    getAdminMemberships,
    getAdminMembershipDetail,
    updateMembership,
    cancelMembership,
    getMembershipHistory,

    // Admin payments
    getAdminPayments,
    getAdminPaymentDetail,
    getOnboardingStatus,
    generateOnboardingLink,

    // Utils
    clearError,
    clearMyMembershipDetail,
    clearMyMasjidMembership,
    clearAdminMembershipDetail,
    clearAdminPaymentDetail,
    clearTierDetail,
  };
}