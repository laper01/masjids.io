/**
 * hooks/notifications/useDeviceToken.ts
 *
 * Handles the full FCM device-token registration flow for web push notifications.
 *
 * Flow:
 *   1. Request browser notification permission
 *   2. Retrieve FCM token from Firebase Messaging
 *   3. POST token + platform "web" to NOTIF-04 /api/notifications/device-token
 *   4. Persist the returned token record ID in localStorage to avoid duplicate
 *      registrations across sessions
 *
 * Usage:
 *   const { register, deregister, tokenRecord, loading, error, permission } =
 *     useDeviceToken();
 *
 *   // Call once after the user is authenticated:
 *   useEffect(() => { register(); }, [register]);
 */

"use client";

import { useState, useCallback } from "react";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { apiFetch } from "@/lib/apiFetch";
import type {
  RegisterDeviceTokenResponse,
  DeactivateDeviceTokenResponse,
  ApiErrorResponse,
} from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Your VAPID public key from the Firebase Console:
 * Project Settings → Cloud Messaging → Web Push certificates → Key pair
 */
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

/** localStorage key used to persist the registered token record ID */
const STORAGE_KEY = "device_token_record_id";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationPermission = "default" | "granted" | "denied";

interface DeviceTokenState {
  /** The registered token record returned by the backend */
  tokenRecord: RegisterDeviceTokenResponse["data"] | null;
  loading: boolean;
  error: string | null;
  permission: NotificationPermission;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safe localStorage accessor — returns null during SSR or if the key is absent.
 * Guards against "localStorage is not defined" when the module is evaluated
 * server-side (e.g. during Next.js SSR of a component that imports this hook).
 */
function storageGet(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(key);
}

function storageSet(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, value);
}

function storageRemove(key: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(key);
}
// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDeviceToken() {
  const [state, setState] = useState<DeviceTokenState>({
    tokenRecord: null,
    loading: false,
    error: null,
    permission:
      typeof Notification !== "undefined"
        ? (Notification.permission as NotificationPermission)
        : "default",
  });

  const setLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── Register ──────────────────────────────────────────────────────────────

  /**
   * Request permission, retrieve the FCM token, and register it with the
   * backend. Safe to call multiple times — skips if already registered in
   * this session or in localStorage.
   */
  const register = useCallback(async (): Promise<
    RegisterDeviceTokenResponse["data"] | null
  > => {
    if (typeof window === "undefined" || !messaging) {
      setError("Push notifications are not supported in this environment.");
      return null;
    }

    // Skip if already registered in this session
    if (state.tokenRecord) return state.tokenRecord;

    // Skip if we have a stored record ID (already registered in a prior session)
    const storedId = storageGet(STORAGE_KEY);
    if (storedId) {
      console.info("[useDeviceToken] Token already registered:", storedId);
      return null;
    }

    setLoading();

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();

      setState((prev) => ({
        ...prev,
        permission: permission as NotificationPermission,
      }));

      if (permission !== "granted") {
        setError("Notification permission was not granted.");
        return null;
      }

      // 2. Get FCM token
      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });

      if (!fcmToken) {
        setError(
          "Failed to retrieve FCM token. Ensure your VAPID key is configured correctly."
        );
        return null;
      }

      // 3. POST to NOTIF-04
      const response = await apiFetch<RegisterDeviceTokenResponse>(
        "/api/notifications/device-token",
        {
          method: "POST",
          body: JSON.stringify({ token: fcmToken, platform: "web" }),
        }
      );

      // 4. Persist record ID to avoid duplicate registrations
      storageSet(STORAGE_KEY, response.data.id);

      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        tokenRecord: response.data,
      }));

      return response.data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to register device token.";
      setError(message);
      return null;
    }
  }, [state.tokenRecord]);

  // ── Deregister ────────────────────────────────────────────────────────────

  /**
   * Deactivate the registered token on the backend and clear local storage.
   * Requires the token record ID from a prior `register()` call.
   */
  const deregister = useCallback(
    async (tokenId?: string): Promise<DeactivateDeviceTokenResponse["data"] | null> => {
      const id = tokenId ?? state.tokenRecord?.id ?? storageGet(STORAGE_KEY);

      if (!id) {
        setError("No registered device token to deactivate.");
        return null;
      }

      setLoading();

      try {
        const response = await apiFetch<DeactivateDeviceTokenResponse>(
          `/api/notifications/device-token/${id}`,
          { method: "DELETE" }
        );

        storageRemove(STORAGE_KEY);

        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          tokenRecord: null,
        }));

        return response.data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to deactivate device token.";
        setError(message);
        return null;
      }
    },
    [state.tokenRecord?.id]
  );

  // ── Clear helpers ──────────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    tokenRecord: state.tokenRecord,
    loading: state.loading,
    error: state.error,
    permission: state.permission,

    // Derived
    // FIX: storageGet() guards against "localStorage is not defined" during SSR.
    // The bare localStorage.getItem?.() call crashed because optional chaining
    // does not protect against an undeclared identifier — only typeof does.
    isRegistered: !!state.tokenRecord || !!storageGet(STORAGE_KEY),

    // Actions
    register,
    deregister,
    clearError,
  };
}