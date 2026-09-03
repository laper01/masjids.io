/**
 * hooks/notifications/usePushNotifications.ts
 *
 * Master hook that wires together:
 *   1. Foreground FCM messages  (onMessage from firebase/messaging)
 *   2. Background FCM messages  (BroadcastChannel from service worker)
 *   3. localStorage persistence (survives page refreshes)
 *   4. Read / dismiss / clear   (mutates localStorage + React state in sync)
 *
 * Usage:
 *   const {
 *     notifications, unreadCount,
 *     markAsRead, markAllAsRead, dismiss, clearAll,
 *     permission, requestPermission,
 *   } = usePushNotifications();
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase"; // your existing firebase init

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type NotifType = "info" | "success" | "warning" | "error";
export type NotifPermission = "default" | "granted" | "denied";

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  time: string;       // ISO timestamp
  read: boolean;
  type: NotifType;
  masjidId?: string | null;
  imageUrl?: string | null;
  actionUrl?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "push_notifications";
const MAX_STORED = 50;
const CHANNEL_NAME = "push_notifications_channel";

// ─────────────────────────────────────────────────────────────────────────────
// LOCALSTORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function loadFromStorage(): PushNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PushNotification[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: PushNotification[]) {
  try {
    // Keep only the most recent MAX_STORED notifications
    const trimmed = notifications.slice(0, MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage might be full — silently ignore
  }
}

function buildNotificationFromPayload(payload: {
  notification?: { title?: string; body?: string; image?: string };
  data?: Record<string, string>;
}): PushNotification {
  return {
    id: crypto.randomUUID(),
    title: payload.notification?.title || payload.data?.title || "New notification",
    message: payload.notification?.body || payload.data?.body || "",
    time: new Date().toISOString(),
    read: false,
    type: (payload.data?.type as NotifType) || "info",
    masjidId: payload.data?.masjid_id || null,
    imageUrl: payload.notification?.image || payload.data?.imageUrl || null,
    actionUrl: payload.data?.actionUrl || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const [notifications, setNotifications] = useState<PushNotification[]>(() =>
    loadFromStorage()
  );
  const [permission, setPermission] = useState<NotifPermission>(() => {
    if (typeof Notification === "undefined") return "default";
    return Notification.permission as NotifPermission;
  });

  // BroadcastChannel ref (to avoid recreation on re-render)
  const channelRef = useRef<BroadcastChannel | null>(null);

  // ── Sync state → localStorage whenever notifications change ────────────────
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  // ── Helper: prepend a new notification (newest first) ──────────────────────
  const addNotification = useCallback((notif: PushNotification) => {
    setNotifications((prev) => {
      // Deduplicate by id
      if (prev.some((n) => n.id === notif.id)) return prev;
      return [notif, ...prev].slice(0, MAX_STORED);
    });

    // Show a subtle in-app "toast" via a custom event so AppBar can animate
    window.dispatchEvent(
      new CustomEvent("push:new", { detail: notif })
    );
  }, []);

  // ── FOREGROUND: Listen for FCM messages while tab is active ────────────────
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[usePushNotifications] Foreground message:", payload);
      const notif = buildNotificationFromPayload(payload as Parameters<typeof buildNotificationFromPayload>[0]);
      addNotification(notif);
    });

    return () => unsubscribe();
  }, [addNotification]);

  // ── BACKGROUND: Listen for messages relayed by the service worker ──────────
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    channelRef.current.onmessage = (event) => {
      if (event.data?.type === "NEW_NOTIFICATION") {
        addNotification(event.data.notification as PushNotification);
      }
    };

    return () => {
      channelRef.current?.close();
    };
  }, [addNotification]);

  // ── REQUEST PERMISSION ─────────────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<NotifPermission> => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result as NotifPermission);
    return result as NotifPermission;
  }, []);

  // ── MUTATIONS ──────────────────────────────────────────────────────────────

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback((masjidId?: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (masjidId && n.masjidId !== masjidId) return n;
        return { ...n, read: true };
      })
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ── DERIVED ────────────────────────────────────────────────────────────────

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
  };
}