"use client";

/**
 * Election Management Page
 * app/(admin)/elections/manage/page.tsx
 * VB-02–07 · GOV-01
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Bell, OctagonX, RefreshCw, Users, ShieldCheck,
  Clock, Wifi, Fingerprint, ChevronRight, CheckCircle2, X,
  AlertTriangle, Loader2, Eye, ChevronDown, Activity,
  Award, TrendingUp, Send, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMosque }    from "@/context/MosqueContext";
import { useElections } from "@/hooks/elections/useElections";

import type {
  ElectionListItem, ElectionDetail, ElectionPositionSummary,
  TurnoutData, ElectionCandidatesData, VoterPositionView, CandidateVoterView,
  NotifyNonVotersData, EmergencyStopData, ElectionStatus,
  BallotIntegrity, NotificationTemplate, NotificationChannel, EmergencyStopReason, RoleBundle,
} from "@/types/elections";

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.38, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] } }),
};
const slideRight = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.2 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatTimeRemaining(secs: number | null): string {
  if (secs === null || secs <= 0) return "Closed";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}
function formatAvgVoteTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
const ROLE_BUNDLE_LABELS: Record<RoleBundle, string> = {
  executive_admin: "Executive Admin", treasurer: "Treasurer",
  secretary: "Secretary", general_council_member: "General Council",
};

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function ElectionStatusBadge({ status }: { status: ElectionStatus }) {
  const map: Record<ElectionStatus, { cls: string; label: string; dot: string }> = {
    active: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active",  dot: "bg-emerald-500" },
    frozen: { cls: "bg-red-50 text-red-600 border-red-200",             label: "Frozen",  dot: "bg-red-500"     },
    closed: { cls: "bg-slate-100 text-slate-500 border-slate-200",      label: "Closed",  dot: "bg-slate-400"   },
  };
  const { cls, label, dot } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border", cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "active" && "animate-pulse", dot)} />
      {label}
    </span>
  );
}
function IntegrityBadge({ integrity }: { integrity: BallotIntegrity }) {
  const map: Record<BallotIntegrity, { cls: string; label: string }> = {
    active:      { cls: "bg-emerald-50 text-emerald-700", label: "Integrity Active"      },
    warning:     { cls: "bg-amber-50 text-amber-700",     label: "Integrity Warning"     },
    compromised: { cls: "bg-red-50 text-red-600",         label: "Integrity Compromised" },
  };
  const { cls, label } = map[integrity];
  return <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold", cls)}>{label}</span>;
}
function TurnoutBar({ pct, frozenColor = false }: { pct: number; frozenColor?: boolean }) {
  return (
    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
      <motion.div
        className={cn("h-full rounded-full", frozenColor ? "bg-red-400" : "bg-gradient-to-r from-[#003527] to-[#064e3b]")}
        initial={{ width: "0%" }} animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

// ─── Notify Modal — VB-03 ────────────────────────────────────────────────────
function NotifyModal({ remaining, onConfirm, onClose, saving, result }: {
  remaining: number; onConfirm: (template: NotificationTemplate, channel: NotificationChannel) => void;
  onClose: () => void; saving: boolean; result: NotifyNonVotersData | null;
}) {
  const [template, setTemplate] = useState<NotificationTemplate>("gentle_reminder");
  const [channel,  setChannel]  = useState<NotificationChannel>("mobile_push");
  const TEMPLATES: { value: NotificationTemplate; label: string; desc: string }[] = [
    { value: "gentle_reminder", label: "Gentle Reminder", desc: "A friendly nudge." },
    { value: "last_chance",     label: "Last Chance",     desc: "Emphasises the deadline." },
    { value: "deadline_today",  label: "Deadline Today",  desc: "Urgent — closes today." },
  ];
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Notify Non-Voters — VB-03</h3>
              <p className="text-xs text-slate-400">{remaining.toLocaleString()} members haven't voted</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="p-6 space-y-5">
            {result ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5">
                <p className="text-sm font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={14} /> Notifications Queued</p>
                <p className="text-xs text-emerald-600"><span className="font-semibold">{result.recipients.toLocaleString()}</span> recipients · ETA ~{Math.ceil(result.estimated_eta_s / 60)}m · Status: <span className="font-mono font-semibold">{result.status}</span></p>
                <p className="text-[10px] text-emerald-500 font-mono">Job: {result.job_id}</p>
                <p className="text-[10px] text-emerald-500">Queued {formatDateTime(result.queued_at)}</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Message Template</label>
                  <div className="space-y-2">
                    {TEMPLATES.map((t) => (
                      <button key={t.value} onClick={() => setTemplate(t.value)}
                        className={cn("w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-all",
                          template === t.value ? "bg-[#064e3b] text-white border-[#064e3b]" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-[#064e3b]/30")}>
                        <p className="font-bold">{t.label}</p>
                        <p className={cn("font-normal mt-0.5", template === t.value ? "text-white/70" : "text-slate-400")}>{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Channel</label>
                  <div className="flex gap-2">
                    {(["mobile_push", "sms"] as NotificationChannel[]).map((c) => (
                      <button key={c} onClick={() => setChannel(c)}
                        className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all",
                          channel === c ? "bg-[#064e3b] text-white border-[#064e3b]" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#064e3b]/30")}>
                        {c === "mobile_push" ? "Mobile Push" : "SMS"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">{result ? "Close" : "Cancel"}</button>
              {!result && (
                <button onClick={() => onConfirm(template, channel)} disabled={saving}
                  className="inline-flex items-center gap-2 bg-[#064e3b] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {saving ? "Sending…" : "Send Notifications"}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Emergency Stop Modal — VB-04 ────────────────────────────────────────────
function EmergencyStopModal({ electionLabel, masjidId, onConfirm, onClose, saving, result }: {
  electionLabel: string; masjidId: string;
  onConfirm: (reason: EmergencyStopReason, initiatedBy: string) => void;
  onClose: () => void; saving: boolean; result: EmergencyStopData | null;
}) {
  const [reason, setReason] = useState<EmergencyStopReason>("admin_request");
  const REASONS: { value: EmergencyStopReason; label: string; desc: string }[] = [
    { value: "admin_request",     label: "Admin Request",    desc: "Manual stop by an administrator." },
    { value: "suspected_fraud",   label: "Suspected Fraud",  desc: "Suspicious ballot activity detected." },
    { value: "technical_failure", label: "Technical Failure","desc": "System error affecting integrity." },
  ];
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50 rounded-t-2xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-red-700 flex items-center gap-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                <OctagonX size={15} /> Emergency Stop — VB-04
              </h3>
              <p className="text-xs text-red-500 mt-0.5">{electionLabel}</p>
            </div>
            <button onClick={onClose} className="text-red-400 hover:text-red-600"><X size={16} /></button>
          </div>
          <div className="p-6 space-y-5">
            {result ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
                <p className="text-sm font-bold text-red-700 flex items-center gap-2"><OctagonX size={14} /> Election Frozen</p>
                <p className="text-xs text-red-600"><span className="font-semibold">{result.sessions_killed}</span> active sessions killed</p>
                <p className="text-xs text-red-500">Frozen at {formatDateTime(result.frozen_at)}</p>
                <p className="text-[10px] text-red-400 font-mono">Audit: {result.audit_event}</p>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">This will immediately freeze all active ballot sessions. The election must be manually resumed.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Stop Reason *</label>
                  <div className="space-y-2">
                    {REASONS.map((r) => (
                      <button key={r.value} onClick={() => setReason(r.value)}
                        className={cn("w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-all",
                          reason === r.value ? "bg-red-600 text-white border-red-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-red-300")}>
                        <p className="font-bold">{r.label}</p>
                        <p className={cn("font-normal mt-0.5", reason === r.value ? "text-white/70" : "text-slate-400")}>{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Initiated By</p>
                  <p className="text-xs font-mono text-slate-600">{masjidId}</p>
                </div>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">{result ? "Close" : "Cancel"}</button>
              {!result && (
                <button onClick={() => onConfirm(reason, masjidId)} disabled={saving}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <OctagonX size={13} />}
                  {saving ? "Stopping…" : "Execute Emergency Stop"}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Candidates Preview Modal — VB-07 ────────────────────────────────────────
function CandidatesPreviewModal({ data, onClose }: { data: ElectionCandidatesData; onClose: () => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]">
          <div className="px-6 py-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Candidates — VB-07</h3>
              <p className="text-xs text-slate-400">{data.label} · Deadline {formatDate(data.voting_deadline)}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {data.positions.map((pos: VoterPositionView) => (
              <div key={pos.position_id}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  {pos.position_name} — {pos.candidates.length} candidate{pos.candidates.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2">
                  {pos.candidates.map((c: CandidateVoterView) => (
                    <div key={c.candidate_id} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#064e3b] to-[#003527] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#131b2e]">{c.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{c.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ElectionManagementPage() {
  const { activeMosque, isHydrating } = useMosque();
  const masjidId = isHydrating ? null : (activeMosque?.id ?? null);

  const {
    elections, electionDetail, turnout, electionCandidates,
    loading, error,
    getElections, getElectionDetail, getTurnout,
    notifyNonVoters, emergencyStop, getElectionCandidates,
    clearElectionDetail, clearError,
  } = useElections();

  const [selectedId,       setSelectedId]       = useState<string | null>(null);
  const [showNotify,       setShowNotify]       = useState(false);
  const [showStop,         setShowStop]         = useState(false);
  const [showCandidates,   setShowCandidates]   = useState(false);
  const [notifyResult,     setNotifyResult]     = useState<NotifyNonVotersData | null>(null);
  const [stopResult,       setStopResult]       = useState<EmergencyStopData | null>(null);
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // VB-05: load elections
  useEffect(() => {
    if (!masjidId) return;
    getElections(masjidId, { page: 1, limit: 50 });
  }, [masjidId, getElections]);

  // Auto-select first active
  useEffect(() => {
    const list = elections?.data ?? [];
    if (list.length > 0 && !selectedId) {
      const first = list.find((e) => e.status === "active") ?? list[0];
      setSelectedId(first.election_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elections]);

  // VB-06: load detail
  useEffect(() => {
    if (!masjidId || !selectedId) return;
    getElectionDetail(masjidId, selectedId);
    return () => clearElectionDetail();
  }, [masjidId, selectedId, getElectionDetail, clearElectionDetail]);

  // VB-07: candidates
  useEffect(() => {
    if (!masjidId || !selectedId) return;
    getElectionCandidates(masjidId, selectedId);
  }, [masjidId, selectedId, getElectionCandidates]);

  // VB-02: 30s poll
  useEffect(() => {
    if (!masjidId || !selectedId) return;
    getTurnout(masjidId, selectedId);
    pollRef.current = setInterval(() => getTurnout(masjidId, selectedId), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [masjidId, selectedId, getTurnout]);

  // Derived
  const electionList:   ElectionListItem[]       = elections?.data          ?? [];
  const detail:         ElectionDetail | null    = electionDetail?.data     as ElectionDetail    | null;
  const live:           TurnoutData    | null    = turnout?.data            as TurnoutData       | null;
  const candidateData:  ElectionCandidatesData | null = electionCandidates?.data as ElectionCandidatesData | null;
  const pagination = elections?.pagination;

  const participation  = live?.participation_pct  ?? detail?.participation_pct  ?? 0;
  const ballotsCast    = live?.ballots_cast        ?? detail?.ballots_cast        ?? 0;
  const eligibleVoters = live?.eligible_voters     ?? detail?.eligible_voters     ?? 0;
  const remaining      = live?.remaining_voters    ?? Math.max(0, eligibleVoters - ballotsCast);
  const activeSessions = live?.active_sessions     ?? 0;
  const avgVoteTime    = live?.avg_vote_seconds    ?? 0;
  const deltaHr        = live?.delta_pct_1hr       ?? 0;
  const timeRemaining  = live?.time_remaining_s    ?? detail?.time_remaining_s    ?? null;
  const integrity      = live?.ballot_integrity    ?? detail?.ballot_integrity    ?? "active";
  const refreshedAt    = live?.refreshed_at        ?? null;

  const isFrozen = detail?.status === "frozen";
  const isClosed = detail?.status === "closed";
  const isActive = detail?.status === "active";

  // VB-03
  const handleNotify = useCallback(async (template: NotificationTemplate, channel: NotificationChannel) => {
    if (!masjidId || !selectedId) return;
    const res = await notifyNonVoters(masjidId, selectedId, { message_template: template, channel });
    if (res) setNotifyResult(res.data);
  }, [masjidId, selectedId, notifyNonVoters]);

  // VB-04
  const handleEmergencyStop = useCallback(async (reason: EmergencyStopReason, initiatedBy: string) => {
    if (!masjidId || !selectedId) return;
    const res = await emergencyStop(masjidId, selectedId, { reason, initiated_by: initiatedBy });
    if (res) setStopResult(res.data);
  }, [masjidId, selectedId, emergencyStop]);

  const handleRefreshTurnout = useCallback(() => {
    if (!masjidId || !selectedId) return;
    getTurnout(masjidId, selectedId);
    getElectionDetail(masjidId, selectedId);
  }, [masjidId, selectedId, getTurnout, getElectionDetail]);

  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 flex-1">{error}</p>
              <button onClick={clearError} className="text-red-400 hover:text-red-600 shrink-0"><X size={13} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Elections · Admin Monitoring</p>
          <h1 className="text-3xl font-extrabold text-[#131b2e] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Election Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isHydrating ? <span className="inline-block w-24 h-3 bg-slate-200 rounded animate-pulse align-middle" /> : <span className="font-semibold text-[#003527]">{activeMosque?.name ?? "—"}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefreshTurnout} disabled={loading || !selectedId}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40" aria-label="Refresh turnout">
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          </button>
          <button onClick={() => setShowCandidates(true)} disabled={!candidateData || !selectedId}
            className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 disabled:opacity-40">
            <Eye size={14} /> View Candidates
          </button>
          <button onClick={() => { setNotifyResult(null); setShowNotify(true); }} disabled={!isActive || !selectedId}
            className="inline-flex items-center gap-2 bg-[#064e3b] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#043d2f] disabled:opacity-50">
            <Bell size={14} /> Notify Non-Voters
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <Activity size={16} />,    label: "Total Elections",  value: pagination?.total ?? electionList.length, accent: "#064e3b" },
          { icon: <Fingerprint size={16} />, label: "Ballots Cast",    value: ballotsCast.toLocaleString(),              accent: "#1d4ed8" },
          { icon: <TrendingUp size={16} />,  label: "Participation",   value: `${Math.round(participation)}%`,           accent: "#7c3aed" },
          { icon: <Wifi size={16} />,        label: "Active Sessions", value: activeSessions,                            accent: "#b45309" },
        ].map((s, i) => (
          <motion.div key={s.label} variants={fadeUp} initial="hidden" animate="visible" custom={i + 2}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: s.accent }}>{s.icon}</div>
            <div>
              <p className="text-xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                {loading && !elections ? <span className="inline-block w-10 h-5 bg-slate-100 rounded animate-pulse" /> : s.value}
              </p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: elections list */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}
          className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Elections</h2>
              <span className="text-xs text-slate-400">{pagination?.total ?? electionList.length} total</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[65vh] overflow-y-auto">
              {loading && electionList.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 flex items-start gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1"><div className="h-3.5 bg-slate-100 rounded w-3/4" /><div className="h-3 bg-slate-100 rounded w-1/2" /><div className="h-2 bg-slate-100 rounded w-full" /></div>
                    </div>
                  ))
                : electionList.length === 0
                ? <div className="py-14 text-center text-slate-400 text-sm">{!masjidId ? "Select a mosque." : "No elections found."}</div>
                : electionList.map((e: ElectionListItem) => {
                    const isSelected = selectedId === e.election_id;
                    return (
                      <button key={e.election_id} onClick={() => setSelectedId(e.election_id)}
                        className={cn("w-full text-left px-5 py-4 flex items-start gap-3 transition-colors",
                          isSelected ? "bg-[#f0faf5]" : "hover:bg-slate-50/60")}>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          e.status === "active" ? "bg-emerald-50" : e.status === "frozen" ? "bg-red-50" : "bg-slate-100")}>
                          {e.status === "active" && <Activity size={16} className="text-emerald-600" />}
                          {e.status === "frozen" && <OctagonX size={16} className="text-red-500" />}
                          {e.status === "closed" && <CheckCircle2 size={16} className="text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-bold text-[#131b2e] truncate">{e.label}</p>
                            <ElectionStatusBadge status={e.status} />
                          </div>
                          <p className="text-xs text-slate-400">{e.positions_count} position{e.positions_count !== 1 ? "s" : ""} · {e.eligible_voters.toLocaleString()} eligible</p>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span>{e.ballots_cast.toLocaleString()} votes</span>
                              <span className="font-semibold">{e.participation_pct}%</span>
                            </div>
                            <TurnoutBar pct={e.participation_pct} frozenColor={e.status === "frozen"} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5">Deadline {formatDate(e.voting_deadline)}</p>
                        </div>
                        {isSelected && <ChevronRight size={14} className="text-[#064e3b] shrink-0 mt-3" />}
                      </button>
                    );
                  })
              }
            </div>
          </div>
        </motion.div>

        {/* RIGHT: detail + live monitoring */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}
          className="lg:col-span-8 flex flex-col gap-5">
          <AnimatePresence mode="wait">
            {!selectedId ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-28 text-center">
                <Award size={36} className="text-slate-200 mb-3" />
                <p className="text-slate-400 font-semibold text-sm">Select an election to monitor</p>
              </motion.div>
            ) : (
              <motion.div key={selectedId} variants={slideRight} initial="hidden" animate="visible" exit="exit"
                className="flex flex-col gap-5">

                {/* VB-06 detail header */}
                {loading && !detail ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
                    <div className="h-6 bg-slate-100 rounded w-64 mb-2" /><div className="h-4 bg-slate-100 rounded w-40" />
                  </div>
                ) : detail ? (
                  <div className={cn("rounded-2xl border shadow-sm p-6",
                    isFrozen ? "bg-red-50 border-red-200" : isClosed ? "bg-slate-50 border-slate-200" : "bg-white border-slate-100")}>
                    {isFrozen && (
                      <div className="flex items-center gap-2 bg-red-600 text-white rounded-xl px-4 py-2.5 mb-4">
                        <OctagonX size={14} />
                        <p className="text-sm font-semibold">Election is frozen — all ballot sessions are paused.</p>
                        {stopResult && <span className="ml-auto text-xs text-red-200 font-mono">{stopResult.sessions_killed} sessions killed</span>}
                      </div>
                    )}
                    {isClosed && (
                      <div className="flex items-center gap-2 bg-slate-700 text-white rounded-xl px-4 py-2.5 mb-4">
                        <CheckCircle2 size={14} /><p className="text-sm font-semibold">Election closed — results are being certified.</p>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>{detail.label}</h2>
                          <ElectionStatusBadge status={detail.status} />
                          <IntegrityBadge integrity={integrity} />
                        </div>
                        <p className="text-sm text-slate-500">
                          Deadline {formatDate(detail.voting_deadline)} · {formatTimeRemaining(timeRemaining)} · {detail.positions.length} position{detail.positions.length !== 1 ? "s" : ""}
                        </p>
                        {refreshedAt && <p className="text-[10px] text-slate-400 mt-0.5">Turnout refreshed {formatDateTime(refreshedAt)}</p>}
                      </div>
                      {isActive && (
                        <button onClick={() => { setStopResult(null); setShowStop(true); }}
                          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-500">
                          <OctagonX size={13} /> Emergency Stop
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* VB-02 live turnout */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Live Turnout — VB-02</h3>
                    {isActive && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Live · 30s poll
                      </span>
                    )}
                  </div>
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>{Math.round(participation)}% Participation</span>
                      <span className="text-sm text-slate-500">{ballotsCast.toLocaleString()} / {eligibleVoters.toLocaleString()}</span>
                    </div>
                    <TurnoutBar pct={participation} frozenColor={isFrozen} />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-slate-400">{remaining.toLocaleString()} yet to vote</span>
                      {deltaHr > 0 && <span className="text-xs text-emerald-600 font-semibold">↑ {deltaHr}% this hour</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-50 pt-5">
                    {[
                      { icon: <Clock size={14} />,       label: "Time Remaining",  value: formatTimeRemaining(timeRemaining), mono: true  },
                      { icon: <Wifi size={14} />,        label: "Active Sessions", value: activeSessions.toLocaleString(),    mono: false },
                      { icon: <Users size={14} />,       label: "Avg. Vote Time",  value: formatAvgVoteTime(avgVoteTime),     mono: true  },
                      { icon: <ShieldCheck size={14} />, label: "Integrity",       value: integrity.charAt(0).toUpperCase() + integrity.slice(1), mono: false,
                        color: integrity === "active" ? "text-emerald-600" : integrity === "warning" ? "text-amber-600" : "text-red-600" },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <div className="flex justify-center text-slate-400 mb-1.5">{s.icon}</div>
                        <p className={cn("text-lg font-extrabold text-[#131b2e]", s.mono && "font-mono text-base", "color" in s && s.color)}
                           style={!s.mono ? { fontFamily: "Manrope, sans-serif" } : {}}>
                          {live ? s.value : <span className="inline-block w-12 h-5 bg-slate-100 rounded animate-pulse" />}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VB-06 positions breakdown */}
                {detail && detail.positions.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50">
                      <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Position Breakdown — VB-06</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{detail.positions.length} positions · {detail.ballots_cast.toLocaleString()} total ballots</p>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {detail.positions.map((pos: ElectionPositionSummary) => {
                        const isExpanded = expandedPosition === pos.position_id;
                        const posPct = eligibleVoters > 0 ? Math.round((pos.ballots_for_position / eligibleVoters) * 100) : 0;
                        return (
                          <div key={pos.position_id}>
                            <button onClick={() => setExpandedPosition(isExpanded ? null : pos.position_id)}
                              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors text-left">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <p className="text-sm font-bold text-[#131b2e]">{pos.position_name}</p>
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{ROLE_BUNDLE_LABELS[pos.role_bundle]}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div className="h-full bg-[#064e3b] rounded-full" initial={{ width: "0%" }} animate={{ width: `${posPct}%` }} transition={{ duration: 0.8 }} />
                                  </div>
                                  <span className="text-xs text-slate-500 font-semibold whitespace-nowrap tabular-nums">{pos.ballots_for_position.toLocaleString()} ballots</span>
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{posPct}%</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-slate-400">{pos.candidate_count} candidate{pos.candidate_count !== 1 ? "s" : ""}</span>
                                <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                              </div>
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                                  className="overflow-hidden border-t border-slate-50">
                                  <div className="px-6 py-4 bg-slate-50/50">
                                    {candidateData ? (() => {
                                      const voterPos = candidateData.positions.find((p: VoterPositionView) => p.position_id === pos.position_id);
                                      if (!voterPos) return <p className="text-xs text-slate-400">No candidate data available.</p>;
                                      return (
                                        <div className="space-y-2">
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">VB-07 Candidate View</p>
                                          {voterPos.candidates.map((c: CandidateVoterView) => (
                                            <div key={c.candidate_id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100">
                                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#064e3b] to-[#003527] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#131b2e]">{c.name}</p>
                                                <p className="text-xs text-slate-400 leading-relaxed">{c.bio}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })() : <p className="text-xs text-slate-400 animate-pulse">Loading candidates…</p>}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VB-03 notify result card */}
                <AnimatePresence>
                  {notifyResult && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="bg-[#064e3b] text-white rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Bell size={18} className="text-[#b0f0d6]" /></div>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Notification Job Queued — VB-03</p>
                        <p className="text-xs text-emerald-200/80 mt-0.5">{notifyResult.recipients.toLocaleString()} recipients · ETA ~{Math.ceil(notifyResult.estimated_eta_s / 60)}m · Status: <span className="font-mono">{notifyResult.status}</span></p>
                        <p className="text-[10px] text-emerald-300/60 mt-1 font-mono">Job ID: {notifyResult.job_id}</p>
                      </div>
                      <button onClick={() => setNotifyResult(null)} className="text-white/40 hover:text-white shrink-0"><X size={14} /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* VB-04 stop result card */}
                <AnimatePresence>
                  {stopResult && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="bg-red-600 text-white rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><OctagonX size={18} /></div>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>Election Frozen — VB-04</p>
                        <p className="text-xs text-red-200 mt-0.5">{stopResult.sessions_killed} sessions killed · Frozen {formatDateTime(stopResult.frozen_at)}</p>
                        <p className="text-[10px] text-red-300/70 mt-1 font-mono">Audit: {stopResult.audit_event}</p>
                      </div>
                      <button onClick={() => setStopResult(null)} className="text-white/40 hover:text-white shrink-0"><X size={14} /></button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* VB-03 Notify modal */}
      <AnimatePresence>
        {showNotify && (
          <NotifyModal remaining={remaining} onConfirm={handleNotify}
            onClose={() => setShowNotify(false)} saving={loading} result={notifyResult} />
        )}
      </AnimatePresence>

      {/* VB-04 Emergency stop modal */}
      <AnimatePresence>
        {showStop && masjidId && (
          <EmergencyStopModal electionLabel={detail?.label ?? ""} masjidId={masjidId}
            onConfirm={handleEmergencyStop} onClose={() => setShowStop(false)} saving={loading} result={stopResult} />
        )}
      </AnimatePresence>

      {/* VB-07 Candidates preview */}
      <AnimatePresence>
        {showCandidates && candidateData && (
          <CandidatesPreviewModal data={candidateData} onClose={() => setShowCandidates(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}