"use client";

/**
 * MasjidFollowersPage.tsx
 *
 * Integrated Masjid Followers management page.
 *
 * DATA FLOW:
 *  1. Reads active mosque from MosqueContext (useMosque).
 *  2. Calls getFollowers(masjidId, query) from useFollowers() → FOL-04
 *     (hook internally hits GET /api/masjids/:masjid_id/followers via apiFetch).
 *  3. Maps API FollowerItem → internal Follower shape for the UI.
 *
 * NOTE: previously this page called `fetch()` directly, bypassing apiFetch's
 * 401 redirect interceptor and duplicating the response envelope shape.
 * Refactored to go through the shared useFollowers hook instead, per project
 * architecture rules (all data access goes through hooks → apiFetch).
 *
 * Only fields actually present in the API response are rendered.
 * (user_id, name, avatar_url, followed_at, follower_count)
 *
 * FIX: the API's nested array field is named `followers`, not `data` —
 * i.e. the full response shape is:
 *   { data: { follower_count, followers: [...], masjid_id } }
 * Previously this page read `followers?.data.data`, which never matched
 * anything and always evaluated to [], so the followers table stayed
 * empty even though follower_count displayed correctly.
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useMosque } from "@/context/MosqueContext";
import { useFollowers } from "@/hooks/followers/useFollowers";

// ─── Inline cn utility ────────────────────────────────────────────────────────
function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Follower {
  id: string;
  name: string;
  avatarUrl?: string;
  joinDate: string; // formatted from followed_at
  initials: string; // derived from name
}

// ─── API item shape (matches types/api.ts MasjidFollower) ─────────────────────
interface FollowerItem {
  user_id: string;
  name: string;
  avatar_url: string;
  followed_at: string;
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function mapApiFollower(item: FollowerItem): Follower {
  return {
    id: item.user_id,
    name: item.name,
    avatarUrl: item.avatar_url || undefined,
    joinDate: new Date(item.followed_at).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    }),
    initials: initials(item.name),
  };
}

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

const rowVariant = {
  hidden:  { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.32, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
  }),
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({
  initials: inits,
  avatarUrl,
  size = "md",
}: {
  initials: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz = { sm: "w-8 h-8 text-[10px]", md: "w-12 h-12 text-xs", lg: "w-24 h-24 text-xl" };
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = avatarUrl && !imgFailed;
  return (
    <div className="relative inline-block">
      {showImg ? (
        <img
          src={avatarUrl}
          alt={inits}
          className={cn("rounded-full object-cover shrink-0", sz[size])}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className={cn(
          "rounded-full bg-gradient-to-br from-[#064e3b] to-[#003527] flex items-center justify-center text-white font-black shrink-0",
          sz[size]
        )}>
          {inits}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MasjidFollowersPage() {
  // ✅ Ambil active mosque dari context — tidak perlu baca localStorage manual
  const { activeMosque, isHydrating } = useMosque();

  // ✅ Data-fetching lewat hook (useState + useCallback di dalam hook),
  // bukan fetch() langsung di page.
  const { followers, loading, error, getFollowers, clearError } = useFollowers();

  const [search, setSearch] = useState("");

  // ── Fetch saat activeMosque sudah tersedia dari context ────────────────────
  useEffect(() => {
    if (isHydrating) return;         // tunggu context selesai hydrate
    if (!activeMosque?.id) return;   // belum ada mosque aktif
    getFollowers(activeMosque.id, { page: 1, limit: 10 });
  }, [activeMosque?.id, isHydrating, getFollowers]);

  // ── Derived data from hook response ─────────────────────────────────────────
  // The nested array field is named `followers`, not `data`.
  const rawFollowers = followers?.data.followers ?? [];
  const totalCount = followers?.data.follower_count ?? 0;
  const mapped = useMemo(() => rawFollowers.map(mapApiFollower), [rawFollowers]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return mapped.filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.id.includes(search)
    );
  }, [mapped, search]);

  const handleRetry = () => {
    if (!activeMosque?.id) return;
    clearError();
    getFollowers(activeMosque.id, { page: 1, limit: 10 });
  };

  // ── Guard: context masih hydrating / hook masih loading pertama kali ───────
  if (isHydrating || (loading && !followers)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ fontFamily: "Inter, sans-serif" }}
        data-testid="followers-loading-state"
      >
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 size={32} className="animate-spin text-[#064e3b]" />
          <p className="text-sm font-medium">Loading followers…</p>
        </div>
      </div>
    );
  }

  // ── Guard: tidak ada mosque aktif ─────────────────────────────────────────
  if (!activeMosque) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ fontFamily: "Inter, sans-serif" }}
        data-testid="followers-no-mosque-state"
      >
        <div className="flex flex-col items-center gap-4 text-slate-500 max-w-sm text-center">
          <AlertCircle size={32} className="text-amber-400" />
          <p className="text-sm font-semibold text-[#131b2e]">No mosque selected</p>
          <p className="text-xs text-slate-400">Please select an active mosque to view followers.</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ fontFamily: "Inter, sans-serif" }}
        data-testid="followers-error-state"
      >
        <div className="flex flex-col items-center gap-4 text-slate-500 max-w-sm text-center">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm font-semibold text-[#131b2e]">Failed to load followers</p>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={handleRetry}
            className="px-5 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold"
            data-testid="followers-retry-btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ fontFamily: "Inter, sans-serif" }} data-testid="masjid-followers-page">

      {/* ── Mosque header banner (from context) ── */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="mb-6 px-1 flex items-center gap-3"
      >
        <div>
          <h2 className="text-xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="followers-mosque-name">
            {activeMosque.name}
          </h2>
          {/* ✅ address dari Mosque type — sesuaikan field name jika berbeda */}
          {"address" in activeMosque && (activeMosque as { address?: string }).address && (
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {(activeMosque as { address?: string }).address}
            </p>
          )}
        </div>
        {activeMosque.is_verified && (
          <span
            className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100"
            data-testid="followers-verified-badge"
          >
            <CheckCircle2 size={10} /> Verified
          </span>
        )}
      </motion.div>

      {/* ── Stats — only what the API actually returns ── */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible" custom={1}
        className="bg-white rounded-2xl border border-slate-200/50 p-6 shadow-sm mb-8 w-full sm:w-64"
        data-testid="followers-total-card"
      >
        <p className="text-slate-400 text-sm font-medium mb-1">Total Followers</p>
        <h3 className="text-3xl font-extrabold text-[#131b2e] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="followers-total-count">
          {totalCount.toLocaleString()}
        </h3>
      </motion.div>

      {/* ── Search ── */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible" custom={2}
        className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3"
      >
        <div className="flex-1 min-w-[240px] relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-medium text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 transition-all"
            aria-label="Search followers"
            data-testid="followers-search-input"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] rounded-xl font-bold text-sm transition-colors shadow-sm"
          data-testid="followers-export-btn"
        >
          <Download size={14} /> Export List
        </motion.button>
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible" custom={3}
        className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]" aria-label="Followers directory" data-testid="followers-table">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                {["Profile", "Join Date"].map((col) => (
                  <th
                    key={col}
                    className="px-7 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] text-left"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filtered.map((f, i) => (
                  <motion.tr
                    key={f.id}
                    variants={rowVariant}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={i}
                    layout
                    className="hover:bg-slate-50/70 transition-colors"
                    data-testid={`follower-row-${f.id}`}
                  >
                    <td className="px-7 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar initials={f.initials} avatarUrl={f.avatarUrl} size="md" />
                        <p className="font-bold text-[#131b2e] text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                          {f.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-7 py-5 text-sm text-slate-400 font-medium whitespace-nowrap">{f.joinDate}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={2} className="py-16 text-center text-slate-400 text-sm" data-testid="followers-empty-state">
                    No followers match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}