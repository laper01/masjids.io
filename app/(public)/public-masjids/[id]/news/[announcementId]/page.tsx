"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AnnouncementDetail, AnnouncementCategory } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days  < 7)  return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ─── Category Meta ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  AnnouncementCategory,
  { label: string; bg: string; text: string; icon: string }
> = {
  event:       { label: "EVENT",       bg: "bg-blue-50",    text: "text-blue-700",    icon: "event" },
  general:     { label: "GENERAL",     bg: "bg-slate-50",   text: "text-slate-500",   icon: "info" },
  urgent:      { label: "URGENT",      bg: "bg-red-50",     text: "text-red-600",     icon: "warning" },
  jumuah:      { label: "JUM'AH",      bg: "bg-emerald-50", text: "text-emerald-700", icon: "mosque" },
  fundraising: { label: "FUNDRAISING", bg: "bg-amber-50",   text: "text-amber-700",   icon: "volunteer_activism" },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Back button skeleton */}
      <div className="h-9 w-28 bg-slate-100 rounded-xl" />

      {/* Hero card */}
      <div
        className="bg-white rounded-2xl border border-slate-100/80 p-8 space-y-6"
        style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.06)" }}
      >
        {/* Badge + date row */}
        <div className="flex items-center gap-3">
          <div className="h-6 w-20 bg-slate-100 rounded-md" />
          <div className="h-4 w-32 bg-slate-100 rounded" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="h-8 w-3/4 bg-slate-100 rounded" />
          <div className="h-8 w-1/2 bg-slate-100 rounded" />
        </div>

        {/* Author row */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-11 h-11 rounded-full bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 bg-slate-100 rounded" />
            <div className="h-2.5 w-24 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* Image skeleton */}
      <div className="h-72 bg-slate-100 rounded-2xl" />

      {/* Body */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-4 bg-slate-100 rounded ${i === 4 ? "w-3/4" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Hook — fetch single announcement ────────────────────────────────────────

function useAnnouncementDetail(masjidId: string, announcementId: string) {
  const [data,    setData]    = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch(
        `/api/masjids/${masjidId}/announcements/${announcementId}`
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json.data as AnnouncementDetail);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load announcement.");
    } finally {
      setLoading(false);
    }
  }, [masjidId, announcementId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  return { data, loading, error, refetch: fetchDetail };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string; announcementId: string }>;
}

export default function NewsDetailPage({ params }: PageProps) {
  const { id: masjidId, announcementId } = use(params);
  const router = useRouter();

  const { data: announcement, loading, error, refetch } = useAnnouncementDetail(
    masjidId,
    announcementId
  );

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `${announcement?.title ?? ""}\n${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const meta = announcement
    ? (CATEGORY_META[announcement.category] ?? CATEGORY_META.general)
    : null;

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

      <div className="min-h-screen" style={{ fontFamily: "DM Sans, sans-serif" }}>
        <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

          {/* ── Back Button ─────────────────────────────────────────────── */}
          <button
            onClick={() => router.push(`/public-masjids/${masjidId}/news`)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#064e3b] transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
              arrow_back
            </span>
            Back to Newsroom
          </button>

          {/* ── Skeleton ────────────────────────────────────────────────── */}
          {loading && <DetailSkeleton />}

          {/* ── Error State ─────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              <span className="material-symbols-outlined shrink-0">error</span>
              <span className="flex-1">{error}</span>
              <button
                onClick={refetch}
                className="text-xs font-bold underline hover:no-underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Content ─────────────────────────────────────────────────── */}
          {!loading && !error && announcement && meta && (
            <>
              {/* Hero Card */}
              <div
                className="bg-white rounded-2xl border border-slate-100/80 p-8 space-y-6"
                style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.06)" }}
              >
                {/* Category badge + date */}
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-md tracking-wider ${meta.bg} ${meta.text}`}
                  >
                    <span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {meta.icon}
                    </span>
                    {meta.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(announcement.published_at)}
                  </span>
                  {/* Urgent pulse indicator */}
                  {announcement.category === "urgent" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      LIVE
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1
                  className="text-3xl font-extrabold text-slate-800 leading-snug"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {announcement.title}
                </h1>

                {/* Author row */}
                <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <span
                      className="material-symbols-outlined text-[#064e3b] text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      account_balance
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm font-bold text-slate-800 truncate"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        {announcement.masjid.name}
                      </span>
                      <span
                        className="material-symbols-outlined text-[#064e3b] text-base shrink-0"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Official Administration · {timeAgo(announcement.published_at)}
                    </p>
                  </div>

                  {/* Share actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopy}
                      title="Copy link"
                      className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-[#064e3b] text-slate-400 flex items-center justify-center transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {copied ? "check" : "content_copy"}
                      </span>
                    </button>
                    <button
                      onClick={handleWhatsApp}
                      title="Share on WhatsApp"
                      className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-[#064e3b] text-slate-400 flex items-center justify-center transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Media Image */}
              {announcement.media_url && (
                <div className="rounded-2xl overflow-hidden w-full bg-slate-100 shadow-sm"
                  style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.06)" }}
                >
                  <img
                    src={announcement.media_url}
                    alt={announcement.title}
                    className="w-full object-cover max-h-[480px]"
                  />
                </div>
              )}

              {/* Body */}
              <div
                className="bg-white rounded-2xl border border-slate-100/80 p-8"
                style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.06)" }}
              >
                <p className="text-slate-600 leading-relaxed text-base whitespace-pre-line">
                  {announcement.body}
                </p>
              </div>

              {/* Footer Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pb-4">
                <div className="text-xs text-slate-400 space-y-0.5">
                  <p>
                    Published{" "}
                    <span className="font-semibold text-slate-500">
                      {formatDate(announcement.published_at)}
                    </span>
                  </p>
                  {announcement.updated_at !== announcement.published_at && (
                    <p>
                      Last updated{" "}
                      <span className="font-semibold text-slate-500">
                        {timeAgo(announcement.updated_at)}
                      </span>
                    </p>
                  )}
                </div>

                {/* Share row */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-[#064e3b] hover:text-[#064e3b] transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copied ? "check" : "content_copy"}
                    </span>
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#064e3b] text-white text-xs font-bold hover:bg-[#003527] transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    Share
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}