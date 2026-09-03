/**
 * hooks/followers/useFollowers.ts
 *
 * Client-side data-fetching hook for the Followers System module (FOL-01 → FOL-05).
 *
 * Provides:
 *   - followMasjid(masjidId)           → FOL-01 POST
 *   - unfollowMasjid(masjidId)         → FOL-02 DELETE
 *   - getFollowStatus(masjidId)        → FOL-03 GET
 *   - getFollowers(masjidId, query)    → FOL-04 GET  [paginated]
 *   - getFollowedMasjids(query)        → FOL-05 GET  [paginated, auth user]
 *
 * All actions share a single { loading, error } state so the UI can render
 * a unified spinner/error banner without per-call state juggling.
 *
 * For independent loading states per action (e.g. follow button spinner
 * independent of the followers list), use the returned per-action `isPending`
 * field described in the return shape below.
 *
 * Usage:
 *   const { followMasjid, followStatus, loading, error } = useFollowers();
 *
 *   // Follow a masjid
 *   const result = await followMasjid("msj-uuid-al-noor-0001");
 *
 *   // Fetch followers for a specific masjid
 *   const { getFollowers, followers } = useFollowers();
 *   useEffect(() => { getFollowers("msj-uuid-al-noor-0001", { page: 1 }); }, []);
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  FollowMasjidResponse,
  UnfollowMasjidResponse,
  GetFollowStatusResponse,
  GetFollowersResponse,
  GetFollowedMasjidsResponse,
  ApiErrorResponse,
  GetFollowersQuery,
} from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface FollowersState {
  /** Current follow status for the most recently queried masjid */
  followStatus: GetFollowStatusResponse | null;
  /** Paginated followers list for the most recently queried masjid */
  followers: GetFollowersResponse | null;
  /** Paginated list of masjids the authenticated user follows */
  followedMasjids: GetFollowedMasjidsResponse | null;
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

export function useFollowers() {
  const [state, setState] = useState<FollowersState>({
    followStatus: null,
    followers: null,
    followedMasjids: null,
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── FOL-01: POST follow a masjid ──────────────────────────────────────────

  const followMasjid = useCallback(async (masjidId: string) => {
    startLoading();
    try {
      const data = await apiFetch<FollowMasjidResponse>(
        `/api/masjids/${masjidId}/follow`,
        { method: "POST" }
      );
      // Optimistically update local follow status
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        followStatus: prev.followStatus
          ? {
              ...prev.followStatus,
              data: {
                ...prev.followStatus.data,
                following: true,
                follower_count: data.data.follower_count,
              },
            }
          : null,
      }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to follow masjid.";
      setError(message);
      return null;
    }
  }, []);

  // ── FOL-02: DELETE unfollow a masjid ──────────────────────────────────────

  const unfollowMasjid = useCallback(async (masjidId: string) => {
    startLoading();
    try {
      const data = await apiFetch<UnfollowMasjidResponse>(
        `/api/masjids/${masjidId}/follow`,
        { method: "DELETE" }
      );
      // Optimistically update local follow status
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        followStatus: prev.followStatus
          ? {
              ...prev.followStatus,
              data: {
                ...prev.followStatus.data,
                following: false,
                follower_count: data.data.follower_count,
              },
            }
          : null,
        // Remove masjid from followedMasjids list if it's loaded
        followedMasjids: prev.followedMasjids
          ? {
              ...prev.followedMasjids,
              data: prev.followedMasjids.data.filter(
                (m) => m.masjid_id !== masjidId
              ),
              metadata: {
                ...prev.followedMasjids.metadata,
                total_data: Math.max(
                  0,
                  prev.followedMasjids.metadata.total_data - 1
                ),
              },
            }
          : null,
      }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unfollow masjid.";
      setError(message);
      return null;
    }
  }, []);

  // ── FOL-03: GET follow status ─────────────────────────────────────────────

  const getFollowStatus = useCallback(async (masjidId: string) => {
    startLoading();
    try {
      const data = await apiFetch<GetFollowStatusResponse>(
        `/api/masjids/${masjidId}/follow`
      );
      setState((prev) => ({
        ...prev,
        followStatus: data,
        loading: false,
        error: null,
      }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch follow status.";
      setError(message);
      return null;
    }
  }, []);

  // ── FOL-04: GET followers list (paginated) ────────────────────────────────

  const getFollowers = useCallback(
    async (masjidId: string, query: GetFollowersQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetFollowersResponse>(
          `/api/masjids/${masjidId}/followers${qs}`
        );
        setState((prev) => ({
          ...prev,
          followers: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch followers.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── FOL-05: GET followed masjids for authenticated user ───────────────────

  const getFollowedMasjids = useCallback(
    async (query: { page?: number; limit?: number } = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetFollowedMasjidsResponse>(
          `/api/users/me/followed-masjids${qs}`
        );
        setState((prev) => ({
          ...prev,
          followedMasjids: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch followed masjids.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── Toggle helper: follow if not following, unfollow if following ─────────

  /**
   * Convenience toggle — reads current `followStatus.data.following`
   * and calls the appropriate action.
   * Requires `getFollowStatus` to have been called first for the same masjidId.
   */
  const toggleFollow = useCallback(
    async (masjidId: string) => {
      const isFollowing = state.followStatus?.data?.following ?? false;
      if (isFollowing) {
        return unfollowMasjid(masjidId);
      }
      return followMasjid(masjidId);
    },
    [state.followStatus, followMasjid, unfollowMasjid]
  );

  // ── Clear error manually ──────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    followStatus: state.followStatus,
    followers: state.followers,
    followedMasjids: state.followedMasjids,
    loading: state.loading,
    error: state.error,

    // Actions
    followMasjid,
    unfollowMasjid,
    toggleFollow,
    getFollowStatus,
    getFollowers,
    getFollowedMasjids,
    clearError,
  };
}