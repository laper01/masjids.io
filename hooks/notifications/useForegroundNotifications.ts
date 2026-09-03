/**
 * hooks/notifications/useForegroundNotifications.ts
 *
 * Handles FOREGROUND push notifications — i.e. messages that arrive while the
 * app tab is visible and active.
 *
 * When the tab is visible, Firebase suppresses the native OS banner entirely
 * and routes the message to onMessage() in the page instead. This hook:
 *
 *   1. Listens for incoming FCM messages via onMessage()
 *   2. Normalises the payload into our app's notification shape
 *   3. Broadcasts NEW_NOTIFICATION to the BroadcastChannel so all open tabs
 *      (and any listener like useNotifications) update their list
 *   4. Sends SHOW_NOTIFICATION to the service worker so the OS system banner
 *      still appears even while the user is on the page
 *   5. Exposes an in-app toast queue (toasts[]) that the UI can render as
 *      a lightweight banner inside the app itself
 *
 * Also listens for BroadcastChannel events from the SW:
 *   - NOTIFICATION_CLICKED   → marks that notification read in local state
 *   - NOTIFICATION_DISMISSED → removes it from the toast queue
 *
 * Usage:
 *   // Mount once near the top of your authenticated layout:
 *   const { toasts, dismissToast } = useForegroundNotifications();
 *
 *   // Render toasts wherever you like (e.g. fixed top-right corner):
 *   toasts.map(t => <NotificationToast key={t.id} toast={t} onDismiss={dismissToast} />)
 */

"use client";

import { useEffect, useCallback, useState } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_NAME = "push_notifications_channel";

/** How long (ms) an in-app toast stays visible before auto-dismissing. */
const TOAST_AUTO_DISMISS_MS = 6_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "info" | "warning" | "success" | "error" | string;
  masjidId: string | null;
  imageUrl: string | null;
  actionUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise an FCM MessagePayload into our AppNotification shape. */
function normalisePayload(payload: Record<string, any>): AppNotification {
  return {
    id: crypto.randomUUID(),
    title:
      payload.notification?.title ||
      payload.data?.title ||
      "New notification",
    message:
      payload.notification?.body ||
      payload.data?.body ||
      "",
    time: new Date().toISOString(),
    read: false,
    type: payload.data?.type || "info",
    masjidId: payload.data?.masjid_id || null,
    imageUrl:
      payload.notification?.image ||
      payload.data?.imageUrl ||
      null,
    actionUrl: payload.data?.actionUrl || null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useForegroundNotifications() {
  /** In-app toast queue — shown while the tab is active. */
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  // ── BroadcastChannel (shared with SW) ──────────────────────────────────────
  // We keep a single channel instance for the lifetime of the hook. It is used:
  //   send  → NEW_NOTIFICATION   : notify other tabs of the incoming message
  //   send  → SHOW_NOTIFICATION  : ask SW to display the OS banner
  //   recv  ← NOTIFICATION_CLICKED / NOTIFICATION_DISMISSED : from SW clicks

  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);

    // ── Handle SW → main-thread events ────────────────────────────────────────
    channel.addEventListener("message", (event) => {
      const { type, notificationId } = event.data ?? {};

      if (type === "NOTIFICATION_CLICKED" && notificationId) {
        // Mark as read in the toast queue (UI can highlight it differently)
        setToasts((prev) =>
          prev.map((t) =>
            t.id === notificationId ? { ...t, read: true } : t
          )
        );
      }

      if (type === "NOTIFICATION_DISMISSED" && notificationId) {
        setToasts((prev) => prev.filter((t) => t.id !== notificationId));
      }
    });

    // ── FCM foreground message handler ────────────────────────────────────────
    // onMessage only fires when this tab is the active, visible tab.
    let unsubscribe: (() => void) | undefined;

    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log("[useForegroundNotifications] Foreground message:", payload);

        const notification = normalisePayload(payload as Record<string, any>);

        // 1. Add to local in-app toast queue
        setToasts((prev) => [notification, ...prev]);

        // 2. Broadcast to all tabs so useNotifications / any listener updates
        channel.postMessage({ type: "NEW_NOTIFICATION", notification });

        // 3. Ask the SW to show the OS system banner (FCM suppresses it for
        //    foreground tabs — the SW re-fires it on our behalf).
        channel.postMessage({ type: "SHOW_NOTIFICATION", notification });

        // 4. Auto-dismiss the in-app toast after TOAST_AUTO_DISMISS_MS
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== notification.id));
        }, TOAST_AUTO_DISMISS_MS);
      });
    }

    return () => {
      unsubscribe?.();
      channel.close();
    };
  }, []);

  // ── dismissToast ───────────────────────────────────────────────────────────

  /** Manually remove a toast (e.g. when the user clicks the × button). */
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── clearToasts ────────────────────────────────────────────────────────────

  /** Clear all in-app toasts at once (e.g. on sign-out). */
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    /** Currently visible in-app notification toasts. */
    toasts,
    /** Remove a single toast by its id. */
    dismissToast,
    /** Remove all toasts. */
    clearToasts,
  };
}