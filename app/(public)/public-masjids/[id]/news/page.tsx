"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useAnnouncements } from "@/hooks/announcements/useAnnouncements";
import type { AnnouncementListItem, AnnouncementCategory } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60)  return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24)  return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days  < 7)   return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/** Map AnnouncementCategory → display badge label & colour */
type CategoryMeta = { label: string; bg: string; text: string };

// FIX: Record<...> generic written on a single line — the previous
// multi-line form (`Record<\n  AnnouncementCategory,\n  { ... }\n>`)
// tripped the compiler into parsing the type args as value
// expressions, cascading into "used as a value" / "Cannot find name
// 'bg'" errors on every following line.
const CATEGORY_META: Record<AnnouncementCategory, CategoryMeta> = {
  event:       { label: "EVENT",       bg: "bg-blue-50",    text: "text-blue-700" },
  general:     { label: "GENERAL",     bg: "bg-slate-50",   text: "text-slate-500" },
  urgent:      { label: "URGENT",      bg: "bg-red-50",     text: "text-red-600" },
  jumuah:      { label: "JUM'AH",      bg: "bg-emerald-50", text: "text-emerald-700" },
  fundraising: { label: "FUNDRAISING", bg: "bg-amber-50",   text: "text-amber-700" },
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterValue = "all" | AnnouncementCategory;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "ALL POSTS",   value: "all" },
  { label: "GENERAL",     value: "general" },
  { label: "EVENTS",      value: "event" },
  { label: "JUM'AH",      value: "jumuah" },
  { label: "FUNDRAISING", value: "fundraising" },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="relative pl-8 animate-pulse" data-testid="post-skeleton">
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-200" />
      <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-slate-200" />
      <div
        className="bg-white rounded-2xl border border-slate-100/80 p-8 space-y-5"
        style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 bg-slate-100 rounded" />
            <div className="h-2.5 w-24 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-slate-100 rounded" />
          <div className="h-3.5 w-full bg-slate-100 rounded" />
          <div className="h-3.5 w-5/6 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  item,
  masjidId,
}: {
  item: AnnouncementListItem;
  masjidId: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.general;

  const handleCardClick = () => {
    router.push(`/public-masjids/${masjidId}/news/${item.id}`);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card navigation
    navigator.clipboard.writeText(
      `${window.location.origin}/public-masjids/${masjidId}/news/${item.id}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card navigation
    const url = `${window.location.origin}/public-masjids/${masjidId}/news/${item.id}`;
    const text = encodeURIComponent(`${item.title}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <article className="relative pl-8" data-testid={`post-card-${item.id}`}>
      {/* Timeline line */}
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-200" />
      {/* Timeline dot — urgent = red pulse, else green */}
      <div
        data-testid="post-card-timeline-dot"
        className={`absolute left-0 top-2 w-6 h-6 rounded-full bg-white border-4 z-10 ${
          item.category === "urgent" ? "border-red-500" : "border-[#064e3b]"
        }`}
      />

      <div
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
        data-testid="post-card-body"
        className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-8 space-y-6 cursor-pointer hover:border-[#064e3b]/30 hover:shadow-md transition-all"
        style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.06)" }}
      >
        {/* Author row */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[#064e3b] text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_balance
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-slate-800"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  Masjid Administration
                </span>
                <span
                  className="material-symbols-outlined text-[#064e3b] text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </div>
              <p className="text-xs text-slate-400" data-testid="post-card-timestamp">
                Official · {timeAgo(item.published_at)}
              </p>
            </div>
          </div>

          {/* Category badge */}
          <span
            data-testid="post-card-category-badge"
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md tracking-wider shrink-0 ${meta.bg} ${meta.text}`}
          >
            {meta.label}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h2
            data-testid="post-card-title"
            className="text-2xl font-bold text-slate-800 leading-snug group-hover:text-[#064e3b] transition-colors"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {item.title}
          </h2>

          <p className="text-slate-500 leading-relaxed line-clamp-3" data-testid="post-card-excerpt">{item.body}</p>

          {/* Media image (if API returns one) */}
          {item.media_url && (
            <div className="rounded-xl overflow-hidden h-72 w-full bg-slate-100" data-testid="post-card-media">
              <img
                src={item.media_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-5">
            <button
              onClick={handleCopy}
              data-testid="post-card-copy-link"
              className="flex items-center gap-2 text-slate-400 hover:text-[#064e3b] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {copied ? "check" : "content_copy"}
              </span>
              <span className="text-xs font-semibold">
                {copied ? "Copied!" : "Copy Link"}
              </span>
            </button>
            <button
              onClick={handleWhatsApp}
              data-testid="post-card-share-whatsapp"
              className="flex items-center gap-2 text-slate-400 hover:text-[#064e3b] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
              <span className="text-xs font-semibold">Share to WhatsApp</span>
            </button>
          </div>
          {/* ✅ BUTTON VIEW DETAIL — navigates to /news/[announcementId] */}
          <button
            onClick={handleCardClick}
            data-testid="post-card-read-more"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#064e3b] text-white text-xs font-bold hover:bg-[#003527] transition-colors shrink-0"
          >
            Read more
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NewsroomPage({ params }: PageProps) {
  const { id } = use(params);
  const masjidId = id;
  const router = useRouter();

  const {
    announcements,
    loading,
    error,
    getAnnouncements,
    clearError,
  } = useAnnouncements();

  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  // Initial load + re-fetch when filter changes
  useEffect(() => {
    getAnnouncements(masjidId, {
      page: 1,
      limit: 10,
      category: activeFilter === "all" ? undefined : activeFilter,
    });
  }, [masjidId, activeFilter, getAnnouncements]);

  const allItems = announcements?.data ?? [];
  const meta     = announcements?.metadata;

  const urgentPost = allItems.find((a) => a.category === "urgent") ?? null;

  const handleLoadMore = useCallback(() => {
    if (!meta) return;
    getAnnouncements(masjidId, {
      page: meta.page + 1,
      limit: meta.limit,
      category: activeFilter === "all" ? undefined : activeFilter,
    });
  }, [masjidId, activeFilter, meta, getAnnouncements]);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }
        body {
          background-color: #faf8ff;
          background-image:
            radial-gradient(at 0% 0%, hsla(165,78%,15%,0.05) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(220,100%,95%,1) 0px, transparent 50%);
        }
      `}</style>

      <div className="min-h-screen" data-testid="newsroom-page" style={{ fontFamily: "DM Sans, sans-serif" }}>
        <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">

          {/* ── Urgent Banner ────────────────────────────────────────────── */}
          {urgentPost && (
            <section>
              <div
                data-testid="urgent-banner"
                className="relative overflow-hidden rounded-2xl p-6 flex items-center justify-between gap-4 shadow-md"
                style={{ background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)" }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                <div className="flex items-center gap-5 relative z-10 min-w-0">
                  <div className="bg-white/10 p-3 rounded-full shrink-0">
                    <span
                      className="material-symbols-outlined text-emerald-300 animate-pulse"
                      style={{ fontVariationSettings: "'FILL' 1", fontSize: "1.5rem" }}
                    >
                      campaign
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80">
                      Urgent Announcement
                    </span>
                    <h2
                      data-testid="urgent-banner-title"
                      className="text-xl font-bold text-white leading-tight truncate"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      {urgentPost.title}
                    </h2>
                  </div>
                </div>
                <button
                  data-testid="urgent-banner-view-details"
                  onClick={() =>
                    router.push(`/public-masjids/${masjidId}/news/${urgentPost.id}`)
                  }
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all relative z-10 whitespace-nowrap shrink-0"
                >
                  View Details
                </button>
              </div>
            </section>
          )}

          {/* ── Timeline Header + Filters ──────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 pb-5">
            <h3
              data-testid="newsroom-heading"
              className="text-2xl font-extrabold text-[#003527] tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Recent Updates
              {meta && (
                <span className="ml-2 text-sm font-semibold text-slate-400" data-testid="newsroom-total-count">
                  ({meta.total_data})
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2" data-testid="category-filters">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  data-testid={`filter-${f.value}`}
                  aria-pressed={activeFilter === f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`px-4 py-1.5 text-[10px] font-bold rounded-full transition-all ${
                    activeFilter === f.value
                      ? "bg-[#064e3b] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Error state ────────────────────────────────────────────── */}
          {error && (
            <div data-testid="newsroom-error-state" className="flex items-center gap-3 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              <span className="material-symbols-outlined shrink-0">error</span>
              <span className="flex-1">{error}</span>
              <button
                data-testid="newsroom-error-retry"
                onClick={() => { clearError(); getAnnouncements(masjidId, {}); }}
                className="text-xs font-bold underline hover:no-underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Skeleton loading ───────────────────────────────────────── */}
          {loading && allItems.length === 0 && (
            <div className="space-y-12" data-testid="newsroom-loading">
              {[0, 1, 2].map((i) => <PostSkeleton key={i} />)}
            </div>
          )}

          {/* ── Empty state ────────────────────────────────────────────── */}
          {!loading && !error && allItems.length === 0 && (
            <div data-testid="newsroom-empty-state" className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  newspaper
                </span>
              </div>
              <h3
                className="text-lg font-bold text-slate-600"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                No announcements yet
              </h3>
              <p className="text-slate-400 text-sm max-w-xs">
                {activeFilter === "all"
                  ? "This masjid hasn't posted any announcements yet. Check back soon."
                  : `No ${activeFilter} announcements found. Try a different filter.`}
              </p>
              {activeFilter !== "all" && (
                <button
                  data-testid="empty-state-view-all"
                  onClick={() => setActiveFilter("all")}
                  className="mt-1 px-5 py-2 rounded-xl bg-[#003527] text-white text-xs font-bold hover:bg-[#064e3b] transition-colors"
                >
                  View all posts
                </button>
              )}
            </div>
          )}

          {/* ── Posts Feed ─────────────────────────────────────────────── */}
          {allItems.length > 0 && (
            <div className="space-y-12" data-testid="posts-feed">
              {allItems.map((item) => (
                <PostCard key={item.id} item={item} masjidId={masjidId} />
              ))}
            </div>
          )}

          {/* ── Load More / End ────────────────────────────────────────── */}
          {!loading && allItems.length > 0 && (
            <div className="py-10 flex flex-col items-center gap-4">
              {meta && meta.page < meta.total_page ? (
                <button
                  data-testid="load-more-button"
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 px-7 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-[#064e3b] hover:text-[#064e3b] transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">expand_more</span>
                  Load more
                </button>
              ) : (
                <>
                  <div className="w-12 h-1 bg-slate-200 rounded-full" />
                  <p className="text-sm text-slate-400 font-medium" data-testid="feed-end-message">
                    You've reached the end of the official timeline
                  </p>
                </>
              )}
            </div>
          )}

          {/* Inline loading spinner for subsequent pages */}
          {loading && allItems.length > 0 && (
            <div className="flex justify-center py-8" data-testid="load-more-spinner">
              <div className="w-8 h-8 rounded-full border-4 border-emerald-100 border-t-[#064e3b] animate-spin" />
            </div>
          )}

        </main>
      </div>
    </>
  );
}