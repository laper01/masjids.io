"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  MapPin, Search, Bell, ChevronDown,
  CheckCircle2, AlertCircle, Loader2,
  RefreshCw, Users, Globe, X, BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFollowers } from "@/hooks/followers/useFollowers";
import { useEnrichMasjids } from "@/hooks/useEnrichMasjids";
import type { FollowedMasjidItem } from "@/types/api";
import type { Mosque } from "@/types/masjid";

// ─── Types ────────────────────────────────────────────────────────────────────
type PrayerName = "FAJR" | "DHUHR" | "ASR" | "MAGHRIB" | "ISHA";

interface PrayerTime {
  name: PrayerName;
  time: string;
  isNext: boolean;
}

interface Masjid {
  id: string;
  name: string;
  location: string;
  verified: boolean;
  nextPrayer: string;
  nextIn: string;
  prayers: PrayerTime[];
  notificationsOn: boolean;
  imageUrl: string;
}

// ─── Map API → Mosque shape (used by useEnrichMasjids) ───────────────────────
// useEnrichMasjids expects a `Mosque[]`, so we map FollowedMasjidItem → Mosque.
// imageUrl / thumbnailUrl will be back-filled by the hook once cover data loads.
function mapToMosque(item: FollowedMasjidItem): Mosque {
  return {
    id: item.masjid_id,
    name: item.name,
    city: item.city,
    // countryCode: item.country_code ?? "",   // pass through for countryCount stat
    // enrichment targets — initially empty
    thumbnailUrl: "",
    imageUrl: "",
    capacity: undefined,
    services: [],
    language: "",
  } as unknown as Mosque; // cast: remaining Mosque fields are enriched by the hook
}

// ─── Map EnrichedMosque → local UI Masjid ─────────────────────────────────────
// Keeps the local Masjid shape (prayers, nextPrayer etc.) while overlaying
// the enriched fields (imageUrl, verified via capacity heuristic, etc.)
function mapToMasjid(item: FollowedMasjidItem, enriched?: { imageUrl?: string; capacity?: number }): Masjid {
  return {
    id: item.masjid_id,
    name: item.name,
    location: item.city,
    verified: false,                        // FOL-05 does not return this field
    nextPrayer: "",                         // FOL-05 does not return this field
    nextIn: "",                             // FOL-05 does not return this field
    prayers: [],                            // FOL-05 does not return this field
    notificationsOn: item.push_enabled || item.in_app_enabled,
    imageUrl: enriched?.imageUrl ?? "",
  };
}

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

const cardAnim = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.44, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.2 } },
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="bg-white rounded-xl overflow-hidden animate-pulse"
      style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.08)" }}
    >
      <div className="h-48 bg-slate-100" />
      <div className="p-6 space-y-4">
        <div className="h-4 bg-slate-100 rounded w-2/3" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
        <div className="grid grid-cols-5 gap-1.5 bg-[#f2f3ff] rounded-xl p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 rounded-lg" />
          ))}
        </div>
        <div className="h-9 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Image Skeleton overlay — shown while cover photo is still loading ────────
function ImageSkeleton() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
  );
}

// ─── Prayer Row ───────────────────────────────────────────────────────────────
function PrayerRow({ prayers }: { prayers: PrayerTime[] }) {
  const SHORT: Record<PrayerName, string> = {
    FAJR: "FAJR", DHUHR: "DHUHR", ASR: "ASR", MAGHRIB: "MGHR", ISHA: "ISHA",
  };
  if (prayers.length === 0) {
    return (
      <div className="bg-[#f2f3ff] rounded-xl p-3 mb-5 text-center text-xs text-slate-400">
        Prayer times unavailable
      </div>
    );
  }
  return (
    <div className="grid grid-cols-5 gap-1.5 bg-[#f2f3ff] rounded-xl p-3 mb-5">
      {prayers.map((p) => (
        <div
          key={p.name}
          className={cn(
            "text-center rounded-lg py-1.5 transition-all",
            p.isNext ? "bg-white shadow-sm ring-1 ring-[#064e3b]/20" : ""
          )}
        >
          <span className={cn(
            "block text-[8px] font-black uppercase tracking-widest mb-1",
            p.isNext ? "text-[#064e3b]" : "text-slate-400"
          )}>
            {SHORT[p.name]}
          </span>
          <span className={cn(
            "text-xs font-bold tabular-nums",
            p.isNext ? "text-[#064e3b]" : "text-[#131b2e]"
          )}>
            {p.time}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Unfollow Confirmation Modal ───────────────────────────────────────────────
function ConfirmUnfollowModal({
  masjidName, onConfirm, onCancel, loading,
}: {
  masjidName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="unfollow-modal-title"
      >
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 pt-6 pb-5">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <BellOff size={18} className="text-red-500" />
            </div>
            <h3
              id="unfollow-modal-title"
              className="font-extrabold text-lg text-[#131b2e] mb-1.5"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Unfollow this masjid?
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              You'll stop getting prayer time updates and notifications from{" "}
              <span className="font-semibold text-slate-700">{masjidName}</span>.
            </p>
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Unfollow"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({
  masjid,
  index,
  onRequestUnfollow,
  isUnfollowing,
  isImageLoading,   // ← driven by loadingMap from useEnrichMasjids
}: {
  masjid: Masjid;
  index: number;
  onRequestUnfollow: (id: string) => void;
  isUnfollowing: boolean;
  isImageLoading: boolean;
}) {
  const router = useRouter();

  return (
    <motion.div
      variants={cardAnim}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      layout
      className="bg-white rounded-xl overflow-hidden flex flex-col group"
      style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.08)" }}
    >
      {/* Hero image — skeleton while enriching, placeholder when no image */}
      <div className="relative h-48 overflow-hidden shrink-0 bg-gradient-to-br from-[#003527] to-[#064e3b]">
        {isImageLoading && <ImageSkeleton />}
        {!isImageLoading && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={masjid.imageUrl || "/images/masjid-cover.png"}
            alt={masjid.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        {masjid.verified && (
          <div className="absolute top-4 left-4 bg-[#064e3b]/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle2 size={10} className="text-[#b0f0d6]" />
            Verified
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Title row */}
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="min-w-0">
            <h3
              className="font-extrabold text-[17px] text-[#131b2e] tracking-tight leading-snug"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {masjid.name}
            </h3>
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
              <MapPin size={10} />
              {masjid.location}
            </p>
          </div>
          {masjid.nextPrayer && (
            <div className="text-right shrink-0">
              <span className="block text-[9px] font-bold uppercase text-[#003527]/50 tracking-wider mb-1">
                Next Prayer
              </span>
              <span className="text-xs font-bold text-[#064e3b] bg-[#b0f0d6]/40 px-3 py-1 rounded-lg whitespace-nowrap">
                {masjid.nextPrayer} in {masjid.nextIn}
              </span>
            </div>
          )}
        </div>

        {/* Prayer times */}
        <PrayerRow prayers={masjid.prayers} />

        {/* Buttons */}
        <div className="flex gap-3 mt-auto">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/public-masjids/${masjid.id}`)}
            className="flex-1 bg-gradient-to-br from-[#003527] to-[#064e3b] text-white py-2.5 rounded-lg text-sm font-bold"
          >
            View Profile
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRequestUnfollow(masjid.id)}
            disabled={isUnfollowing}
            aria-label="Unfollow masjid"
            className={cn(
              "px-4 py-2.5 border rounded-lg text-sm font-semibold transition-colors",
              masjid.notificationsOn
                ? "border-[#064e3b]/30 text-[#064e3b] bg-[#f0faf5]"
                : "border-slate-200 text-slate-400 hover:bg-slate-50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isUnfollowing
              ? <Loader2 size={15} className="animate-spin" />
              : <Bell size={15} />
            }
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const LIMIT = 6;

export default function MasjidPublicPage() {
  const {
    followedMasjids,
    loading,
    error,
    getFollowedMasjids,
    unfollowMasjid,
    clearError,
  } = useFollowers();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "nearest">("recent");
  const [page, setPage] = useState(1);
  const [rawItems, setRawItems] = useState<FollowedMasjidItem[]>([]);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  // ★ Confirmation modal state — holds the masjid pending unfollow confirmation
  const [confirmTarget, setConfirmTarget] = useState<Masjid | null>(null);

  // Initial fetch
  useEffect(() => {
    getFollowedMasjids({ page: 1, limit: LIMIT });
  }, [getFollowedMasjids]);

  // Sync API data → rawItems (FollowedMasjidItem[])
  useEffect(() => {
    if (!followedMasjids) return;
    const incoming = followedMasjids.data ?? [];
    if (page === 1) {
      setRawItems(incoming);
    } else {
      setRawItems((prev) => {
        const existingIds = new Set(prev.map((m) => m.masjid_id));
        return [...prev, ...incoming.filter((m) => !existingIds.has(m.masjid_id))];
      });
    }
    setIsFetchingMore(false);
  }, [followedMasjids]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Enrichment ─────────────────────────────────────────────────────────────
  // Convert rawItems → Mosque[] so useEnrichMasjids can do its work.
  // The hook fires cover-photo + facility requests in parallel and streams
  // results back; loadingMap lets each card show its own skeleton.
  const mosquesForEnrichment = useMemo(
    () => rawItems.map(mapToMosque),
    [rawItems]
  );

  const { enriched, loadingMap, isEnriching, totalCapacity, countryCount, refresh } = useEnrichMasjids(mosquesForEnrichment);

  // Build a lookup of enriched data keyed by id for easy merge below
  const enrichedById = useMemo(
    () => Object.fromEntries(enriched.map((e) => [e.id, e])),
    [enriched]
  );

  // ─── Merge enriched cover photo URL back into local Masjid list ─────────────
  const localMasjids = useMemo(
    () =>
      rawItems.map((item) => {
        const e = enrichedById[item.masjid_id];
        return mapToMasjid(item, {
          imageUrl: e?.imageUrl ?? e?.thumbnailUrl ?? "",
          capacity: e?.capacity,
        });
      }),
    [rawItems, enrichedById]
  );

  // ────────────────────────────────────────────────────────────────────────────

  const totalCount = followedMasjids?.metadata?.total_data ?? localMasjids.length;
  const hasMore = localMasjids.length < totalCount;

  const filtered = useMemo(
    () =>
      localMasjids.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.location.toLowerCase().includes(search.toLowerCase())
      ),
    [localMasjids, search]
  );

  // ★ Bell button now only opens the confirmation modal
  const handleRequestUnfollow = useCallback(
    (id: string) => {
      const target = localMasjids.find((m) => m.id === id) ?? null;
      setConfirmTarget(target);
    },
    [localMasjids]
  );

  // ★ Actual unfollow call — fires only after the modal is confirmed
  const handleConfirmUnfollow = useCallback(async () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    setUnfollowingId(id);
    const result = await unfollowMasjid(id);
    if (result) {
      setRawItems((prev) => prev.filter((m) => m.masjid_id !== id));
    }
    setUnfollowingId(null);
    setConfirmTarget(null);
  }, [confirmTarget, unfollowMasjid]);

  const handleLoadMore = useCallback(async () => {
    const nextPage = page + 1;
    setIsFetchingMore(true);
    setPage(nextPage);
    await getFollowedMasjids({ page: nextPage, limit: LIMIT });
  }, [page, getFollowedMasjids]);

  const isInitialLoading = loading && localMasjids.length === 0;

  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6"
      >
        <div>
          <h1
            className="text-3xl font-extrabold text-[#003527] tracking-tight mb-2"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            My Followed Masjids
          </h1>
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <span className="inline-flex items-center bg-[#b0f0d6] text-[#002117] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {totalCount}
            </span>
            Active follows in your community
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-64">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#064e3b] transition-colors"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search masjids..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#e2e7ff]/70 border border-transparent rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 focus:bg-white transition-all"
              aria-label="Search followed masjids"
            />
          </div>
          <div className="flex bg-[#f2f3ff] p-1 rounded-xl" role="group">
            {(["recent", "nearest"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSort(mode)}
                aria-pressed={sort === mode}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                  sort === mode
                    ? "bg-white text-[#064e3b] shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {mode === "recent" ? "Recent Activity" : "Nearest"}
              </button>
            ))}
          </div>
          {/* Refresh enrichment data */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={refresh}
            disabled={isEnriching}
            aria-label="Refresh masjid data"
            className="p-2.5 bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#064e3b] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw size={15} className={cn(isEnriching && "animate-spin")} />
          </motion.button>
        </div>
      </motion.div>

      {/* Stats bar — totalCapacity + countryCount from useEnrichMasjids */}
      <AnimatePresence>
        {(totalCapacity > 0 || countryCount > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap gap-3 mb-10"
          >
            {totalCapacity > 0 && (
              <div className="inline-flex items-center gap-2 bg-[#f0faf5] border border-[#064e3b]/10 text-[#064e3b] text-xs font-bold px-4 py-2 rounded-xl">
                <Users size={13} />
                <span>{totalCapacity.toLocaleString()} total capacity</span>
              </div>
            )}
            {countryCount > 0 && (
              <div className="inline-flex items-center gap-2 bg-[#f0faf5] border border-[#064e3b]/10 text-[#064e3b] text-xs font-bold px-4 py-2 rounded-xl">
                <Globe size={13} />
                <span>{countryCount} {countryCount === 1 ? "country" : "countries"}</span>
              </div>
            )}
            {isEnriching && (
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-400 text-xs font-medium px-4 py-2 rounded-xl">
                <Loader2 size={12} className="animate-spin" />
                <span>Loading details…</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => { clearError(); getFollowedMasjids({ page: 1, limit: LIMIT }); }}
              className="font-bold underline underline-offset-2 hover:text-red-900 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {isInitialLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-slate-400 text-sm">
          {search ? "No masjids match your search." : "You haven't followed any masjids yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.map((m, i) => (
              <Card
                key={m.id}
                masjid={m}
                index={i}
                onRequestUnfollow={handleRequestUnfollow}
                isUnfollowing={unfollowingId === m.id}
                isImageLoading={loadingMap[m.id] ?? false}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Load more */}
      {!search && hasMore && (
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={4}
          className="mt-16 flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleLoadMore}
            disabled={isFetchingMore}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#003527] font-bold rounded-xl transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isFetchingMore ? (
              <><Loader2 size={15} className="animate-spin" /> Loading…</>
            ) : (
              <>Show more masjids <ChevronDown size={15} /></>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* ★ Unfollow confirmation modal */}
      <AnimatePresence>
        {confirmTarget && (
          <ConfirmUnfollowModal
            masjidName={confirmTarget.name}
            onConfirm={handleConfirmUnfollow}
            onCancel={() => setConfirmTarget(null)}
            loading={unfollowingId === confirmTarget.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}