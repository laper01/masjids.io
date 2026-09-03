"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Search, MapPin, ChevronDown, BadgeCheck,
  SlidersHorizontal, Grid2X2, Map, RefreshCw, Star, ChevronRight,
  X, Loader2, Globe, Navigation, VolumeX, Music2, Play, Pause, Volume2,
} from "lucide-react";
import { useMasjids } from "@/hooks/useMasjids";
import { useMasjidMedia } from "@/hooks/masjid/useMasjidMedia";
import { useAdhanList } from "@/hooks/useAdhanList";
import type { Mosque } from "@/types/masjid";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const PLACEHOLDER_IMAGE = "/images/masjid-cover.png";

// ─── GPS Banner ───────────────────────────────────────────────────────────────

function LocationBanner({
  userLocation, locationError,
}: {
  userLocation: { latitude: number; longitude: number } | null;
  locationError: string | null;
}) {
  if (!userLocation && !locationError) {
    return (
      <div
        data-testid="location-banner"
        data-banner-state="loading"
        className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-3"
      >
        <Loader2 size={11} className="animate-spin" />
        Detecting your location…
      </div>
    );
  }
  if (locationError) {
    return (
      <div
        data-testid="location-banner"
        data-banner-state="error"
        className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mt-3 max-w-xl mx-auto"
      >
        <Navigation size={11} className="shrink-0" />
        {locationError}
      </div>
    );
  }
  return (
    <div
      data-testid="location-banner"
      data-banner-state="active"
      className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-600 mt-3"
    >
      <Navigation size={10} />
      Using your location · distances shown nearest-first
    </div>
  );
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({
  radius, setRadius,
  onApply, onReset, userLocation,
}: {
  radius: number; setRadius: (v: number) => void;
  onApply: () => void; onReset: () => void;
  userLocation: { latitude: number; longitude: number } | null;
}) {
  return (
    <aside data-testid="filter-sidebar" className="space-y-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[#003527]" />
          <h2 className="font-bold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>Filters</h2>
        </div>
        <button
          data-testid="filter-reset-button"
          aria-label="Reset filters"
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#003527] transition-colors"
        >
          <RefreshCw size={11} /> Reset
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="filter-radius-number" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Search Radius
            {!userLocation && (
              <span className="ml-2 text-[9px] font-normal text-amber-500 normal-case tracking-normal">
                (enable GPS to activate)
              </span>
            )}
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="filter-radius-number"
              data-testid="filter-radius-number-input"
              aria-label="Search radius in kilometers"
              type="number"
              min={1}
              value={radius}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isNaN(v)) return;
                setRadius(Math.max(1, v)); // ✅ no upper limit — type any value
              }}
              className="w-24 text-right text-xs font-bold text-[#003527] bg-[#f2f3ff] border-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#003527]/20 focus:outline-none"
            />
            <span className="text-xs font-bold text-[#003527]">km</span>
          </div>
        </div>
        <input
          data-testid="filter-radius-range-input"
          aria-label="Search radius slider"
          type="range" min={1} max={20000} step={10} value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#003527]" />
        <div className="flex justify-between mt-1.5 text-[10px] font-medium text-slate-400">
          <span>1km</span><span>5,000km</span><span>10,000km</span><span>20,000km</span>
        </div>
      </div>

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        data-testid="filter-apply-button"
        onClick={onApply}
        className="w-full bg-[#064e3b] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#003527] transition-colors">
        Apply Filters
      </motion.button>
    </aside>
  );
}

// ─── Adhan Player ─────────────────────────────────────────────────────────────

function AdhanPlayer({ masjidId }: { masjidId: string }) {
  const { adhanFiles, isLoading, error } = useAdhanList({ masjidId, limit: 5 });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [expanded, setExpanded]       = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const file = adhanFiles[selectedIdx] ?? null;

  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!file?.url) return;
    if (!audioRef.current || audioRef.current.src !== file.url) {
      audioRef.current?.pause();
      audioRef.current = new Audio(file.url);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().catch(() => setIsPlaying(false)); setIsPlaying(true); }
  };

  const selectFile = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    audioRef.current?.pause();
    setIsPlaying(false);
    setSelectedIdx(idx);
  };

  if (isLoading) return (
    <div data-testid="adhan-player-loading" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f8fffe] border border-emerald-50 animate-pulse">
      <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
      <div className="h-3 w-24 bg-slate-200 rounded" />
    </div>
  );
  if (error === "unauthenticated") return null;
  if (!file) return (
    <div data-testid="adhan-player-empty" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
      <VolumeX size={13} className="text-slate-300 shrink-0" />
      <span className="text-[10px] text-slate-300 italic">No adhan recorded</span>
    </div>
  );

  return (
    <div data-testid="adhan-player" className="rounded-xl bg-[#f8fffe] border border-emerald-100 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          data-testid="adhan-play-toggle"
          onClick={togglePlay} aria-label={isPlaying ? "Pause adhan" : "Play adhan"}
          className="w-7 h-7 rounded-full bg-[#003527] text-white flex items-center justify-center shrink-0 hover:bg-[#064e3b] transition-colors shadow-sm">
          {isPlaying ? <Pause size={11} /> : <Play size={11} className="translate-x-[1px]" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Adhan</p>
          <p className="text-xs font-semibold text-[#003527] truncate leading-tight">{file.name || "Muezzin recording"}</p>
        </div>
        {adhanFiles.length > 1 && (
          <button
            data-testid="adhan-list-toggle"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            aria-expanded={expanded}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors shrink-0">
            <Music2 size={10} />{adhanFiles.length}
            <ChevronDown size={9} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            data-testid="adhan-list"
            className="overflow-hidden border-t border-emerald-100">
            <div className="px-3 py-2 space-y-1">
              {adhanFiles.map((f, idx) => (
                <button
                  key={f.id ?? idx}
                  data-testid={`adhan-list-item-${idx}`}
                  onClick={(e) => selectFile(e, idx)}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-xs",
                    selectedIdx === idx ? "bg-[#003527] text-white" : "text-slate-600 hover:bg-emerald-50")}>
                  <Volume2 size={10} className="shrink-0" />
                  <span className="truncate">{f.name || `Recording ${idx + 1}`}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Masjid Card ─────────────────────────────────────────────────────────────

function MasjidCard({ masjid, index }: { masjid: Mosque; index: number }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const {
    coverPhoto, facility,
    loading: mediaLoading, error: mediaError,
    getCoverPhoto, getFacility,
  } = useMasjidMedia();

  useEffect(() => {
    if (!inView) return;
    getCoverPhoto(masjid.id);
    getFacility(masjid.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, masjid.id]);

  const coverUrl        = coverPhoto?.data?.cover_photo_url || (masjid as any).imageUrl || PLACEHOLDER_IMAGE;
  const capacityDisplay = facility?.data?.capacity?.total?.toLocaleString() ?? (masjid as any).capacity?.toLocaleString() ?? "—";
  const services: string[] = facility?.data?.services ?? (masjid as any).services ?? [];
  const language: string | null = facility?.data?.languages?.[0] ?? null;
  const distanceLabel   = (masjid as any).distance ?? "—";

  return (
    <motion.article
      ref={ref}
      data-testid={`masjid-card-${masjid.id}`}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300"
    >
      <div className="relative h-52 overflow-hidden bg-slate-100">
        {mediaLoading ? (
          <div data-testid="masjid-card-media-skeleton" className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            data-testid="masjid-card-cover-image"
            src={coverUrl} alt={masjid.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {language && (
          <div
            data-testid="masjid-card-language-badge"
            className="absolute left-3 flex items-center gap-1 bg-white/20 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{ top: masjid.verified ? "2.5rem" : "0.75rem" }}>
            <Globe size={10} /> {language}
          </div>
        )}
        <div className="absolute bottom-3 right-3 bg-[#b0f0d6]/95 backdrop-blur-sm text-[#003527] px-2.5 py-1 rounded-full text-[10px] font-bold">
          Next: {(masjid as any).nextPrayer ?? "—"}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 data-testid="masjid-card-name" className="font-bold text-[#003527] text-base leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            {masjid.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-[#003527]">{(masjid as any).rating ?? "—"}</span>
            <span className="text-[10px] text-slate-400">({(masjid as any).reviewCount ?? 0})</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
          <MapPin size={10} /> {masjid.address}, {masjid.city}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4 bg-[#f8fffe] rounded-xl p-3 border border-emerald-50">
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Distance</p>
            <p data-testid="masjid-card-distance" className="text-sm font-bold text-[#003527]">{distanceLabel}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Capacity</p>
            <p data-testid="masjid-card-capacity" className="text-sm font-bold text-[#003527]">
              {mediaLoading ? <Loader2 size={12} className="animate-spin text-[#003527] mx-auto" /> : capacityDisplay}
            </p>
          </div>
        </div>

        <div data-testid="masjid-card-services" className="flex flex-wrap gap-1.5 mb-4 min-h-[22px]">
          {mediaLoading ? (
            <>
              <div className="h-5 w-20 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-5 w-16 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-5 w-24 bg-slate-100 rounded-md animate-pulse" />
            </>
          ) : (
            <>
              {services.slice(0, 3).map((s) => (
                <span key={s} className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-100">{s}</span>
              ))}
              {services.length > 3 && (
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">+{services.length - 3}</span>
              )}
              {services.length === 0 && !mediaError && (
                <span className="text-[10px] text-slate-300 italic">No services listed</span>
              )}
            </>
          )}
        </div>

        {mediaError && (
          <p data-testid="masjid-card-media-error" className="text-[10px] text-slate-300 mb-3 flex items-center gap-1">
            <RefreshCw size={9} /> Could not load facility details
          </p>
        )}

        <div className="mb-4"><AdhanPlayer masjidId={masjid.id} /></div>

        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          data-testid="masjid-card-view-profile"
          onClick={() => window.open(`/public-masjids/${masjid.id}`, "_blank", "noopener,noreferrer")}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#f2f3ff] text-[#003527] font-bold text-xs rounded-xl hover:bg-[#003527] hover:text-white transition-all group/btn"
        >
          View Profile
          <ChevronRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </motion.button>
      </div>
    </motion.article>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const {
    mosques, isLoading: masjidsLoading,
    error: masjidsError, refetch,
    userLocation, locationError,
    // ✅ pagination
    hasMore, isLoadingMore, loadMore,
  } = useMasjids();

  const [nameQuery,          setNameQuery]          = useState("");
  const [locationQuery,      setLocationQuery]      = useState("");
  const [radius,             setRadius]             = useState(50);
  const [viewMode,           setViewMode]           = useState<"grid" | "map">("grid");
  const [results,            setResults]            = useState<Mosque[]>([]);
  const [mobileFiltersOpen,  setMobileFiltersOpen]  = useState(false);

  // Sync results when mosques updates from hook
  useEffect(() => { setResults(mosques); }, [mosques]);

  // ✅ Send all filter params to backend
  const applyFilters = useCallback(() => {
    const params = {
      name:     nameQuery.trim()     || undefined,
      location: locationQuery.trim() || undefined,
      ...(userLocation ? {
        lat:    userLocation.latitude,
        lon:    userLocation.longitude,
        radius: radius,
      } : {}),
    };
    refetch(params);
    setMobileFiltersOpen(false);
  }, [nameQuery, locationQuery, userLocation, radius, refetch]);

  const resetFilters = useCallback(() => {
    setNameQuery(""); setLocationQuery("");
    refetch({});
  }, [refetch]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div data-testid="discover-page" className="min-h-screen bg-[#faf8ff]" style={{ fontFamily: "Inter, sans-serif" }}>

        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-20 px-6 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-emerald-100/40 blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-50/60 blur-3xl translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-4">Your Community, Your Sanctuary</p>
              <h1 className="text-5xl md:text-7xl font-extrabold text-[#003527] mb-6 leading-[1.05] tracking-tight"
                style={{ fontFamily: "Manrope, sans-serif" }}>
                Find Your<br />
                <span className="relative inline-block">
                  Spiritual Home
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 400 8" fill="none">
                    <path d="M2 6 Q100 2 200 5 Q300 8 398 3" stroke="#95d3ba" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </svg>
                </span>
              </h1>
              <p className="text-slate-500 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                Discover mosques near you, check prayer times, and connect with your local Ummah.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex flex-col md:flex-row gap-2 max-w-3xl mx-auto mb-3">
              <div className="flex-1 flex items-center gap-3 px-4 py-2 md:border-r border-slate-100">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <Search size={14} className="text-emerald-700" />
                </div>
                <input
                  type="text" value={nameQuery} onChange={(e) => setNameQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Masjid name…"
                  data-testid="search-name-input"
                  aria-label="Masjid name"
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-medium placeholder:text-slate-300" />
              </div>
              <div className="flex-1 flex items-center gap-3 px-4 py-2">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-emerald-700" />
                </div>
                <input
                  type="text" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="City or postal code…"
                  data-testid="search-location-input"
                  aria-label="City or postal code"
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-medium placeholder:text-slate-300" />
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={applyFilters}
                data-testid="search-submit-button"
                className="bg-[#003527] text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-[#064e3b] transition-colors shrink-0">
                Search
              </motion.button>
            </motion.div>

            <LocationBanner userLocation={userLocation} locationError={locationError} />
          </div>
        </section>

        {/* Directory */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">

            <div className="hidden lg:block" data-testid="desktop-filter-sidebar">
              <div className="sticky top-24 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <FilterSidebar radius={radius} setRadius={setRadius}
                  onApply={applyFilters} onReset={resetFilters}
                  userLocation={userLocation} />
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Nearby Masjids
                  </h2>
                  <p data-testid="results-count" className="text-sm text-slate-400 mt-0.5">
                    {masjidsLoading ? "Searching…"
                      : masjidsError ? "Could not load masjids"
                      : userLocation ? `${results.length} location${results.length !== 1 ? "s" : ""} within ${radius} km`
                      : `Found ${results.length} location${results.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                  {masjidsError && (
                    <button
                      data-testid="error-retry-button"
                      onClick={() => refetch()}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-500 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                      <RefreshCw size={13} /> Retry
                    </button>
                  )}
                  <button
                    onClick={() => setMobileFiltersOpen(true)}
                    data-testid="mobile-filter-toggle"
                    aria-label="Open filters"
                    className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">
                    <SlidersHorizontal size={13} /> Filters
                  </button>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5">
                    {(["grid", "map"] as const).map((mode) => (
                      <button key={mode} onClick={() => setViewMode(mode)}
                        data-testid={`view-mode-${mode}`}
                        aria-pressed={viewMode === mode}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          viewMode === mode ? "bg-[#003527] text-white shadow-sm" : "text-slate-400 hover:text-[#003527]")}>
                        {mode === "grid" ? <Grid2X2 size={13} /> : <Map size={13} />}
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {masjidsLoading ? (
                <div data-testid="masjids-loading" className="flex items-center justify-center py-32">
                  <Loader2 size={32} className="text-[#003527] animate-spin" />
                </div>
              ) : masjidsError ? (
                <div data-testid="masjids-error-state" className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                    <RefreshCw size={24} className="text-red-300" />
                  </div>
                  <h3 className="font-bold text-[#003527] mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Failed to load masjids</h3>
                  <p className="text-sm text-slate-400 mb-4">{masjidsError}</p>
                  <button data-testid="error-try-again-link" onClick={() => refetch()} className="text-sm font-semibold text-[#003527] underline underline-offset-2">Try again</button>
                </div>
              ) : results.length > 0 ? (
                <div data-testid="masjids-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.map((m, i) => <MasjidCard key={m.id} masjid={m} index={i} />)}
                </div>
              ) : (
                <div data-testid="masjids-empty-state" className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                    <Search size={24} className="text-emerald-300" />
                  </div>
                  <h3 className="font-bold text-[#003527] mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>No masjids found</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {userLocation
                      ? `No masjids found. Try increasing the search radius.`
                      : "Try adjusting your filters or search terms."}
                  </p>
                  <button data-testid="empty-state-reset-button" onClick={resetFilters} className="text-sm font-semibold text-[#003527] underline underline-offset-2">
                    Reset all filters
                  </button>
                </div>
              )}

              {/* ✅ Load More — wired to hook's loadMore/hasMore/isLoadingMore */}
              {!masjidsLoading && !masjidsError && results.length > 0 && hasMore && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="mt-12 flex justify-center">
                  <button
                    data-testid="load-more-button"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 text-[#003527] font-bold text-sm group hover:gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Loading…
                      </>
                    ) : (
                      <>
                        Load More Masjids
                        <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#003527] text-white px-6 lg:px-16 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
              <div className="md:col-span-2">
                <span className="text-2xl font-extrabold tracking-tight block mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>masjids.io</span>
                <p className="text-emerald-200/70 text-sm leading-relaxed max-w-xs">Connecting the Ummah to sacred spaces with modern technology and heart.</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-4">Platform</p>
                <div className="space-y-2.5">
                  {["Privacy Policy", "Terms of Service", "Accessibility"].map((l) => (
                    <a key={l} href="#" className="block text-emerald-200/60 hover:text-white text-sm transition-colors">{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-4">Community</p>
                <div className="space-y-2.5">
                  {["About Us", "Contact", "Blog", "Volunteer"].map((l) => (
                    <a key={l} href="#" className="block text-emerald-200/60 hover:text-white text-sm transition-colors">{l}</a>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-emerald-200/40">© 2024 masjids.io. A Sacred Sanctuary Project.</p>
              <p className="text-xs text-emerald-200/40">Built with ♥ for the Ummah</p>
            </div>
          </div>
        </footer>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {mobileFiltersOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                data-testid="mobile-filter-overlay"
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={() => setMobileFiltersOpen(false)} />
              <motion.div
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                data-testid="mobile-filter-drawer"
                className="fixed left-0 top-0 bottom-0 z-50 w-80 bg-white shadow-2xl overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>Filters</h3>
                  <button onClick={() => setMobileFiltersOpen(false)}
                    data-testid="mobile-filter-close"
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close filters">
                    <X size={18} />
                  </button>
                </div>
                <FilterSidebar radius={radius} setRadius={setRadius}
                  onApply={applyFilters} onReset={resetFilters}
                  userLocation={userLocation} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}