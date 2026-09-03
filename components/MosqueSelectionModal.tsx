"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Search, X, ChevronRight,
  AlertTriangle, Plus, Loader2, CheckCircle2, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Mosque } from "@/types/masjid";
import Link from "next/link";

export type { Mosque };

/* ─── Types ───────────────────────────────────────────────── */
export interface MosqueContextState {
  activeMosque: Mosque | null;
  setActiveMosque: (mosque: Mosque) => void;
  isLoading: boolean;
}

interface MosqueSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mosqueList: Mosque[];
  isFetching?: boolean;
  fetchError?: string | null;
  onRetry?: () => void;
  onMosqueSelect?: (mosque: Mosque) => void;
}

/* ─── Constants ───────────────────────────────────────────── */
const STORAGE_KEY = "active_mosque";
const PAGE_SIZE = 8;

/* ─── Hook: Persistence ───────────────────────────────────── */
export function useActiveMosque(mosqueList: Mosque[]): MosqueContextState {
  const [activeMosque, setActive] = useState<Mosque | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (mosqueList.length === 0) { setIsLoading(false); return; }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setActive(JSON.parse(saved));
      } else {
        const defaultMosque = mosqueList[0];
        setActive(defaultMosque);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMosque));
      }
    } catch {
      if (mosqueList[0]) setActive(mosqueList[0]);
    } finally {
      setIsLoading(false);
    }
  }, [mosqueList]);

  const setActiveMosque = useCallback((mosque: Mosque) => {
    setActive(mosque);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mosque));
  }, []);

  return { activeMosque, setActiveMosque, isLoading };
}

/* ─── Mosque Card ─────────────────────────────────────────── */
function MosqueCard({
  mosque, isActive, onSelect, index,
}: {
  mosque: Mosque; isActive: boolean; onSelect: (m: Mosque) => void; index: number;
}) {
  const initials = mosque.name
    .split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.015, boxShadow: "0 4px 24px rgba(5,150,105,0.10)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(mosque)}
      aria-pressed={isActive}
      aria-label={`Select ${mosque.name}, ${mosque.location}`}
      className={cn(
        "w-full text-left rounded-xl border-2 p-4 flex items-center gap-4 transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        isActive
          ? "border-emerald-500 bg-emerald-50"
          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "relative w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-sm font-extrabold",
          isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
        )}
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        {mosque.thumbnailUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={mosque.thumbnailUrl} alt={mosque.name} className="w-full h-full object-cover rounded-xl" />
          : initials
        }
        {isActive && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center"
          >
            <CheckCircle2 size={9} className="text-white" />
          </motion.span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p
            className={cn("text-sm font-extrabold truncate", isActive ? "text-emerald-700" : "text-slate-900")}
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {mosque.name}
          </p>
 
        </div>
        <div className="flex items-center gap-1">
          <MapPin size={10} className="text-slate-400 shrink-0" aria-hidden="true" />
          <span className="text-xs text-slate-400 truncate">{mosque.location}</span>
        </div>
        <p className="text-[10px] text-slate-300 truncate mt-0.5">{mosque.address}</p>
      </div>

      {/* Right meta */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
    
        <span className="text-[10px] text-slate-300 truncate max-w-[80px]">{mosque.subDomain}</span>
        <ChevronRight
          size={13}
          className={cn("transition-colors", isActive ? "text-emerald-500" : "text-slate-300")}
          aria-hidden="true"
        />
      </div>
    </motion.button>
  );
}

/* ─── Empty State ─────────────────────────────────────────── */
function EmptyWarning() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200"
    >
      <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-amber-500" aria-hidden="true" />
      </div>
      <p className="text-sm font-extrabold text-slate-900 mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
        No Mosques Found
      </p>
      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mb-5">
        You are not associated with any mosque yet. Create a new mosque or request to join an existing one.
      </p>
        <div>
        <Link href="/masjid-management" className="w-full">
      <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
        <Plus size={14} aria-hidden="true" />
        Create or Join a Mosque
      </button>
      </Link>
      </div>
    </motion.div>
  );
}

/* ─── Error State ─────────────────────────────────────────── */
function FetchError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-10 text-center gap-3"
    >
      <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
        <AlertTriangle size={20} className="text-red-400" />
      </div>
      <p className="text-sm font-bold text-slate-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </motion.div>
  );
}

/* ─── Skeleton ────────────────────────────────────────────── */
function SkeletonCard({ i }: { i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ delay: i * 0.06 }}
      className="rounded-xl border-2 border-slate-100 p-4 flex items-center gap-4"
    >
      <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-100 rounded-md animate-pulse w-2/3" />
        <div className="h-2.5 bg-slate-100 rounded-md animate-pulse w-1/2" />
        <div className="h-2 bg-slate-100 rounded-md animate-pulse w-3/4" />
      </div>
      <div className="w-14 h-5 bg-slate-100 rounded-full animate-pulse" />
    </motion.div>
  );
}

/* ─── No Results ──────────────────────────────────────────── */
function NoResults({ query }: { query: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
      <Building2 size={28} className="text-slate-200 mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-400">No results for &ldquo;{query}&rdquo;</p>
      <p className="text-xs text-slate-300 mt-1">Try a different name or location.</p>
    </motion.div>
  );
}

/* ─── Modal ───────────────────────────────────────────────── */
export function MosqueSelectionModal({
  isOpen, onClose, mosqueList,
  isFetching = false, fetchError = null, onRetry,
  onMosqueSelect,
}: MosqueSelectionModalProps) {
  const { activeMosque, setActiveMosque } = useActiveMosque(mosqueList);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mosqueList;
    return mosqueList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        m.subDomain.toLowerCase().includes(q)
    );
  }, [mosqueList, query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query]);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 80);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((c) => c + PAGE_SIZE);
            setIsLoadingMore(false);
          }, 400);
        }
      },
      { root: scrollRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

  const handleSelect = useCallback((mosque: Mosque) => {
    setActiveMosque(mosque);
    onMosqueSelect?.(mosque);
    setTimeout(onClose, 260);
  }, [setActiveMosque, onMosqueSelect, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            key="modal"
            role="dialog" aria-modal="true" aria-labelledby="mosque-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: "min(680px, 90vh)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-5 border-b border-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h2
                        id="mosque-modal-title"
                        className="text-base font-extrabold text-slate-900"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        Select Masjids
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isFetching
                          ? "Loading mosques…"
                          : `${mosqueList.length} mosque${mosqueList.length !== 1 ? "s" : ""} available`
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close mosque selection"
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <X size={15} className="text-slate-500" aria-hidden="true" />
                  </button>
                </div>

                {/* Active chip */}
                {activeMosque && !isFetching && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 mb-4"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true" />
                    <span className="text-[11px] text-emerald-700 font-bold truncate">
                      Managing: {activeMosque.name}
                    </span>
                    {activeMosque.is_verified && (
                      <BadgeCheck size={12} className="text-emerald-500 shrink-0 ml-auto" aria-hidden="true" />
                    )}
                  </motion.div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, location, or subdomain…"
                    aria-label="Search mosques"
                    disabled={isFetching}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 flex items-center justify-center transition-colors"
                    >
                      <X size={9} className="text-white" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
                role="listbox"
                aria-label="Mosque list"
                aria-activedescendant={activeMosque ? `mosque-${activeMosque.id}` : undefined}
              >
                {isFetching && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} i={i} />)}

                {!isFetching && fetchError && (
                  <FetchError message={fetchError} onRetry={onRetry} />
                )}

                {!isFetching && !fetchError && mosqueList.length === 0 && <EmptyWarning />}

                {!isFetching && !fetchError && mosqueList.length > 0 && filtered.length === 0 && (
                  <NoResults query={query} />
                )}

                {!isFetching && !fetchError && visible.map((mosque, i) => (
                  <div
                    key={mosque.id}
                    id={`mosque-${mosque.id}`}
                    role="option"
                    aria-selected={activeMosque?.id === mosque.id}
                  >
                    <MosqueCard
                      mosque={mosque}
                      isActive={activeMosque?.id === mosque.id}
                      onSelect={handleSelect}
                      index={i}
                    />
                  </div>
                ))}

                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center py-3">
                    {isLoadingMore && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-xs text-slate-400">
                        <Loader2 size={14} className="animate-spin text-emerald-500" />
                        Loading more…
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
             
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}