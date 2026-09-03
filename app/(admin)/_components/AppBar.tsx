"use client";

/**
 * AppBar.tsx
 *
 * Wired to useProfile() for real user data:
 *   - Avatar shows profile_picture_url or initials from first_name + last_name
 *   - Display name uses first_name + last_name (falls back to session.user.name)
 *   - User chip links to /profile
 *   - Everything else (FCM push, bell dropdown) unchanged
 */

import { LayoutDashboard, Search, Bell, Settings, CheckCheck, X, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePushNotifications, type PushNotification } from "@/hooks/notifications/usePushNotifications";
import { useDeviceToken } from "@/hooks/notifications/useDeviceToken";
import { useProfile } from "@/hooks/useProfile";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function buildInitials(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string | null,
): string {
  const first = firstName?.[0]?.toUpperCase() ?? "";
  const last  = lastName?.[0]?.toUpperCase()  ?? "";
  if (first || last) return `${first}${last}`;
  return fallback?.charAt(0).toUpperCase() ?? "A";
}

const typeStyles: Record<PushNotification["type"], { badge: string; dot: string }> = {
  info:    { badge: "bg-blue-50 text-blue-600",       dot: "bg-blue-400"    },
  success: { badge: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-400" },
  warning: { badge: "bg-amber-50 text-amber-600",     dot: "bg-amber-400"   },
  error:   { badge: "bg-rose-50 text-rose-600",       dot: "bg-rose-400"    },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function AppBar({
  onToggleSidebar,
  sidebarCollapsed,
}: {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}) {
  const { data: session } = useSession();

  // ── Real profile data ─────────────────────────────────────────────────────
  const { profile, isLoading: profileLoading } = useProfile();

  const displayName = profileLoading
    ? (session?.user?.name ?? "…")
    : profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || (session?.user?.name ?? "User")
      : (session?.user?.name ?? "User");

  const initials = profileLoading
    ? (session?.user?.name?.charAt(0).toUpperCase() ?? "A")
    : buildInitials(profile?.first_name, profile?.last_name, session?.user?.name);

  const avatarUrl = profile?.profile_picture_url ?? null;

  // ── Push notification state ───────────────────────────────────────────────
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
  } = usePushNotifications();

  // ── Auto-register device token once user is authenticated ────────────────
  const { register } = useDeviceToken();
  useEffect(() => {
    if (session?.user) register();
  }, [session?.user, register]);

  // ── Hydration guard ───────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Dropdown state ────────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Bell "pop" animation when a new notification arrives ─────────────────
  const [bellPop, setBellPop] = useState(false);
  const [toastNotif, setToastNotif] = useState<PushNotification | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleNewPush(e: Event) {
      const notif = (e as CustomEvent<PushNotification>).detail;
      setBellPop(true);
      setTimeout(() => setBellPop(false), 600);
      setToastNotif(notif);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastNotif(null), 4000);
    }
    window.addEventListener("push:new", handleNewPush);
    return () => window.removeEventListener("push:new", handleNewPush);
  }, []);

  // ── Close dropdown when clicking outside ─────────────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notifOpen]);

  // ── Handle permission prompt ──────────────────────────────────────────────
  const handleEnableNotifications = useCallback(async () => {
    await requestPermission();
    await register();
  }, [requestPermission, register]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── In-app toast ─────────────────────────────────────────────────── */}
      {mounted && toastNotif && (
        <div
          className="fixed bottom-5 right-5 z-[9999] flex items-start gap-3
                     bg-white border border-slate-100 shadow-2xl rounded-2xl
                     px-4 py-3 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300"
          role="alert"
          aria-live="polite"
        >
          <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${typeStyles[toastNotif.type].dot}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{toastNotif.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{toastNotif.message}</p>
          </div>
          <button
            onClick={() => setToastNotif(null)}
            aria-label="Dismiss toast"
            className="text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── AppBar ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#faf8ff]/90 backdrop-blur-md border-b border-slate-100 flex justify-between items-center px-7 py-3.5">
        <div className="flex items-center gap-5">
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <LayoutDashboard size={18} aria-hidden="true" />
          </button>

          <span
            className="text-xl font-extrabold text-[#064e3b] tracking-tight hidden lg:block"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            masjids.io
          </span>

          <div className="relative hidden lg:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <label htmlFor="admin-search" className="sr-only">Search data or members</label>
            <input
              id="admin-search"
              type="search"
              placeholder="Search data or members..."
              className="bg-[#e2e7ff] border-none rounded-full pl-9 pr-4 py-2 text-sm w-64
                         focus:ring-2 focus:ring-[#003527]/20 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">

          {/* ── Notification Bell ──────────────────────────────────────── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className={`relative p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors
                          ${bellPop ? "animate-bounce" : ""}`}
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={notifOpen}
            >
              <Bell size={18} aria-hidden="true" />
              {mounted && unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-rose-500 text-white
                                 text-[10px] font-bold rounded-full flex items-center justify-center
                                 leading-none px-0.5 transition-all">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* ── Dropdown ────────────────────────────────────────────── */}
            {mounted && notifOpen && (
              <div
                className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl
                           border border-slate-100 overflow-hidden z-50
                           animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-800">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 text-xs font-semibold text-rose-500">
                        {unreadCount} new
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="flex items-center gap-1 text-xs font-medium text-[#064e3b] hover:underline"
                        title="Mark all as read"
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-slate-300 hover:text-rose-400 transition-colors"
                        title="Clear all notifications"
                        aria-label="Clear all notifications"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permission banner */}
                {permission !== "granted" && (
                  <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs text-amber-700 font-medium mb-1.5">
                      Enable browser notifications to receive push alerts.
                    </p>
                    <button
                      onClick={handleEnableNotifications}
                      className="text-xs font-bold text-amber-700 underline hover:text-amber-900"
                    >
                      Enable notifications →
                    </button>
                  </div>
                )}

                {/* List */}
                <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50" role="list">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-8 text-center text-sm text-slate-400">
                      You're all caught up 🎉
                    </li>
                  ) : (
                    notifications.map((n) => {
                      const styles = typeStyles[n.type] ?? typeStyles.info;
                      return (
                        <li
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            n.read ? "bg-white hover:bg-slate-50" : "bg-[#f5f9f7] hover:bg-[#edf5f1]"
                          }`}
                          role="listitem"
                        >
                          <div className="mt-1.5 shrink-0">
                            <span className={`block w-2 h-2 rounded-full ${n.read ? "bg-slate-200" : styles.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {n.actionUrl ? (
                              <Link
                                href={n.actionUrl}
                                className="text-xs font-semibold text-slate-800 truncate hover:underline block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {n.title}
                              </Link>
                            ) : (
                              <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${styles.badge}`}>
                              {relativeTime(n.time)}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                            aria-label="Dismiss notification"
                            className="shrink-0 mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 rounded transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                    <Link
                      href="/notifications-comunity"
                      className="text-xs font-semibold text-[#064e3b] hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings / Profile icon */}
          <Link
            href="/profile"
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Profile settings"
          >
            <Settings size={18} aria-hidden="true" />
          </Link>

          {/* ── User chip — links to /profile, shows real data ─────────── */}
          <Link
            href="/profile"
            className="flex items-center gap-2.5 ml-2 bg-[#f2f3ff] px-3 py-1.5 rounded-full
                       border border-slate-200/50 hover:border-[#003527]/30 transition-colors"
            aria-label="Go to your profile"
          >
            {/* Avatar: photo → initials */}
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full bg-[#064e3b] flex items-center justify-center
                           text-white text-xs font-bold shrink-0 select-none"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}

            {/* Display name */}
            <span className="text-xs font-bold text-[#064e3b] hidden sm:block max-w-[120px] truncate">
              {displayName}
            </span>
          </Link>

        </div>
      </header>
    </>
  );
}