/**
 * hooks/notifications/useNotifications.ts
 *
 * Fixed to match the real API response shape:
 *   { success, message, data: NotificationItem[], metadata: PaginationMeta }
 * i.e. ApiPaginatedResponse<NotificationItem> — NOT the GetNotificationsData wrapper.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type {
  NotificationItem,
  MarkNotificationReadResponse,
  MarkAllReadResponse,
  RegisterDeviceTokenResponse,
  DeactivateDeviceTokenResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  GetNotificationsQuery,
  PushPlatform,
} from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Real API response type for GET /notifications
// The backend returns ApiPaginatedResponse<NotificationItem>, not the
// GetNotificationsData wrapper defined in api.ts.
// ─────────────────────────────────────────────────────────────────────────────

type NotificationsResponse = ApiPaginatedResponse<NotificationItem>;

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationsState {
  notifications: NotificationsResponse | null;
  loading: boolean;
  pendingIds: Set<string>;
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

export function useNotifications() {
  const [state, setState] = useState<NotificationsState>({
    notifications: null,
    loading: false,
    pendingIds: new Set(),
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  const addPending = (id: string) =>
    setState((prev) => ({
      ...prev,
      pendingIds: new Set([...prev.pendingIds, id]),
    }));

  const removePending = (id: string) =>
    setState((prev) => {
      const next = new Set(prev.pendingIds);
      next.delete(id);
      return { ...prev, pendingIds: next };
    });

  // ── NOTIF-01: GET notifications (paginated) ───────────────────────────────

  const getNotifications = useCallback(
    async (query: GetNotificationsQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<NotificationsResponse>(
          `/api/notifications${qs}`
        );
        setState((prev) => ({
          ...prev,
          notifications: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch notifications.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── NOTIF-02: PATCH mark single notification as read ──────────────────────

  const markAsRead = useCallback(async (notificationId: string) => {
    addPending(notificationId);
    try {
      const data = await apiFetch<MarkNotificationReadResponse>(
        `/api/notifications/${notificationId}/read`,
        { method: "PATCH" }
      );

      setState((prev) => {
        if (!prev.notifications) {
          removePending(notificationId);
          return { ...prev };
        }

        // data is NotificationItem[] — map over it directly
        const updatedItems = prev.notifications.data.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        );

        return {
          ...prev,
          pendingIds: (() => {
            const next = new Set(prev.pendingIds);
            next.delete(notificationId);
            return next;
          })(),
          error: null,
          notifications: {
            ...prev.notifications,
            data: updatedItems,
          },
        };
      });

      return data;
    } catch (err) {
      removePending(notificationId);
      const message =
        err instanceof Error ? err.message : "Failed to mark notification as read.";
      setState((prev) => ({ ...prev, error: message }));
      return null;
    }
  }, []);

  // ── NOTIF-03: PATCH mark all notifications as read ────────────────────────

  const markAllAsRead = useCallback(async (masjidId?: string) => {
    startLoading();
    try {
      const body = masjidId ? { masjid_id: masjidId } : {};
      const data = await apiFetch<MarkAllReadResponse>(
        "/api/notifications/read-all",
        { method: "PATCH", body: JSON.stringify(body) }
      );

      setState((prev) => {
        if (!prev.notifications) {
          return { ...prev, loading: false, error: null };
        }

        const updatedItems = prev.notifications.data.map((n) => {
          if (masjidId && n.masjid.id !== masjidId) return n;
          return { ...n, read: true };
        });

        return {
          ...prev,
          loading: false,
          error: null,
          notifications: {
            ...prev.notifications,
            data: updatedItems,
          },
        };
      });

      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to mark all notifications as read.";
      setError(message);
      return null;
    }
  }, []);

  // ── NOTIF-04: POST register push device token ─────────────────────────────

  const registerDeviceToken = useCallback(
    async (token: string, platform: PushPlatform) => {
      startLoading();
      try {
        const data = await apiFetch<RegisterDeviceTokenResponse>(
          "/api/notifications/device-token",
          { method: "POST", body: JSON.stringify({ token, platform }) }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to register device token.";
        setError(message);
        return null;
      }
    },
    []
  );

  // ── NOTIF-05: DELETE deactivate push device token ─────────────────────────

  const deactivateDeviceToken = useCallback(async (tokenId: string) => {
    startLoading();
    try {
      const data = await apiFetch<DeactivateDeviceTokenResponse>(
        `/api/notifications/device-token/${tokenId}`,
        { method: "DELETE" }
      );
      setState((prev) => ({ ...prev, loading: false, error: null }));
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to deactivate device token.";
      setError(message);
      return null;
    }
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  /**
   * Derived from the items themselves since the real API puts unread_count
   * per-item rather than at the top level of the response envelope.
   */
  const unreadCount = useMemo(
    () => state.notifications?.data?.filter((n) => !n.read).length ?? 0,
    [state.notifications]
  );

  const isNotificationPending = useCallback(
    (id: string) => state.pendingIds.has(id),
    [state.pendingIds]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State — expose the flat array directly so pages can do notifications?.data.map(...)
    notifications: state.notifications,
    unreadCount,
    loading: state.loading,
    error: state.error,

    isNotificationPending,

    getNotifications,
    markAsRead,
    markAllAsRead,
    registerDeviceToken,
    deactivateDeviceToken,
    clearError,
  };
}