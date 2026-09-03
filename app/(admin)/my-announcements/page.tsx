"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, CalendarDays, AlertTriangle, Heart, Wrench, Moon,
  Building2, ChevronRight, ChevronLeft, Loader2, AlertCircle, X,
  Users, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFollowers } from "@/hooks/followers/useFollowers";
import { useAnnouncements } from "@/hooks/announcements/useAnnouncements";
import type { AnnouncementListItem } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — matches the rest of masjids.io (emerald + gold, Manrope display)
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  primary:       "#003527",
  primaryMid:    "#064e3b",
  primaryLight:  "#e8f5ef",
  primaryFixed:  "#b0f0d6",
  gold:          "#d4a853",
  surface:       "#faf8ff",
  surfaceLow:    "#f2f3ff",
  surfaceHigh:   "#e2e7ff",
  white:         "#ffffff",
  text:          "#131b2e",
  textMuted:     "#4b5563",
  textFaint:     "#9ca3af",
  border:        "rgba(0,53,39,0.08)",
  error:         "#ba1a1a",
  errorBg:       "#ffdad6",
  shadow:        "0 4px 24px -4px rgba(0,53,39,0.10)",
  shadowMd:      "0 8px 32px -6px rgba(0,53,39,0.14)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY CONFIG — color encodes meaning (category), used as a left accent
// bar and small badge on each announcement card.
// ─────────────────────────────────────────────────────────────────────────────

type CategoryCfg = { label: string; icon: React.ElementType; color: string; bg: string };

const CATEGORY_CONFIG: Record<string, CategoryCfg> = {
  general:     { label: "General",     icon: Megaphone,     color: C.primary,  bg: C.primaryLight },
  event:       { label: "Event",       icon: CalendarDays,  color: "#1d4ed8",  bg: "#dbeafe" },
  urgent:      { label: "Urgent",      icon: AlertTriangle, color: "#b91c1c",  bg: "#fee2e2" },
  emergency:   { label: "Urgent",      icon: AlertTriangle, color: "#b91c1c",  bg: "#fee2e2" },
  prayer:      { label: "Prayer",      icon: Moon,          color: "#6d28d9",  bg: "#ede9fe" },
  donation:    { label: "Donation",    icon: Heart,         color: "#be185d",  bg: "#fce7f3" },
  maintenance: { label: "Maintenance", icon: Wrench,        color: "#92400e",  bg: "#fef3c7" },
};

function categoryCfg(category: string): CategoryCfg {
  return CATEGORY_CONFIG[category?.toLowerCase()] ?? {
    label: category ? category.charAt(0).toUpperCase() + category.slice(1) : "Update",
    icon: Megaphone,
    color: C.textMuted,
    bg: C.surfaceLow,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDate(iso);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] as number[] },
});

const STAGGER = { animate: { transition: { staggerChildren: 0.06 } } };
const STAGGER_ITEM = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg animate-pulse", className)}
      style={{ background: "rgba(0,53,39,0.06)" }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, body }: {
  icon: React.ElementType; title: string; body: string;
}) {
  return (
    <div className="py-16 text-center rounded-2xl"
      style={{ background: C.white, border: `1px solid ${C.border}` }}>
      <Icon size={28} className="mx-auto mb-3" style={{ color: C.textFaint }} />
      <p className="font-semibold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>{title}</p>
      <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: C.textFaint }}>{body}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MASJID SELECTOR — chips for masjids the user follows
// ─────────────────────────────────────────────────────────────────────────────

function MasjidChip({ masjidId, name, city, followerCount, selected, onSelect }: {
  masjidId: string; name: string; city?: string | null; followerCount: number;
  selected: boolean; onSelect: () => void;
}) {
  return (
    <motion.button
      variants={STAGGER_ITEM}
      onClick={onSelect}
      className="relative overflow-hidden shrink-0 text-left rounded-2xl px-4 py-3 transition-all"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 100%)`
          : C.white,
        border: selected ? "none" : `1.5px solid ${C.border}`,
        boxShadow: selected ? C.shadowMd : "none",
        minWidth: 190,
      }}
    >
      {selected && (
        <svg className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
          xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <pattern id={`geo-${masjidId}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M20 0 L40 10 L40 30 L20 40 L0 30 L0 10 Z" fill="none" stroke="white" strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#geo-${masjidId})`} />
        </svg>
      )}
      <div className="relative flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: selected ? "rgba(255,255,255,0.15)" : C.primaryLight }}>
          <Building2 size={15} style={{ color: selected ? C.white : C.primary }} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate"
            style={{ color: selected ? C.white : C.text, fontFamily: "Manrope, sans-serif" }}>
            {name}
          </p>
          <p className="text-[11px] truncate flex items-center gap-1"
            style={{ color: selected ? "rgba(255,255,255,0.6)" : C.textFaint }}>
            <Users size={9} aria-hidden="true" />
            {followerCount.toLocaleString()} following{city ? ` · ${city}` : ""}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENT CARD
// ─────────────────────────────────────────────────────────────────────────────

function AnnouncementCard({ announcement }: { announcement: AnnouncementListItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = categoryCfg(announcement.category);
  const Icon = cfg.icon;
  const isLong = (announcement.body ?? "").length > 220;

  return (
    <motion.article
      variants={STAGGER_ITEM}
      className="rounded-2xl overflow-hidden flex"
      style={{ background: C.white, boxShadow: C.shadow, border: `1px solid ${C.border}` }}
    >
      <div className="w-1 shrink-0" style={{ background: cfg.color }} aria-hidden="true" />
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: cfg.bg, color: cfg.color }}>
            <Icon size={11} aria-hidden="true" />
            {cfg.label}
          </span>
          <span className="text-[11px] shrink-0" style={{ color: C.textFaint }}>
            {fmtRelative(announcement.published_at)}
          </span>
        </div>

        <h3 className="text-base font-bold leading-snug mb-2"
          style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
          {announcement.title}
        </h3>

        {announcement.media_url && (
          <div className="rounded-xl overflow-hidden mb-3" style={{ background: C.surfaceLow }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={announcement.media_url} alt="" className="w-full max-h-64 object-cover" />
          </div>
        )}

        <p className={cn("text-sm leading-relaxed", !expanded && isLong && "line-clamp-3")}
          style={{ color: C.textMuted }}>
          {announcement.body}
        </p>

        {isLong && (
          <button onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold mt-2" style={{ color: C.primary }}>
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </motion.article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function MyAnnouncementsPage() {
  const {
    followedMasjids, loading: followersLoading, error: followersError,
    getFollowedMasjids, clearError: clearFollowersError,
  } = useFollowers();

  const {
    announcements, loading: announcementsLoading, error: announcementsError,
    getAnnouncements, clearError: clearAnnouncementsError,
  } = useAnnouncements();

  const [selectedMasjidId, setSelectedMasjidId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // FOL-05: fetch masjids the user follows, on mount
  useEffect(() => {
    void getFollowedMasjids({ page: 1, limit: 20 });
  }, [getFollowedMasjids]);

  const followedList = useMemo(
    () => (followedMasjids?.data ?? []).slice().sort(
      (a, b) => new Date(b.followed_at).getTime() - new Date(a.followed_at).getTime()
    ),
    [followedMasjids]
  );

  // Auto-select the most recently followed masjid once the list loads
  useEffect(() => {
    if (selectedMasjidId) return;
    if (followedList.length > 0) setSelectedMasjidId(followedList[0].masjid_id);
  }, [followedList, selectedMasjidId]);

  // Reset to page 1 whenever the selected masjid changes
  useEffect(() => { setPage(1); }, [selectedMasjidId]);

  // ANN-02: fetch announcements for the selected masjid
  useEffect(() => {
    if (!selectedMasjidId) return;
    void getAnnouncements(selectedMasjidId, { page, limit: 10 });
  }, [selectedMasjidId, page, getAnnouncements]);

  const items = announcements?.data ?? [];
  const totalPages = announcements?.metadata?.total_page ?? 1;
  const selectedMasjidName = followedList.find((m) => m.masjid_id === selectedMasjidId)?.name ?? "";

  const isLoadingFollowed = followersLoading && followedList.length === 0;
  const isLoadingFeed = announcementsLoading && items.length === 0;
  const error = followersError ?? announcementsError;

  const dismissError = useCallback(() => {
    clearFollowersError();
    clearAnnouncementsError();
  }, [clearFollowersError, clearAnnouncementsError]);

  return (
    <div className="min-h-screen" style={{ background: C.surface, fontFamily: "Inter, sans-serif", color: C.text }}>
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <motion.div {...FADE_UP(0)}>
          <div className="inline-flex items-center gap-2 mb-2">
            <Bell size={16} style={{ color: C.primary }} aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.textFaint }}>
              Announcements
            </p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            {selectedMasjidName || "Your feed"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.textMuted }}>
            Updates from the masjids you follow.
          </p>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="alert"
              className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm"
              style={{ background: C.errorBg, color: C.error, border: "1px solid rgba(186,26,26,0.2)" }}>
              <AlertCircle size={15} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={dismissError} aria-label="Dismiss error"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Masjid selector — only shown once we know which masjids are followed */}
        {isLoadingFollowed ? (
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {[0, 1, 2].map((i) => <Sk key={i} className="h-[60px] w-[190px] shrink-0 rounded-2xl" />)}
          </div>
        ) : followedList.length === 0 ? (
          <EmptyState icon={Building2} title="Follow a masjid to see updates"
            body="Once you follow a masjid, their announcements will show up here." />
        ) : followedList.length > 1 ? (
          <motion.div variants={STAGGER} initial="initial" animate="animate"
            className="flex gap-2.5 overflow-x-auto pb-1">
            {followedList.map((m) => (
              <MasjidChip key={m.masjid_id}
                masjidId={m.masjid_id} name={m.name} city={m.city}
                followerCount={m.follower_count}
                selected={m.masjid_id === selectedMasjidId}
                onSelect={() => setSelectedMasjidId(m.masjid_id)}
              />
            ))}
          </motion.div>
        ) : null}

        {/* Announcements feed */}
        {followedList.length > 0 && (
          <motion.div {...FADE_UP(0.1)} className="space-y-3">
            {isLoadingFeed ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-2xl p-5 flex gap-3"
                    style={{ background: C.white, border: `1px solid ${C.border}` }}>
                    <div className="flex-1 space-y-3">
                      <Sk className="h-4 w-24" />
                      <Sk className="h-5 w-3/4" />
                      <Sk className="h-3 w-full" />
                      <Sk className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements yet"
                body={`${selectedMasjidName || "This masjid"} hasn't posted any updates yet. Check back soon.`} />
            ) : (
              <motion.div variants={STAGGER} initial="initial" animate="animate" className="space-y-3">
                {items.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && items.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 text-xs font-semibold disabled:opacity-30"
                  style={{ color: C.primary }}>
                  <ChevronLeft size={13} aria-hidden="true" /> Previous
                </button>
                <span className="text-xs" style={{ color: C.textFaint }}>
                  Page {page} of {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="flex items-center gap-1 text-xs font-semibold disabled:opacity-30"
                  style={{ color: C.primary }}>
                  Next <ChevronRight size={13} aria-hidden="true" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}