// public/firebase-messaging-sw.js
// ─────────────────────────────────────────────────────────────────────────────
// Firebase Cloud Messaging Service Worker
//
// Handles TWO notification contexts:
//
//   BACKGROUND  — tab is closed or hidden; onBackgroundMessage fires here,
//                 we show a native OS notification + broadcast to main thread.
//
//   FOREGROUND  — tab is visible; FCM suppresses the OS notification by design.
//                 The main thread's onMessage handler (useForegroundNotifications)
//                 broadcasts a SHOW_NOTIFICATION message back to THIS worker,
//                 which then calls showNotification() so the OS banner still
//                 appears even while the user is on the page.
//
// BroadcastChannel messages sent FROM this worker:
//   { type: "NEW_NOTIFICATION", notification }   — store + render in app
//
// BroadcastChannel messages received BY this worker:
//   { type: "SHOW_NOTIFICATION", notification }  — show OS banner for foreground
//
// Place this file at: /public/firebase-messaging-sw.js
// ─────────────────────────────────────────────────────────────────────────────

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ── Firebase config (must match your app's config) ────────────────────────────
// NOTE: These values are safe to expose — Firebase security is enforced via
//       Security Rules and FCM server keys (never exposed here).
firebase.initializeApp({
  apiKey: "AIzaSyAQfbFRt6-NfTGxzCJF2MLXvtYwzz7Qi3U",
  authDomain: "limestone-62a07.firebaseapp.com",
  projectId: "limestone-62a07",
  storageBucket: "limestone-62a07.firebasestorage.app",
  messagingSenderId: "176843764605",
  appId: "1:176843764605:web:a85863872f29ed9e4fd214",
});

const messaging = firebase.messaging();

// ── Constants ─────────────────────────────────────────────────────────────────
const CHANNEL_NAME = "push_notifications_channel";

// ── BroadcastChannel ──────────────────────────────────────────────────────────
// Used for two-way communication between this SW and the main thread:
//   SW  → main  : NEW_NOTIFICATION  (background messages + foreground relay)
//   main → SW   : SHOW_NOTIFICATION (ask SW to display OS banner for foreground)
const channel = new BroadcastChannel(CHANNEL_NAME);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise an FCM payload into our app's notification shape and broadcast
 * it to all open tabs so they can persist + re-render.
 */
function broadcastNewNotification(payload) {
  const notification = buildNotificationObject(payload);
  channel.postMessage({ type: "NEW_NOTIFICATION", notification });
  return notification;
}

/**
 * Build a normalised notification object from an FCM payload OR from an
 * already-normalised object (forwarded from the foreground onMessage handler).
 */
function buildNotificationObject(payloadOrNotif) {
  // If the main thread forwarded an already-built object, pass it through.
  if (payloadOrNotif.id && payloadOrNotif.title) return payloadOrNotif;

  return {
    id: crypto.randomUUID(),
    title:
      payloadOrNotif.notification?.title ||
      payloadOrNotif.data?.title ||
      "New notification",
    message:
      payloadOrNotif.notification?.body ||
      payloadOrNotif.data?.body ||
      "",
    time: new Date().toISOString(),
    read: false,
    type: payloadOrNotif.data?.type || "info",
    masjidId: payloadOrNotif.data?.masjid_id || null,
    imageUrl:
      payloadOrNotif.notification?.image ||
      payloadOrNotif.data?.imageUrl ||
      null,
    actionUrl: payloadOrNotif.data?.actionUrl || null,
  };
}

/**
 * Show a native OS notification banner via the SW registration.
 * Called for both background messages and foreground SHOW_NOTIFICATION requests.
 */
function showSystemNotification(notification) {
  const options = {
    body: notification.message,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    image: notification.imageUrl || undefined,
    tag: notification.id, // deduplicate — same id won't stack
    data: {
      actionUrl: notification.actionUrl || "/",
      notificationId: notification.id,
    },
    actions: [
      { action: "open", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
    requireInteraction: false,
    silent: false,
  };

  return self.registration.showNotification(notification.title, options);
}

// ── Background message handler ────────────────────────────────────────────────
// Fires when the app tab is hidden, minimised, or closed.
// FCM automatically suppresses the OS banner here — we must call
// showNotification() ourselves.
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  const notification = broadcastNewNotification(payload);
  return showSystemNotification(notification);
});

// ── Foreground SHOW_NOTIFICATION handler ──────────────────────────────────────
// When the tab IS visible, FCM's onMessage fires in the page (not here), so
// no OS banner appears automatically. useForegroundNotifications handles the
// in-app toast and then sends SHOW_NOTIFICATION here so we can still show the
// OS banner — giving users both the in-app UI and the system notification.
channel.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_NOTIFICATION") return;

  const notification = buildNotificationObject(event.data.notification);
  console.log("[SW] Foreground show-notification request:", notification);
  showSystemNotification(notification);
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const actionUrl = event.notification.data?.actionUrl || "/";

  if (event.action === "dismiss") return;

  // Broadcast to app so it can mark the notification read
  channel.postMessage({
    type: "NOTIFICATION_CLICKED",
    notificationId: event.notification.data?.notificationId,
    actionUrl,
  });

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus and navigate an existing tab if one is open
        for (const client of windowClients) {
          if (
            client.url.includes(self.location.origin) &&
            "focus" in client
          ) {
            client.focus();
            client.navigate(actionUrl);
            return;
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(actionUrl);
        }
      })
  );
});

// ── Notification close handler ────────────────────────────────────────────────
// Fired when the user explicitly dismisses the OS banner (X button).
self.addEventListener("notificationclose", (event) => {
  channel.postMessage({
    type: "NOTIFICATION_DISMISSED",
    notificationId: event.notification.data?.notificationId,
  });
});