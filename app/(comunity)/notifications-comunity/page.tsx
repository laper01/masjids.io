"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Calendar,
  Users,
  AlertTriangle,
  BookOpen,
  Building2,
  RefreshCw,
  X,
  ArrowLeft,
  ExternalLink,
  Share2,
  Bookmark,
  MapPin,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useMosque } from "@/context/MosqueContext";
import type { GetNotificationsQuery } from "@/types/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type NotifTag = "Community" | "Prayer Times" | "Youth" | "Urgent" | "Event" | "Donation";

interface Notification {
  id: string;
  sender: string;
  initials: string;
  message: string;
  fullMessage: string;
  tag: NotifTag;
  time: string;
  date: string;
  location: string;
  unread: boolean;
  imageUrl: string | null; // ✅ nullable
}

interface TopMasjid {
  id: string;
  name: string;
  threads: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Tag Config ───────────────────────────────────────────────────────────────
// Defined BEFORE normalizeNotification so the Object.keys() guard below works.
const TAG_STYLES: Record<NotifTag, { style: string; icon: React.ReactNode }> = {
  Community:      { style: "bg-[#b0f0d6]/50 text-[#002117]",  icon: <Users size={9} /> },
  "Prayer Times": { style: "bg-[#dae2fd] text-[#283044]",     icon: <Bell size={9} /> },
  Youth:          { style: "bg-[#d3e4fe] text-[#0b1c30]",     icon: <BookOpen size={9} /> },
  Urgent:         { style: "bg-[#ffdad6] text-[#93000a]",     icon: <AlertTriangle size={9} /> },
  Event:          { style: "bg-purple-100 text-purple-800",    icon: <Calendar size={9} /> },
  Donation:       { style: "bg-amber-100 text-amber-800",      icon: <Building2 size={9} /> },
};

/** Always returns a valid tag config — never undefined. */
function getTagStyle(tag: string) {
  return TAG_STYLES[tag as NotifTag] ?? TAG_STYLES["Community"];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeNotification(n: any): Notification {
  return {
    id: n.id,
    sender: n.masjid?.name ?? n.sender ?? "Unknown",
    initials: toInitials(n.masjid?.name ?? n.sender ?? "?"),
    message: n.body ?? n.message ?? "",
    fullMessage: n.full_body ?? n.body ?? n.message ?? "",
    tag: (Object.keys(TAG_STYLES).includes(n.type) ? n.type : "Community") as NotifTag,
    time: n.created_at
      ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
          Math.round(
            (new Date(n.created_at).getTime() - Date.now()) / 3_600_000
          ),
          "hour"
        )
      : n.time ?? "",
    date: n.event_date ?? n.date ?? "",
    location: n.location ?? n.masjid?.address ?? "",
    unread: !n.read,
    // ✅ Use || so empty strings also fall through to null
    imageUrl: n.masjid?.image_url || n.imageUrl || null,
  };
}

// ─── Static sidebar mock ──────────────────────────────────────────────────────
const TOP_MASJIDS: TopMasjid[] = [
  { id: "1", name: "Masjid Al-Hikmah", threads: 12 },
  { id: "2", name: "Islamic Center of West", threads: 8 },
  { id: "3", name: "Baitul Aman Mosque", threads: 6 },
];

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

const itemVariant = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
  exit: { opacity: 0, x: 12, height: 0, transition: { duration: 0.2 } },
};

const panelVariant = {
  hidden:  { opacity: 0, x: "100%" },
  visible: { opacity: 1, x: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: "100%", transition: { duration: 0.28, ease: [0.55, 0, 1, 0.45] } },
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/80">{label}</span>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={cn("w-10 h-5 rounded-full relative transition-colors", on ? "bg-white/40" : "bg-white/15")}
      >
        <motion.div
          animate={{ x: on ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn("absolute top-1 w-3 h-3 rounded-full", on ? "bg-white" : "bg-white/50")}
        />
      </button>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
/** Renders the masjid image if available, otherwise shows initials fallback. */
function Avatar({
  imageUrl,
  initials,
  sender,
  unread,
  className,
}: {
  imageUrl: string | null;
  initials: string;
  sender: string;
  unread?: boolean;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={sender}
        className={cn(
          "w-12 h-12 rounded-xl object-cover shadow-sm transition-all",
          !unread && "grayscale group-hover:grayscale-0",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-sm bg-[#064e3b] transition-all",
        !unread && "opacity-60 group-hover:opacity-100",
        className
      )}
    >
      {initials}
    </div>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────
function NotifItem({
  notif,
  index,
  onRead,
  onSelect,
  isPending,
}: {
  notif: Notification;
  index: number;
  onRead: (id: string) => void;
  onSelect: (notif: Notification) => void;
  isPending: boolean;
}) {
  const tag = getTagStyle(notif.tag);

  function handleClick() {
    onRead(notif.id);
    onSelect(notif);
  }

  return (
    <motion.div
      variants={itemVariant}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      layout
      onClick={handleClick}
      className={cn(
        "flex items-start gap-4 p-5 cursor-pointer border-b border-slate-100 last:border-0 transition-colors group relative",
        notif.unread ? "bg-white hover:bg-slate-50/80" : "bg-white hover:bg-slate-50/50"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {/* ✅ Never renders src="" — shows initials when imageUrl is null/empty */}
        <Avatar
          imageUrl={notif.imageUrl}
          initials={notif.initials}
          sender={notif.sender}
          unread={notif.unread}
        />

        {notif.unread && !isPending && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#064e3b] rounded-full border-2 border-white" />
        )}
        {isPending && (
          <span className="absolute -top-1 -right-1 w-3 h-3 flex items-center justify-center">
            <Loader2 size={10} className="animate-spin text-[#064e3b]" />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3
            className={cn("text-sm font-bold leading-tight", notif.unread ? "text-[#131b2e]" : "text-slate-500")}
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {notif.sender}
          </h3>
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">{notif.time}</span>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{notif.message}</p>
        <div className="flex items-center justify-between">
          <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
            tag.style
          )}>
            {tag.icon} {notif.tag}
          </span>
          <span className="text-[10px] font-semibold text-[#064e3b] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            View details <ChevronRight size={10} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function NotifDetailPanel({
  notif,
  onClose,
}: {
  notif: Notification;
  onClose: () => void;
}) {
  const tag = getTagStyle(notif.tag);
  const [saved, setSaved] = useState(false);

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
      />

      <motion.aside
        key="panel"
        variants={panelVariant}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
        aria-label="Notification detail"
      >
        {/* Hero — ✅ only renders <img> when imageUrl is non-null */}
        <div className="relative h-52 shrink-0 overflow-hidden bg-[#064e3b]">
          {notif.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={notif.imageUrl}
              alt={notif.sender}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#003527]/70 via-transparent to-black/20" />

          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-white/90 hover:text-white bg-black/20 hover:bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSaved((v) => !v)}
                className={cn(
                  "p-2 rounded-full backdrop-blur-sm transition-all",
                  saved ? "bg-[#064e3b] text-white" : "bg-black/20 text-white/90 hover:bg-black/30"
                )}
                aria-label="Save notification"
              >
                <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
              </button>
              <button
                className="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white/90 hover:bg-black/30 transition-all"
                aria-label="Share"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#064e3b] flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg">
              {notif.initials}
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                {notif.sender}
              </p>
              <p className="text-white/70 text-[10px]">{notif.time}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
            tag.style
          )}>
            {tag.icon} {notif.tag}
          </span>

          <div className="space-y-3">
            {notif.fullMessage.split("\n\n").map((para, i) => (
              <p key={i} className="text-slate-600 text-sm leading-relaxed">{para}</p>
            ))}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#064e3b]/10 flex items-center justify-center shrink-0">
                <Clock size={13} className="text-[#064e3b]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">When</p>
                <p className="text-sm font-semibold text-slate-700">{notif.date}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#064e3b]/10 flex items-center justify-center shrink-0">
                <MapPin size={13} className="text-[#064e3b]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Where</p>
                <p className="text-sm font-semibold text-slate-700">{notif.location}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-slate-100 shrink-0">
          <button className="w-full flex items-center justify-center gap-2 bg-[#064e3b] hover:bg-[#003527] text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-sm">
            <ExternalLink size={14} />
            Visit Masjid Page
          </button>
        </div>
      </motion.aside>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EngagementPage() {
  const { activeMosque } = useMosque();

  const {
    notifications,
    unreadCount,
    loading,
    error,
    isNotificationPending,
    getNotifications,
    markAsRead,
    markAllAsRead,
    clearError,
  } = useNotifications();

  const [pushOn, setPushOn]               = useState(true);
  const [emailOn, setEmailOn]             = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [page, setPage]                   = useState(1);

  const notifs = (notifications?.data ?? []).map(normalizeNotification);

  useEffect(() => {
    const query: GetNotificationsQuery = { page: 1 };
    if (activeMosque?.id) query.masjid_id = activeMosque.id;
    setPage(1);
    getNotifications(query);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMosque?.id]);

  async function loadMore() {
    const nextPage = page + 1;
    const query: GetNotificationsQuery = { page: nextPage };
    if (activeMosque?.id) query.masjid_id = activeMosque.id;
    await getNotifications(query);
    setPage(nextPage);
  }

  async function handleSelect(notif: Notification) {
    setSelectedNotif(notif);
    if (notif.unread) await markAsRead(notif.id);
  }

  async function handleMarkAllRead() {
    await markAllAsRead(activeMosque?.id);
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ── Page Header ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="mb-10">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Engagement</p>
        <h1 className="text-3xl font-extrabold text-[#003527] tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
          Notification Hub
        </h1>
        <p className="text-slate-500 text-sm">
          Stay updated with the latest announcements
          {activeMosque ? ` from ${activeMosque.name}` : " from your community masjids"}.
        </p>
      </motion.div>

      {/* ── Global error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"
          >
            <span>{error}</span>
            <button onClick={clearError} aria-label="Dismiss error"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── Left: Feed ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="lg:col-span-8 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#f2f3ff] rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Updates</span>
              {unreadCount > 0 && (
                <motion.span
                  key={unreadCount}
                  initial={{ scale: 0.7 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-5 h-5 bg-[#064e3b] text-white text-[9px] font-black rounded-full"
                >
                  {unreadCount}
                </motion.span>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleMarkAllRead}
              disabled={loading || unreadCount === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#064e3b] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck size={12} /> Mark all as read
            </motion.button>
          </div>

          {/* Initial loading skeleton */}
          {loading && notifs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-5 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notification list */}
          {notifs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <AnimatePresence initial={false}>
                {notifs.map((n, i) => (
                  <NotifItem
                    key={n.id}
                    notif={n}
                    index={i}
                    onRead={(id) => markAsRead(id)}
                    onSelect={handleSelect}
                    isPending={isNotificationPending(n.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {!loading && notifs.length === 0 && !error && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center gap-3 text-center">
              <Bell size={32} className="text-slate-200" />
              <p className="text-slate-400 text-sm font-medium">No notifications yet</p>
            </div>
          )}

          {/* Load more */}
          {notifs.length > 0 && (
            <div className="flex justify-center pt-4">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                onClick={loadMore}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-[#064e3b] hover:bg-[#003527] disabled:opacity-60 text-white px-8 py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors"
              >
                <motion.span
                  animate={loading ? { rotate: 360 } : { rotate: 0 }}
                  transition={loading ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}
                >
                  <RefreshCw size={14} />
                </motion.span>
                {loading ? "Loading…" : "Load Older Notifications"}
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* ── Right: Sidebar ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Notification Settings Card */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="bg-[#064e3b] rounded-2xl p-7 text-white relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Bell size={16} className="text-[#b0f0d6]" />
                <h2 className="text-base font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Notification Settings</h2>
              </div>
              <p className="text-white/60 text-xs leading-relaxed mb-6">Customize how you receive updates from your followed masjids.</p>
              <div className="space-y-4">
                <Toggle on={pushOn} onChange={() => setPushOn((v) => !v)} label="Push Notifications" />
                <Toggle on={emailOn} onChange={() => setEmailOn((v) => !v)} label="Email Digest" />
                <div className="pt-2 border-t border-white/10">
                  <Toggle on={true} onChange={() => {}} label="Prayer Time Alerts" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Top Masjids */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-[#003527] mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Top Masjids</h2>
            <div className="space-y-3">
              {TOP_MASJIDS.map((m, i) => (
                <motion.div
                  key={m.id}
                  variants={fadeUp} initial="hidden" animate="visible" custom={4 + i}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 bg-[#f2f3ff] rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={15} className="text-[#064e3b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#131b2e] truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-400">{m.threads} Active Threads</p>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 group-hover:text-[#064e3b] transition-colors shrink-0" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Community Event Banner */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7} className="relative overflow-hidden rounded-2xl h-48 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-t from-[#003527]/80 via-[#064e3b]/30 to-transparent z-10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeNDNLdIDfVEkncPcIDp0M60PIpuH6MwOx_m3LMeiJWqMlgyAKGmGEBvaVH9eKM5GSGsd3NAOooT8ArzwelJF_dPgjEH5leAIGLCsGxzBebZ_5Dy-MhvgwkzJgRHtAY2JmubMpNpn-JySowVAIkhC0MdpDiKxZZZU0VKWoOCMwrWBW7l7YHo7ZOZFycSIb7BCuK-KDB450dwxppdT3uougQ35EB8bgB60mmn0HN32FaWfL9hWHyA8LkfZ7qapFWWoXgt06nB4sHJM"
              alt="Annual Unity Dinner"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute bottom-4 left-4 z-20 text-white">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-70 flex items-center gap-1">
                <Calendar size={9} /> Community Event
              </p>
              <h4 className="text-base font-bold leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Annual Unity Dinner</h4>
              <p className="text-xs opacity-80 mt-1">Saturday, Nov 12 · 6:00 PM</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Detail Panel ── */}
      <AnimatePresence>
        {selectedNotif && (
          <NotifDetailPanel notif={selectedNotif} onClose={() => setSelectedNotif(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}