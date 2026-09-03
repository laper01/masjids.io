import { useState, useCallback } from "react";
import type { AnnouncementDetail, GetAnnouncementDetailResponse } from "@/types/api";

interface UseAnnouncementDetailState {
  announcement: AnnouncementDetail | null;
  loading: boolean;
  error: string | null;
}

interface UseAnnouncementDetailReturn extends UseAnnouncementDetailState {
  getAnnouncementDetail: (masjidId: string, announcementId: string) => Promise<void>;
  clearError: () => void;
}

export function useAnnouncementDetail(): UseAnnouncementDetailReturn {
  const [state, setState] = useState<UseAnnouncementDetailState>({
    announcement: null,
    loading: false,
    error: null,
  });

  const getAnnouncementDetail = useCallback(
    async (masjidId: string, announcementId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await window.fetch(
          `/api/v2/masjids/${masjidId}/announcements/${announcementId}`
        );
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const json: GetAnnouncementDetailResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Failed to load announcement.");
        setState({ announcement: json.data, loading: false, error: null });
      } catch (e: unknown) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load announcement.",
        }));
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return { ...state, getAnnouncementDetail, clearError };
}