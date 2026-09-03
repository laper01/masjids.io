/**
 * hooks/announcements/useAnnouncements.ts
 *
 * Client-side data-fetching hook for the Announcements module (ANN-01 → ANN-05).
 *
 * Provides:
 *   - getAnnouncements(masjidId, query)       → ANN-02 GET  [paginated, public]
 *   - getAnnouncementDetail(masjidId, id)     → ANN-03 GET  [public]
 *   - createAnnouncement(masjidId, payload)   → ANN-01 POST [auth]
 *   - updateAnnouncement(masjidId, id, body)  → ANN-04 PUT  [auth]
 *   - deleteAnnouncement(masjidId, id)        → ANN-05 DELETE [auth]
 *
 * Optimistic state updates:
 *   - createAnnouncement → prepends new item to `announcements.data` list
 *   - updateAnnouncement → patches the matching item in list + detail
 *   - deleteAnnouncement → removes the item from `announcements.data` list
 *
 * Usage:
 *   const {
 *     announcements, announcementDetail,
 *     loading, error,
 *     getAnnouncements, getAnnouncementDetail,
 *     createAnnouncement, updateAnnouncement, deleteAnnouncement,
 *   } = useAnnouncements();
 *
 *   useEffect(() => {
 *     getAnnouncements("msj-uuid-al-noor-0001", { page: 1, limit: 10 });
 *   }, [getAnnouncements]);
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  GetAnnouncementsResponse,
  GetAnnouncementDetailResponse,
  CreateAnnouncementResponse,
  UpdateAnnouncementResponse,
  DeleteAnnouncementResponse,
  ApiErrorResponse,
  GetAnnouncementsQuery,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  AnnouncementListItem,
} from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface AnnouncementsState {
  /** Paginated list of announcements for the last queried masjid */
  announcements: GetAnnouncementsResponse | null;
  /** Full detail of the last fetched announcement */
  announcementDetail: GetAnnouncementDetailResponse | null;
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

/**
 * Guards against malformed/partial API responses where `announcements` is
 * set but `announcements.data` is not actually an array (e.g. an error
 * payload that didn't throw, or an unexpected response shape). Without this,
 * spreading `prev.announcements.data` in create/update/delete throws
 * "prev.announcements.data is not iterable".
 */
function hasValidList(
  announcements: GetAnnouncementsResponse | null
): announcements is GetAnnouncementsResponse {
  return !!announcements && Array.isArray(announcements.data);
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useAnnouncements() {
  const [state, setState] = useState<AnnouncementsState>({
    announcements: null,
    announcementDetail: null,
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── ANN-02: GET paginated announcements list (PUBLIC) ─────────────────────

  const getAnnouncements = useCallback(
    async (masjidId: string, query: GetAnnouncementsQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetAnnouncementsResponse>(
          `/api/masjids/${masjidId}/announcements${qs}`
        );
        setState((prev) => ({
          ...prev,
          announcements: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch announcements.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── ANN-03: GET single announcement detail (PUBLIC) ───────────────────────

  const getAnnouncementDetail = useCallback(
    async (masjidId: string, announcementId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetAnnouncementDetailResponse>(
          `/api/masjids/${masjidId}/announcements/${announcementId}`
        );
        setState((prev) => ({
          ...prev,
          announcementDetail: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch announcement details.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── ANN-01: POST create a new announcement ────────────────────────────────

  const createAnnouncement = useCallback(
    async (masjidId: string, payload: CreateAnnouncementRequest) => {
      startLoading();
      try {
        const data = await apiFetch<CreateAnnouncementResponse>(
          `/api/masjids/${masjidId}/announcements`,
          { method: "POST", body: JSON.stringify(payload) }
        );

        // Optimistically prepend the new item to the existing list
        setState((prev) => {
          if (!hasValidList(prev.announcements)) {
            return { ...prev, loading: false, error: null };
          }

          const newItem: AnnouncementListItem = {
            id: data.data.id,
            title: data.data.title,
            body: payload.body,
            category: data.data.category,
            media_url: payload.media_url ?? null,
            published_at: data.data.published_at,
          };

          return {
            ...prev,
            loading: false,
            error: null,
            announcements: {
              ...prev.announcements,
              data: [newItem, ...prev.announcements.data],
              metadata: {
                ...prev.announcements.metadata,
                total_data: (prev.announcements.metadata?.total_data ?? 0) + 1,
              },
            },
          };
        });

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create announcement.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── ANN-04: PUT update an announcement ───────────────────────────────────

  const updateAnnouncement = useCallback(
    async (
      masjidId: string,
      announcementId: string,
      payload: UpdateAnnouncementRequest
    ) => {
      startLoading();
      try {
        const data = await apiFetch<UpdateAnnouncementResponse>(
          `/api/masjids/${masjidId}/announcements/${announcementId}`,
          { method: "PUT", body: JSON.stringify(payload) }
        );

        // Patch matching item in the announcements list
        setState((prev) => {
          const updatedList = hasValidList(prev.announcements)
            ? {
                ...prev.announcements,
                data: prev.announcements.data.map((ann) =>
                  ann.id === announcementId
                    ? {
                        ...ann,
                        title: data.data.title,
                        category: data.data.category,
                        body: payload.body,
                      }
                    : ann
                ),
              }
            : prev.announcements;

          // Also patch the detail view if it matches
          const updatedDetail =
            prev.announcementDetail?.data?.id === announcementId
              ? {
                  ...prev.announcementDetail,
                  data: {
                    ...prev.announcementDetail.data,
                    title: data.data.title,
                    category: data.data.category,
                    body: payload.body,
                    updated_at: data.data.updated_at,
                  },
                }
              : prev.announcementDetail;

          return {
            ...prev,
            loading: false,
            error: null,
            announcements: updatedList,
            announcementDetail: updatedDetail,
          };
        });

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update announcement.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── ANN-05: DELETE an announcement ───────────────────────────────────────

  const deleteAnnouncement = useCallback(
    async (masjidId: string, announcementId: string) => {
      startLoading();
      try {
        const data = await apiFetch<DeleteAnnouncementResponse>(
          `/api/masjids/${masjidId}/announcements/${announcementId}`,
          { method: "DELETE" }
        );

        // Remove deleted item from the list and clear detail if it matches
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          announcements: hasValidList(prev.announcements)
            ? {
                ...prev.announcements,
                data: prev.announcements.data.filter(
                  (ann) => ann.id !== announcementId
                ),
                metadata: {
                  ...prev.announcements.metadata,
                  total_data: Math.max(
                    0,
                    (prev.announcements.metadata?.total_data ?? 0) - 1
                  ),
                },
              }
            : prev.announcements,
          announcementDetail:
            prev.announcementDetail?.data?.id === announcementId
              ? null
              : prev.announcementDetail,
        }));

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete announcement.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── Clear state helpers ───────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /** Clear the detail view when navigating away from a detail page */
  const clearDetail = useCallback(() => {
    setState((prev) => ({ ...prev, announcementDetail: null }));
  }, []);

  return {
    // State
    announcements: state.announcements,
    announcementDetail: state.announcementDetail,
    loading: state.loading,
    error: state.error,

    // Actions
    getAnnouncements,
    getAnnouncementDetail,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    clearError,
    clearDetail,
  };
}