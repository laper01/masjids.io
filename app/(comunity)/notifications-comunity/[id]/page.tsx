"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  FileType2,
  Share2,
  Copy,
  Printer,
  Users,
  TrendingUp,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { NotificationItem } from "@/types/api";

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.42, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function StatBar({
  label,
  value,
  pct,
  delay = 0,
}: {
  label: string;
  value: string;
  pct: number;
  delay?: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-500">{label}</span>
        <span className="font-bold text-[#131b2e]">{value}</span>
      </div>
      <div className="h-2 w-full bg-[#dae2fd] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#003527] to-[#064e3b] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
        />
      </div>
    </div>
  );
}

// ─── Itinerary Item ───────────────────────────────────────────────────────────
function ItineraryItem({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex gap-4 items-start">
      <div className="mt-2 w-2 h-2 rounded-full bg-[#003527] shrink-0" />
      <div className="text-[#131b2e] text-base leading-relaxed">
        <strong>{title}</strong> {desc}
      </div>
    </li>
  );
}

// ─── Share Button ─────────────────────────────────────────────────────────────
function ShareBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <motion.button
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      onClick={handle}
      aria-label={label}
      className="flex-1 h-12 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-slate-500 hover:bg-[#064e3b] hover:text-white transition-all"
    >
      {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : icon}
    </motion.button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-100", className)} />;
}

function ArticleSkeleton() {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <Skeleton className="h-[340px] sm:h-[400px] w-full rounded-none" />
      <div className="p-7 sm:p-10 space-y-5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-9 w-1/2" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

// ─── Normalise API notification → UI shape ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(n: NotificationItem) {
  return {
    id: n.id,
    title: n.title,
    category: n.type,
    topic: "",
    date: n.created_at?.slice(0, 10) ?? "",
    time: "",
    location: "",
    body: n.body,
    heroImage: "",
    authorName: n.masjid?.name ?? "Masjid Committee",
    authorRole: "Official Broadcast",
    authorAvatar: "",
    authorInitials: (n.masjid?.name ?? "?")
      .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join(""),
    isRead: n.read,
    impressions: 0,
    rsvpCount: 0,
    rsvpLimit: 0,
    engagementPct: 0,
    attachments: [] as never[],
    itinerary: [] as never[],
  };
}

// ─── Attachment icon helper ───────────────────────────────────────────────────
function attachmentIcon(type: string) {
  if (type === "pdf")
    return { icon: <FileType2 size={16} className="text-red-500" />, bg: "bg-red-50" };
  return { icon: <FileText size={16} className="text-[#35455a]" />, bg: "bg-[#d3e4fe]/30" };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BroadcastDetailPage() {
  // Route: /engagement/[id]
  const params = useParams();
  const notificationId = (params?.id ?? "") as string;

  const {
    notifications,
    loading,
    error,
    isNotificationPending,
    getNotifications,
    markAsRead,
    clearError,
  } = useNotifications();

  const [rsvped, setRsvped] = useState(false);

  // ── On mount: fetch this notification then auto-mark as read ────────────────
  useEffect(() => {
    if (!notificationId) return;

    async function load() {
      const result = await getNotifications({ id: notificationId } as never);
      const item = result?.data?.[0];  // data adalah array langsung
      if (item && !item.read) {
        await markAsRead(notificationId);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationId]);

  // ── Derive the notification object from hook state ──────────────────────────
  const raw = notifications?.data?.[0] ?? null;
  const data = raw ? normalise(raw) : null;

  const isPending = isNotificationPending(notificationId);

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <AlertTriangle size={36} className="text-red-400" />
        <p className="text-slate-600 font-medium">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              clearError();
              getNotifications({ id: notificationId } as never);
            }}
            className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-white text-sm font-semibold"
          >
            Retry
          </button>
          <Link
            href="/engagement"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="mb-6"><Skeleton className="h-4 w-28" /></div>
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <ArticleSkeleton />
          <aside className="w-full lg:w-72 shrink-0 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
          </aside>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── Back nav ── */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="mb-6 flex items-center justify-between"
      >
        <Link
          href="/engagement"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#064e3b] transition-colors font-medium text-sm"
        >
          <ArrowLeft size={16} /> Back to Feed
        </Link>

        {/* Subtle "marking as read" indicator */}
        {isPending && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 size={12} className="animate-spin" /> Marking as read…
          </span>
        )}
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-10 items-start">

        {/* ── Main Article ── */}
        <motion.article
          variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          {/* Hero Image */}
          <div className="relative h-[340px] sm:h-[400px] w-full overflow-hidden bg-slate-100">
            {data?.heroImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.heroImage}
                alt={data.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#003527]/40 to-transparent" />
            <div className="absolute bottom-6 left-8">
              <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/30 shadow-sm">
                <CheckCircle2 size={14} className="text-[#95d3ba]" />
                <span className="text-[#131b2e] font-bold text-xs tracking-wider uppercase">
                  Official Broadcast
                </span>
              </div>
            </div>
          </div>

          {/* Article Body */}
          <div className="p-7 sm:p-10">

            {/* Category + topic */}
            <div className="flex items-center gap-2 text-[#064e3b] font-bold text-xs tracking-widest uppercase mb-4">
              <span>{data?.category ?? "Community Event"}</span>
              {data?.topic && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#064e3b]/30" />
                  <span>{data.topic}</span>
                </>
              )}
            </div>

            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl font-extrabold text-[#131b2e] tracking-tight leading-tight mb-6"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {data?.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-5 text-slate-500 text-sm font-medium mb-10">
              {([
                data?.date && { icon: <Calendar size={15} />, text: data.date },
                data?.time && { icon: <Clock size={15} />, text: data.time },
                data?.location && { icon: <MapPin size={15} />, text: data.location },
              ] as ({ icon: React.ReactNode; text: string } | false)[])
                .filter(Boolean)
                .map((m) => {
                  const meta = m as { icon: React.ReactNode; text: string };
                  return (
                    <div key={meta.text} className="flex items-center gap-2">
                      <span className="text-[#064e3b]">{meta.icon}</span>
                      {meta.text}
                    </div>
                  );
                })}
            </div>

            {/* Body — split on double newlines; first paragraph becomes pull quote */}
            {data?.body && (
              <div className="mb-10 space-y-5">
                {data.body.split("\n\n").map((para, i) =>
                  i === 0 ? (
                    <blockquote
                      key={i}
                      className="border-l-4 border-[#064e3b] pl-6 py-2 italic text-lg text-slate-500 font-medium leading-relaxed"
                    >
                      {para}
                    </blockquote>
                  ) : (
                    <p key={i} className="text-[#131b2e] text-base leading-relaxed">
                      {para}
                    </p>
                  )
                )}
              </div>
            )}

            {/* Itinerary — only rendered when the API returns items */}
            {(data?.itinerary?.length ?? 0) > 0 && (
              <>
                <h2
                  className="text-2xl font-bold text-[#131b2e] mb-5"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  Evening Itinerary
                </h2>
                <ul className="space-y-4 list-none p-0 mb-10">
                  {data!.itinerary.map(
                    (item: { title: string; desc: string }, i: number) => (
                      <ItineraryItem key={i} title={item.title} desc={item.desc} />
                    )
                  )}
                </ul>
              </>
            )}

            {/* Footer CTA */}
            <footer className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                  {data?.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.authorAvatar}
                      alt={data.authorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-black text-[#064e3b]">
                      {data?.authorInitials}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                    {data?.authorName}
                  </p>
                  <p className="text-sm text-slate-400">{data?.authorRole}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="flex-1 sm:flex-none px-7 py-3 rounded-xl border-2 border-[#064e3b] text-[#064e3b] font-bold hover:bg-[#064e3b]/5 transition-all text-sm"
                >
                  Add to Calendar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setRsvped((v) => !v)}
                  className={cn(
                    "flex-1 sm:flex-none px-7 py-3 rounded-xl font-bold text-sm shadow-sm transition-all",
                    rsvped
                      ? "bg-emerald-100 text-[#064e3b] border-2 border-emerald-300"
                      : "bg-gradient-to-br from-[#003527] to-[#064e3b] text-white"
                  )}
                >
                  {rsvped ? "✓ RSVP'd" : "RSVP Now"}
                </motion.button>
              </div>
            </footer>
          </div>
        </motion.article>

        {/* ── Sidebar ── */}
        <aside className="w-full lg:w-72 shrink-0 space-y-6">

          {/* Broadcast Reach */}
          <motion.section
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="bg-[#f2f3ff] rounded-2xl p-6"
          >
            <h4
              className="font-bold text-[#131b2e] text-xs tracking-widest uppercase mb-6 flex items-center gap-2"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              <TrendingUp size={13} className="text-[#064e3b]" />
              Broadcast Reach
            </h4>

            {data ? (
              <>
                <div className="space-y-5">
                  <StatBar
                    label="Total Impressions"
                    value={data.impressions >= 1000
                      ? `${(data.impressions / 1000).toFixed(1)}k`
                      : String(data.impressions)}
                    pct={Math.min(100, (data.impressions / 3000) * 100)}
                    delay={0.3}
                  />
                  <StatBar
                    label="Confirmed RSVPs"
                    value={data.rsvpLimit
                      ? `${data.rsvpCount} / ${data.rsvpLimit}`
                      : String(data.rsvpCount)}
                    pct={data.rsvpLimit
                      ? Math.min(100, (data.rsvpCount / data.rsvpLimit) * 100)
                      : 0}
                    delay={0.45}
                  />
                  <StatBar
                    label="Engagement Rate"
                    value={`${data.engagementPct}%`}
                    pct={data.engagementPct}
                    delay={0.6}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  {[
                    {
                      icon: <Users size={13} />,
                      label: "Reached",
                      value: data.impressions >= 1000
                        ? `${(data.impressions / 1000).toFixed(1)}k`
                        : String(data.impressions),
                    },
                    {
                      icon: <CheckCircle2 size={13} />,
                      label: "Attending",
                      value: String(data.rsvpCount),
                    },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
                      <div className="flex justify-center text-[#064e3b] mb-1">{s.icon}</div>
                      <p
                        className="text-base font-extrabold text-[#131b2e]"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        {s.value}
                      </p>
                      <p className="text-[10px] text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}
          </motion.section>

          {/* Attachments — only shown when API returns them */}
          {(data?.attachments?.length ?? 0) > 0 && (
            <motion.section
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
            >
              <h4
                className="font-bold text-[#131b2e] text-xs tracking-widest uppercase mb-4"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Attachments
              </h4>
              <div className="space-y-2">
                {data!.attachments.map(
                  (f: { name: string; size: string; type: string; url?: string }) => {
                    const { icon, bg } = attachmentIcon(f.type);
                    return (
                      <motion.a
                        key={f.name}
                        href={f.url ?? "#"}
                        target={f.url ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        whileHover={{ x: 2 }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#131b2e] truncate group-hover:text-[#064e3b] transition-colors">
                            {f.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{f.size}</p>
                        </div>
                      </motion.a>
                    );
                  }
                )}
              </div>
            </motion.section>
          )}

          {/* Share */}
          <motion.section
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="space-y-3"
          >
            <p className="text-xs font-medium text-slate-400 px-1">Share this broadcast</p>
            <div className="flex gap-2">
              <ShareBtn icon={<Share2 size={18} />} label="Share" />
              <ShareBtn icon={<Copy size={18} />} label="Copy link" />
              <ShareBtn icon={<Printer size={18} />} label="Print" />
            </div>
          </motion.section>
        </aside>
      </div>
    </div>
  );
}