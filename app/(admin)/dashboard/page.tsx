"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Bell, BellOff, Loader2 } from "lucide-react";
import { useMosque } from "@/context/MosqueContext";
import { MosqueSwitcher } from "@/components/MosqueSwitcher";
import { useDeviceToken } from "@/hooks/notifications/useDeviceToken";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  Building2, Building, Megaphone, UserPlus, Globe,
  ChevronRight, LockOpen, UserCheck, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useDashboardSummary } from "@/hooks/dashboard/useDashboardSummary";
import { AuditLogEntry, GetAuditLogResponse } from "@/types/api";

/* ─── Types ─────────────────────────────────────────────── */
type KPI = {
  label: string; value: string; sub: string;
  badge?: string; badgeColor?: string; extra?: React.ReactNode;
};
type QuickAction = { icon: React.ElementType; label: string; onClick: () => void };

/* ─── Animation ──────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

/* ─── Push Notification Badge ────────────────────────────── */
function PushNotificationBadge() {
  const { register, deregister, loading, error, permission, isRegistered } = useDeviceToken();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (permission === "granted" && !isRegistered) register();
  }, [permission, isRegistered, register]);

  if (!mounted) return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400 invisible" aria-hidden="true">
      <Bell size={13} /><span>Notifications</span>
    </div>
  );
  if (loading) return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <Loader2 size={13} className="animate-spin" /><span>Registering…</span>
    </div>
  );
  if (permission === "denied") return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400" title="Notifications blocked in browser settings">
      <BellOff size={13} /><span>Notifications blocked</span>
    </div>
  );
  if (isRegistered) return (
    <button onClick={() => deregister()}
      className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-red-500 transition-colors group"
      title="Click to disable push notifications">
      <Bell size={13} className="group-hover:hidden" />
      <BellOff size={13} className="hidden group-hover:block" />
      <span className="group-hover:hidden">Push enabled</span>
      <span className="hidden group-hover:inline">Disable</span>
    </button>
  );
  return (
    <button onClick={() => register()}
      className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold hover:text-[#003527] transition-colors"
      title="Enable push notifications">
      <Bell size={13} /><span>Enable notifications</span>
    </button>
  );
}

/* ─── KPI Card ───────────────────────────────────────────── */
function KpiCard({ kpi, delay }: { kpi: KPI; delay: number }) {
  return (
    <motion.div {...fadeUp(delay)}
      data-testid={`kpi-card-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}
      className="bg-white rounded-xl p-5 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
        {kpi.badge && (
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", kpi.badgeColor)}>{kpi.badge}</span>
        )}
        {kpi.extra}
      </div>
      <div className="text-3xl font-extrabold text-[#131b2e] tracking-tight mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
        {kpi.value}
      </div>
      <div className="text-xs text-slate-400">{kpi.sub}</div>
    </motion.div>
  );
}

/* ─── KPI Row ────────────────────────────────────────────── */
function KpiRow({ summary }: {
  summary: import("@/types/dashboard").DashboardData | null;
}) {
  const hasElection = summary?.governance.has_active_election ?? false;
  const elecLabel    = summary?.governance.active_election_label ?? "No active election";
  const ballotsCast  = summary?.governance.ballots_cast ?? 0;

  const communitySize = summary?.community.total_members?.toLocaleString() ?? "—";
  const growthPct     = summary?.community.growth_pct;
  const revenuePct    = summary?.revenue.progress_pct ?? 0;
  const totalRaised   = summary?.revenue.total_raised ?? 0;
  const totalGoal     = summary?.revenue.total_goal ?? 0;
  const daysLeft      = summary?.revenue.days_remaining;
  const staffCount    = summary?.staff.total_staff ?? "—";

  const revenueSub = summary
    ? `$${(totalRaised / 1000).toFixed(1)}k / $${(totalGoal / 1000).toFixed(1)}k${daysLeft != null ? ` · ${daysLeft} days left` : ""}`
    : "Loading...";

  const kpis: KPI[] = [
    {
      label: "Community Size",
      value: communitySize,
      sub:   "Verified Households",
      badge:      growthPct != null ? `+${growthPct}%` : undefined,
      badgeColor: "bg-[#b0f0d6]/40 text-[#003527]",
    },
    {
      label: "Revenue vs Goal",
      value: summary ? `${revenuePct}%` : "—",
      sub:   revenueSub,
      extra: (
        <div className="mt-1 h-1 w-full bg-[#dae2fd] rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${revenuePct}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            className="h-full bg-[#003527] rounded-full" />
        </div>
      ),
    },
    {
      label:      "Governance",
      value:      hasElection ? "Active" : "No Election",
      sub:        hasElection ? `${elecLabel} · ${ballotsCast} votes cast` : "No active election",
      badge:      hasElection ? "Active Election" : undefined,
      badgeColor: "bg-[#d5e3fd] text-[#3a485c]",
    },
    {
      label: "Staff Activity",
      value: String(staffCount),
      sub:   "Active contributors today",
      extra: (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-400">Live</span>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      {kpis.map((kpi, i) => <KpiCard key={kpi.label} kpi={kpi} delay={0.05 * i} />)}
    </div>
  );
}

/* ─── Financial Chart ────────────────────────────────────── */
function FinancialChart({
  summary, onPeriodChange,
}: {
  summary: import("@/types/dashboard").DashboardData | null;
  onPeriodChange: (p: "day" | "week" | "month") => void;
}) {
  const [active, setActive] = useState<"Day" | "Week" | "Month">("Week");

  const handlePeriod = (t: "Day" | "Week" | "Month") => {
    setActive(t);
    onPeriodChange(t.toLowerCase() as "day" | "week" | "month");
  };

  const bars = summary?.financial_chart.bars ?? null;
  const hasBars = Array.isArray(bars) && bars.length > 0;
  const max     = hasBars ? Math.max(...bars!.map((b) => b.amount), 1) : 1;
  const barPcts = hasBars ? bars!.map((b) => Math.round((b.amount / max) * 100)) : [];
  const labels  = hasBars ? bars!.map((b) => b.label) : [];

  const ds = summary?.donation_stats;
  const quickStats = [
    { label: "Average Donation",  value: ds ? `$${ds.average_donation}` : "—",  danger: false },
    { label: "Recurring Donors",  value: ds ? String(ds.recurring_donors)  : "—", danger: false },
    { label: "Refunds Requested", value: ds ? String(ds.refunds_requested) : "—", danger: true  },
  ];

  return (
    <motion.div {...fadeUp(0.25)} className="bg-white rounded-2xl p-7 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-extrabold text-[#131b2e] text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>Financial Overview</h3>
          <p className="text-xs text-slate-400 mt-0.5">Donations & Expenses</p>
        </div>
        <div className="flex gap-1 bg-[#f2f3ff] p-1 rounded-lg">
          {(["Day", "Week", "Month"] as const).map((t) => (
            <button key={t} onClick={() => handlePeriod(t)}
              data-testid={`chart-period-${t.toLowerCase()}`}
              className={cn("px-3 py-1 rounded-md text-xs font-bold transition-all",
                active === t ? "bg-white text-[#003527] shadow-sm" : "text-slate-400 hover:text-slate-600")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {hasBars ? (
        <>
          <div className="flex items-end gap-1.5 h-40">
            {barPcts.map((h, i) => (
              <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
                className={cn("flex-1 rounded-t-md",
                  i === barPcts.length - 1 ? "bg-[#003527]" : "bg-[#dae2fd]"
                )} />
            ))}
          </div>
          <div className="flex justify-between mt-3">
            {labels.map((m, i) => (
              <span key={`${m}-${i}`} className="text-[9px] text-slate-300 font-medium">{m}</span>
            ))}
          </div>
        </>
      ) : (
        <div className="h-40 flex items-center justify-center text-xs text-slate-300 font-medium">
          {summary ? "No revenue data yet for this period" : "Loading…"}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
        {quickStats.map((s) => (
          <div key={s.label}>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn("text-xl font-extrabold", s.danger ? "text-red-500" : "text-[#131b2e]")}
              style={{ fontFamily: "Manrope, sans-serif" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Quick Actions ──────────────────────────────────────── */
function QuickActions({
  onCreatePing, onBroadcast, onInviteStaff, onOpenBuilder,
}: {
  onCreatePing:   () => void;
  onBroadcast:    () => void;
  onInviteStaff:  () => void;
  onOpenBuilder:  () => void;
}) {
  const QUICK_ACTIONS: QuickAction[] = [
    { icon: Building,  label: "masjid management",       onClick: onCreatePing   },
    { icon: Megaphone, label: "Broadcast Announcement",  onClick: onBroadcast    },
    { icon: UserPlus,  label: "Invite New Staff",        onClick: onInviteStaff  },
    { icon: Globe,     label: "Open Website Builder",    onClick: onOpenBuilder  },
  ];

  return (
    <motion.div {...fadeUp(0.3)} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <h3 className="font-extrabold text-[#131b2e] text-sm mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Quick Actions</h3>
      <div className="space-y-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} onClick={action.onClick}
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#f2f3ff] hover:bg-[#e2e7ff] transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#003527]/10 flex items-center justify-center">
                  <Icon size={14} className="text-[#003527]" />
                </div>
                <span className="text-xs font-bold text-[#131b2e]">{action.label}</span>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-[#003527] transition-colors" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── Governance Monitor ─────────────────────────────────── */
function GovernanceMonitor({ summary }: { summary: import("@/types/dashboard").DashboardData | null }) {
  const router = useRouter();
  const campaigns = summary?.campaigns ?? [];

  return (
    <motion.section {...fadeUp(0.3)}
      className="bg-white rounded-2xl p-7 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-extrabold text-[#131b2e] text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>Governance Monitor</h3>
          <p className="text-xs text-slate-400 mt-0.5">Campaign Oversight</p>
        </div>
        <button onClick={() => router.push("/governance")} data-testid="governance-view-all"
          className="text-[10px] font-bold text-slate-400 hover:text-[#003527] transition-colors tracking-wider">
          VIEW ALL
        </button>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active Campaigns</p>
        {campaigns.length === 0 ? (
          <p className="text-xs text-slate-300 py-6 text-center">No campaigns yet</p>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => (
              <div key={c.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-bold text-[#131b2e]">{c.title}</span>
                  <div className="flex items-center gap-2">
                    {c.status === "closed" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#b0f0d6]/40 text-[#003527]">Complete</span>
                    )}
                    <span className="text-xs font-bold text-[#003527]">{c.progress_pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-[#f2f3ff] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${c.progress_pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                    className={cn("h-full rounded-full", c.status === "closed" ? "bg-emerald-400" : "bg-[#003527]")} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

/* ─── Audit Log ──────────────────────────────────────────── */
const ACTION_ICON: Record<string, { icon: React.ElementType; iconBg: string; iconColor: string }> = {
  ACCEPT:        { icon: UserCheck,   iconBg: "bg-[#b0f0d6]", iconColor: "text-[#003527]" },
  role_assigned: { icon: UserCheck,   iconBg: "bg-[#b0f0d6]", iconColor: "text-[#003527]" },
  scope_granted: { icon: LockOpen,    iconBg: "bg-[#d5e3fd]", iconColor: "text-[#3a485c]" },
  scope_revoked: { icon: ShieldAlert, iconBg: "bg-[#ffdad6]", iconColor: "text-[#ba1a1a]" },
};
const DEFAULT_ACTION_ICON = { icon: UserCheck, iconBg: "bg-[#eaedff]", iconColor: "text-[#404944]" };

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

function AuditLog({ masjidId }: { masjidId: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudit = useCallback(async () => {
    if (!masjidId) return;
    try {
      const res  = await fetch(`/api/masjids/${masjidId}/permissions/audit-log`, { credentials: "include" });
      const json = await res.json() as GetAuditLogResponse;
      if (json.success) setEntries(json.data ?? []);
    } catch {
      // silent — empty state shown below
    } finally {
      setLoading(false);
    }
  }, [masjidId]);

  useEffect(() => {
    fetchAudit();
    const id = setInterval(fetchAudit, 30_000);
    return () => clearInterval(id);
  }, [fetchAudit]);

  return (
    <motion.section {...fadeUp(0.35)}
      className="bg-white rounded-2xl p-7 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-extrabold text-[#131b2e] text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>Audit Log</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? "Loading..." : entries.length > 0 ? "Live · auto-refreshes every 30s" : "No recent activity"}
          </p>
        </div>
        <button onClick={() => router.push("/audit")} data-testid="audit-view-all"
          className="text-[10px] font-bold text-slate-400 hover:text-[#003527] transition-colors tracking-wider">
          VIEW ALL
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pr-1" style={{ maxHeight: "340px" }}>
        {loading && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 animate-pulse bg-slate-100" />
              <div className="space-y-1">
                <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
                <div className="h-2 bg-slate-100 rounded animate-pulse w-48 mt-1" />
              </div>
            </div>
          ))
        )}

        {!loading && entries.length === 0 && (
          <p className="text-xs text-slate-300 py-6 text-center">No audit activity yet</p>
        )}

        {!loading && entries.slice(0, 5).map((entry, i) => {
          const cfg = ACTION_ICON[entry.action] ?? DEFAULT_ACTION_ICON;
          const Icon = cfg.icon;
          const actor  = entry.actor?.name ?? "System";
          const target = entry.target_user?.name ?? "Unknown";
          return (
            <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.4, duration: 0.35 }} className="flex gap-3.5">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.iconBg)}>
                <Icon size={14} className={cfg.iconColor} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#131b2e]">{actor === target ? actor : `${actor} → ${target}`}</p>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">{entry.scope}</p>
                {entry.reason && <p className="text-[10px] text-slate-400 italic mt-0.5">"{entry.reason}"</p>}
                <p className="text-[10px] text-slate-300 mt-1">{relativeTime(entry.timestamp)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const { activeMosque, isHydrating } = useMosque();
  const router   = useRouter();
  const masjidId = activeMosque?.id ?? "";

  const { data: summary, getSummary, loading: summaryLoading } = useDashboardSummary();

  useEffect(() => {
    if (masjidId) getSummary(masjidId, { period: "week" });
  }, [masjidId, getSummary]);

  const handlePeriodChange = useCallback(
    (period: "day" | "week" | "month") => {
      if (masjidId) getSummary(masjidId, { period });
    },
    [masjidId, getSummary]
  );

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <motion.div {...fadeUp(0)}>
          <h2 className="text-4xl font-extrabold tracking-tight text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
            Command Center
          </h2>
          <p className="text-slate-400 text-sm mt-1.5 flex items-center gap-1.5">
            {isHydrating ? "Loading…" : activeMosque ? (
              <>
                Live Ecosystem ·{" "}
                <span className="font-semibold text-slate-600">{activeMosque.name}</span>
                {activeMosque.is_verified && <BadgeCheck size={13} className="text-emerald-500" />}
              </>
            ) : "No mosque selected"}
          </p>
        </motion.div>
        <motion.div {...fadeUp(0.1)} className="mt-1 flex items-center gap-3">
          <PushNotificationBadge />
          <MosqueSwitcher />
        </motion.div>
      </div>

      {/* KPI Row — strictly from /dashboard/summary */}
      <KpiRow summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-8"><FinancialChart summary={summary} onPeriodChange={handlePeriodChange} /></div>
        <div className="lg:col-span-4 flex flex-col gap-5">
          <QuickActions
            onCreatePing={() => router.push("/masjid-management")}
            onBroadcast={() => router.push("/announcement")}
            onInviteStaff={() => router.push("/users")}
            onOpenBuilder={() => router.push("/builder")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7"><GovernanceMonitor summary={summary} /></div>
        <div className="lg:col-span-5"><AuditLog masjidId={masjidId} /></div>
      </div>

      <footer className="mt-10 pt-8 border-t border-slate-100 text-center" role="contentinfo">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-[#003527] font-extrabold text-base" style={{ fontFamily: "Manrope, sans-serif" }}>
            <Building2 size={18} /><span>masjids.io</span>
          </div>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            Secure Admin Command Center. All actions are logged and encrypted.{" "}
            <a href="#" className="underline font-bold text-[#003527] hover:text-[#064e3b]">Learn more</a>
          </p>
          <div className="flex gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            {["Help Center", "API Docs", "Status", "Legal"].map((l) => (
              <a key={l} href="#" className="hover:text-[#003527] transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}