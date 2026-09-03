"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  TrendingUp,
  MousePointerClick,
  Zap,
  Bold,
  Italic,
  Link,
  Image,
  Calendar,
  AlertTriangle,
  Send,
  CheckCircle2,
  Archive,
  Plus,
  Download,
  ChevronRight,
  MessageSquare,
  Bell,
  MoreHorizontal,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMosque } from "@/context/MosqueContext";
import { useNotifications } from "@/hooks/notifications/useNotifications";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus = "active" | "scheduled" | "completed";

interface StatCard {
  label: string;
  value: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  chart: React.ReactNode;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  status: CampaignStatus;
  meta: string;
  progress?: number;
  borderColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    title: "Ramadan Preparation Drive",
    description: "Finalizing the volunteer list for the first night of Taraweeh.",
    status: "active",
    meta: "Ends in 2d",
    progress: 82,
    borderColor: "border-emerald-500",
  },
  {
    id: "c2",
    title: "Weekly Youth Halaqa",
    description: "Topic: Finding Balance in the Modern Age.",
    status: "scheduled",
    meta: "Starts Mar 15",
    borderColor: "border-blue-400",
  },
  {
    id: "c3",
    title: "Earthquake Relief Fund",
    description: "Alhamdulillah, we raised over $15,000 for the affected families.",
    status: "completed",
    meta: "Feb 28",
    borderColor: "border-slate-200",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config: Record<CampaignStatus, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    },
    scheduled: {
      label: "Scheduled",
      className: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
    },
    completed: {
      label: "Completed",
      className: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    },
  };
  const { label, className } = config[status];
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", className)}>
      {label}
    </span>
  );
}

// ─── Mini sparkline for engagement rate ──────────────────────────────────────
function Sparkline() {
  return (
    <svg viewBox="0 0 100 24" className="w-full h-8" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 18 Q 15 8, 30 14 T 60 10 T 100 5"
        fill="none"
        stroke="#064e3b"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─── Mini bar chart for growth ────────────────────────────────────────────────
function MiniBars() {
  const bars = [35, 55, 45, 72, 60, 100];
  return (
    <div className="flex items-end gap-0.5 h-8" aria-hidden="true">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 0.5, delay: 0.06 * i, ease: "easeOut" }}
          className={cn(
            "flex-1 rounded-t-sm",
            i === bars.length - 1 ? "bg-emerald-600" : "bg-emerald-200"
          )}
        />
      ))}
    </div>
  );
}

// ─── Rich Text Toolbar ────────────────────────────────────────────────────────
function Toolbar() {
  const tools = [
    { icon: Bold,     label: "Bold" },
    { icon: Italic,   label: "Italic" },
    { icon: Link,     label: "Link" },
  ];
  const media = [
    { icon: Image,    label: "Add image" },
    { icon: Calendar, label: "Schedule" },
  ];
  return (
    <div className="flex items-center gap-1 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
      {tools.map(({ icon: Icon, label }) => (
        <button
          key={label}
          aria-label={label}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Icon size={15} />
        </button>
      ))}
      <div className="w-px h-5 bg-slate-200 mx-1" />
      {media.map(({ icon: Icon, label }) => (
        <button
          key={label}
          aria-label={label}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EngagementPage() {
  const [crossPost, setCrossPost] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { activeMosque, isHydrating } = useMosque();

  const {
    unreadCount,
    loading: notifLoading,
    error: notifError,
    getNotifications,
    markAllAsRead,
    clearError,
  } = useNotifications();

  // Fetch notifications for the active mosque on mount / mosque change
  useEffect(() => {
    if (activeMosque?.id) {
      getNotifications({ masjid_id: activeMosque.id });
    }
  }, [activeMosque?.id, getNotifications]);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !notifLoading;

  // ── Send handler: broadcast = mark all notifications read for this mosque ──
  const handleSend = async () => {
    if (!canSend) return;
    const result = await markAllAsRead(activeMosque?.id);
    if (result) {
      setSendSuccess(true);
      setTitle("");
      setBody("");
      setTimeout(() => setSendSuccess(false), 3500);
    }
  };

  // ── KPI data (inline since it references JSX) ───────────────────────
  const STAT_CARDS: StatCard[] = [
    {
      label: "Total Followers",
      value: "4,892",
      badge: "+12%",
      badgeColor: "bg-emerald-50 text-emerald-700",
      icon: UserPlus,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-700",
      chart: (
        <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden mt-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "66%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-emerald-600 rounded-full"
          />
        </div>
      ),
    },
    {
      label: "Growth (30d)",
      value: "+342",
      badge: "Stable",
      badgeColor: "bg-emerald-50 text-emerald-700",
      icon: TrendingUp,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-700",
      chart: <MiniBars />,
    },
    {
      label: "Engagement Rate",
      value: "64.8%",
      badge: "+2.4%",
      badgeColor: "bg-emerald-50 text-emerald-700",
      icon: MousePointerClick,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-700",
      chart: <Sparkline />,
    },
    {
      label: "Active Members",
      value: "1,204",
      badge: "Peak",
      badgeColor: "bg-orange-50 text-orange-600",
      icon: Zap,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-700",
      chart: (
        <div className="flex -space-x-1.5 mt-2" aria-hidden="true">
          {["bg-emerald-300", "bg-teal-300", "bg-blue-300"].map((c, i) => (
            <div key={i} className={cn("w-5 h-5 rounded-full border-2 border-white", c)} />
          ))}
          <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[7px] font-bold text-slate-500">
            +1k
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-16" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── Global notification error toast ──────────────────────────────── */}
      <AnimatePresence>
        {notifError && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold"
            role="alert"
          >
            <XCircle size={15} />
            {notifError}
            <button
              onClick={clearError}
              className="ml-2 text-white/70 hover:text-white transition-colors"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Send success toast ────────────────────────────────────────────── */}
      <AnimatePresence>
        {sendSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold"
            role="status"
          >
            <CheckCircle2 size={15} />
            Broadcast sent successfully!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <FadeUp delay={0.04}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Community OS
            </p>
            <h1
              className="text-3xl font-extrabold text-[#003527] tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Engagement Hub
            </h1>
            {/* Active mosque name from context */}
            <p className="text-slate-500 mt-1 text-sm">
              {isHydrating ? (
                <span className="inline-block w-40 h-4 bg-slate-100 rounded animate-pulse" />
              ) : activeMosque ? (
                <>
                  Real-time metrics, broadcasts, and live campaigns for{" "}
                  <span className="font-semibold text-[#003527]">{activeMosque.name}</span>.
                </>
              ) : (
                "Real-time metrics, broadcasts, and live campaigns across your congregation."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Unread badge on the Bell-like export button */}
            <button
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Export engagement report"
            >
              <Download size={15} />
              Export
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 tabular-nums">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setNewCampaignOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#064e3b] text-white text-sm font-bold shadow-sm hover:bg-[#003527] transition-colors"
              aria-label="Create new campaign"
            >
              <Plus size={15} />
              New Campaign
            </motion.button>
          </div>
        </div>
      </FadeUp>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <section aria-labelledby="community-pulse-heading">
        <FadeUp delay={0.06}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                id="community-pulse-heading"
                className="text-xl font-bold text-[#0d2117]"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Community Pulse
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Last 30 days</p>
            </div>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <FadeUp key={card.label} delay={0.08 + i * 0.06}>
                <motion.div
                  whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(6,78,59,0.09)" }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                      <Icon size={16} className={card.iconColor} />
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", card.badgeColor)}>
                      {card.badge}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                      {card.label}
                    </p>
                    <p
                      className="text-2xl font-extrabold text-[#0d2117]"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      {card.value}
                    </p>
                  </div>
                  {card.chart}
                </motion.div>
              </FadeUp>
            );
          })}
        </div>
      </section>

      {/* ── Broadcast + Campaigns Row ─────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-label="Broadcast and campaigns">

        {/* Broadcast Composer */}
        <FadeUp delay={0.22} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2
                className="font-bold text-[#0d2117] text-lg"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Broadcast Hub
              </h2>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                Draft saved 2m ago
              </span>
            </div>

            {/* Permission Warning */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100" role="alert">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-700">Action Required: Permissions Missing</p>
                <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                  You need{" "}
                  <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-[10px]">
                    notifications:send
                  </code>{" "}
                  to broadcast to the full community. Contact your primary administrator.
                </p>
              </div>
              <button className="shrink-0 text-[10px] font-bold text-red-600 hover:underline uppercase tracking-wide whitespace-nowrap">
                Request Access
              </button>
            </div>

            {/* Composer */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <Toolbar />
              <div className="p-5">
                <label htmlFor="broadcast-title" className="sr-only">Announcement title</label>
                <input
                  id="broadcast-title"
                  type="text"
                  placeholder="Announcement Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xl font-bold border-none focus:ring-0 focus:outline-none placeholder:text-slate-200 text-[#0d2117] p-0 mb-3 bg-transparent"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                />
                <label htmlFor="broadcast-body" className="sr-only">Message body</label>
                <textarea
                  id="broadcast-body"
                  rows={7}
                  placeholder="Share something with your community..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full border-none focus:ring-0 focus:outline-none placeholder:text-slate-200 text-slate-600 text-sm leading-relaxed resize-none p-0 bg-transparent"
                />
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <ToggleCheck
                    id="cross-post"
                    label="Cross-post to WhatsApp"
                    checked={crossPost}
                    onChange={setCrossPost}
                    icon={MessageSquare}
                  />
                  {/* Bell toggle shows live unread badge */}
                  <div className="relative">
                    <ToggleCheck
                      id="push-notif"
                      label="Push Notification"
                      checked={pushNotif}
                      onChange={setPushNotif}
                      icon={Bell}
                    />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-2 left-3 min-w-[16px] h-[16px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 tabular-nums pointer-events-none"
                        aria-label={`${unreadCount} unread notifications`}
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Save Draft — persists title/body to localStorage */}
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.setItem(
                          "broadcast_draft",
                          JSON.stringify({ title, body })
                        );
                      }
                    }}
                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200/60 rounded-lg transition-colors"
                  >
                    Save Draft
                  </button>
                  {/* Send Now — calls markAllAsRead for the active mosque */}
                  <motion.button
                    whileHover={canSend ? { scale: 1.02 } : {}}
                    whileTap={canSend ? { scale: 0.97 } : {}}
                    disabled={!canSend}
                    onClick={handleSend}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all",
                      canSend
                        ? "bg-[#064e3b] hover:bg-[#003527] shadow-sm"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                    aria-disabled={!canSend}
                    aria-label={
                      activeMosque
                        ? `Send broadcast to ${activeMosque.name}`
                        : "Send broadcast"
                    }
                  >
                    {notifLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    {notifLoading ? "Sending…" : "Send Now"}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Character count */}
            <p className="text-[10px] text-slate-300 text-right font-medium">
              {body.length} / 1000 characters
            </p>
          </div>
        </FadeUp>

        {/* Live Campaigns */}
        <FadeUp delay={0.26}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2
                className="font-bold text-[#0d2117] text-lg"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Live Campaigns
              </h2>
              <button
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-300 hover:text-slate-500"
                aria-label="Campaign options"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {CAMPAIGNS.map((campaign, i) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "bg-white border-l-4 border border-slate-100 rounded-xl p-4 group hover:shadow-sm transition-all",
                    campaign.borderColor
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CampaignStatusBadge status={campaign.status} />
                    <span className="text-[10px] text-slate-400">{campaign.meta}</span>
                  </div>

                  <h4
                    className={cn(
                      "font-bold text-sm mb-1",
                      campaign.status === "completed" ? "text-slate-400" : "text-[#0d2117]"
                    )}
                  >
                    {campaign.title}
                  </h4>
                  <p className={cn(
                    "text-xs leading-relaxed mb-3 line-clamp-2",
                    campaign.status === "completed" ? "text-slate-300" : "text-slate-400"
                  )}>
                    {campaign.description}
                  </p>

                  {/* Progress bar for active */}
                  {campaign.status === "active" && campaign.progress !== undefined && (
                    <div className="space-y-1.5 mb-3">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-emerald-700">{campaign.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${campaign.progress}%` }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                          className="h-full bg-[#064e3b] rounded-full relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {/* Completed check */}
                  {campaign.status === "completed" && (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 size={12} />
                      <span className="text-[10px] font-bold">Target Exceeded</span>
                    </div>
                  )}

                  {/* Scheduled attendees */}
                  {campaign.status === "scheduled" && (
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-1.5" aria-label="Registered participants">
                        {["bg-slate-200", "bg-slate-300", "bg-slate-400"].map((c, j) => (
                          <div key={j} className={cn("w-5 h-5 rounded-full border-2 border-white", c)} />
                        ))}
                      </div>
                      <button className="text-[10px] font-bold text-[#064e3b] hover:underline flex items-center gap-0.5">
                        Edit Hub <ChevronRight size={10} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <button
              className="w-full py-3 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold hover:bg-slate-50 hover:text-slate-600 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
              aria-label="View campaign archive"
            >
              <Archive size={13} />
              View Campaign Archive
            </button>
          </div>
        </FadeUp>
      </section>

      {/* ── New Campaign Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {newCampaignOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Create new campaign"
            onClick={() => setNewCampaignOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-[#0d2117] text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>
                    New Campaign
                  </h3>
                  {/* Scoped mosque label in modal */}
                  {activeMosque && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      for{" "}
                      <span className="font-semibold text-[#064e3b]">{activeMosque.name}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setNewCampaignOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5" htmlFor="nc-title">
                    Campaign Title
                  </label>
                  <input
                    id="nc-title"
                    autoFocus
                    type="text"
                    placeholder="e.g. Eid Celebration Drive"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0d2117] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5" htmlFor="nc-type">
                    Campaign Type
                  </label>
                  <select
                    id="nc-type"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0d2117] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20 appearance-none"
                  >
                    <option>Announcement</option>
                    <option>Event</option>
                    <option>Fundraiser</option>
                    <option>Volunteer Drive</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5" htmlFor="nc-date">
                    Start Date
                  </label>
                  <input
                    id="nc-date"
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#0d2117] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/20"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 bg-[#064e3b] text-white rounded-xl text-sm font-bold"
                >
                  Create Campaign
                </motion.button>
                <button
                  onClick={() => setNewCampaignOpen(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Action Button ────────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setNewCampaignOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#064e3b] text-white rounded-full shadow-2xl flex items-center justify-center z-40 hover:bg-[#003527] transition-colors"
        aria-label="Quick create campaign"
      >
        <Plus size={24} />
      </motion.button>
    </div>
  );
}

// ─── Toggle Checkbox ──────────────────────────────────────────────────────────

function ToggleCheck({
  id,
  label,
  checked,
  onChange,
  icon: Icon,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ElementType;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer group select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-slate-300 text-[#064e3b] focus:ring-[#064e3b]/20"
      />
      <Icon size={11} className="text-slate-400 group-hover:text-[#064e3b] transition-colors" />
      <span className="text-xs text-slate-400 group-hover:text-[#064e3b] transition-colors font-medium">
        {label}
      </span>
    </label>
  );
}