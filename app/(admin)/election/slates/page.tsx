"use client";

/**
 * Slate & Selection Management Page
 * app/(admin)/elections/slates/page.tsx
 *
 * ELS-01–08 · GOV-01 · INV-05 · PERM-01
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Lock, Search, RefreshCw, ChevronRight, CheckCircle2,
  Clock, Users, ShieldCheck, AlertCircle, Loader2, X, Edit3,
  Save, Link2, Calendar, Award, ChevronDown, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMosque }      from "@/context/MosqueContext";
import { useElections }   from "@/hooks/elections/useElections";
import { useStaff }       from "@/hooks/staff/useStaff";
import { usePermissions } from "@/hooks/permissions/usePermissions";

import type {
  SlateData, SlateDetail, SlatePositionDetail, PositionDetail,
  SlateStatus, PositionStatus, RoleBundle,
  CandidateRef, LockSlateData, MapElectionRoleData,
} from "@/types/elections";
import type { StaffMember, RoleTemplate } from "@/types/api";

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};
const slideRight = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.2 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function toInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
// Map role template name → RoleBundle enum
// Covers actual template names from PERM-01 API
function nameToRoleBundle(name: string): RoleBundle {
  const n = name.toLowerCase();
  if (n.includes("treasurer"))                                    return "treasurer";
  if (n.includes("secretary"))                                    return "secretary";
  if (n.includes("council") || n.includes("general"))            return "general_council_member";
  if (n.includes("president") || n.includes("admin") ||
      n.includes("imam") || n.includes("comms") ||
      n.includes("volunteer") || n.includes("webmaster") ||
      n.includes("member"))                                       return "executive_admin";
  return "executive_admin";
}

// Get display label for a role_bundle value
function roleBundleLabel(bundle: RoleBundle, templateList: RoleTemplate[]): string {
  // Try to find matching template name from API
  const match = templateList.find((t) => nameToRoleBundle(t.name) === bundle);
  if (match) return match.name;
  // Fallback to enum label
  const labels: Record<RoleBundle, string> = {
    executive_admin: "Executive Admin", treasurer: "Treasurer",
    secretary: "Secretary", general_council_member: "General Council Member",
  };
  return labels[bundle] ?? bundle;
}

// ─── Shared UI atoms ─────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-100 mb-5">
        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-600 flex-1">{message}</p>
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 shrink-0"><X size={13} /></button>
      </div>
    </motion.div>
  );
}
function SlateBadge({ status }: { status: SlateStatus }) {
  return status === "locked" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <Lock size={9} /> Locked
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 size={9} /> Open
    </span>
  );
}
function PositionBadge({ status }: { status: PositionStatus }) {
  const map: Record<PositionStatus, { cls: string; label: string; icon: React.ReactNode }> = {
    pending_draft: { cls: "bg-slate-100 text-slate-500 border-slate-200", label: "Draft",  icon: <Clock size={9} /> },
    active_setup:  { cls: "bg-blue-50 text-blue-700 border-blue-200",     label: "Active", icon: <CheckCircle2 size={9} /> },
    locked:        { cls: "bg-amber-50 text-amber-600 border-amber-200",  label: "Locked", icon: <Lock size={9} /> },
  };
  const { cls, label, icon } = map[status] ?? map.pending_draft;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border", cls)}>
      {icon} {label}
    </span>
  );
}
function StaffAvatar({ member, size = "sm" }: { member: StaffMember; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[9px]";
  if (member.avatar_url) {
    return <img src={member.avatar_url} alt={member.name}
      className={cn("rounded-full object-cover shrink-0", dim)}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div className={cn("rounded-full bg-gradient-to-br from-[#064e3b] to-[#003527] flex items-center justify-center text-white font-bold shrink-0", dim)}>
      {toInitials(member.name)}
    </div>
  );
}
function CandidatePill({ candidate }: { candidate: CandidateRef }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#064e3b]/10 text-[#064e3b] text-xs font-semibold">
      <div className="w-4 h-4 rounded-full bg-[#064e3b] flex items-center justify-center text-white text-[8px] font-bold shrink-0">
        {toInitials(candidate.name)}
      </div>
      {candidate.name}
    </span>
  );
}

// ─── Candidate Picker Modal — ELS-04 + INV-05 ────────────────────────────────
function CandidatePickerModal({
  positionName, existingCandidates, staffPool, staffLoading,
  search, onSearchChange, onConfirm, onClose, saving,
}: {
  positionName: string; existingCandidates: CandidateRef[];
  staffPool: StaffMember[]; staffLoading: boolean;
  search: string; onSearchChange: (v: string) => void;
  onConfirm: (ids: string[]) => void; onClose: () => void; saving: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(existingCandidates.map((c) => c.user_id).filter((id): id is string => !!id))
  );
  function toggle(userId: string) {
    if (!userId) return;
    setSelected((prev) => { const n = new Set(prev); n.has(userId) ? n.delete(userId) : n.add(userId); return n; });
  }
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]">
          <div className="px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                Set Candidates — {positionName}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-400">{selected.size} selected · INV-05 getStaff</p>
          </div>
          <div className="px-6 py-3 border-b border-slate-50 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={search} onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
              {staffLoading && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {staffPool.length === 0 && !staffLoading ? (
              <p className="py-10 text-center text-slate-400 text-sm">No staff members found.</p>
            ) : staffPool.filter((m) => !!m.user_id).map((m: StaffMember) => {
              const isSel = selected.has(m.user_id);
              return (
                <button key={m.user_id} onClick={() => toggle(m.user_id)}
                  className={cn("w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors",
                    isSel ? "bg-emerald-50/60" : "hover:bg-slate-50/60")}>
                  <StaffAvatar member={m} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#131b2e] truncate">{m.name}</p>
                    <p className="text-xs text-slate-400 truncate">{m.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-[#064e3b] bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">{m.role_name}</span>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    isSel ? "bg-[#064e3b] border-[#064e3b]" : "border-slate-300")}>
                    {isSel && <CheckCircle2 size={11} className="text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <p className="text-xs text-slate-400">{selected.size} candidate{selected.size !== 1 ? "s" : ""} selected</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={() => onConfirm(Array.from(selected).filter(Boolean))} disabled={saving}
                className="inline-flex items-center gap-2 bg-[#064e3b] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {saving ? "Saving…" : "Set Candidates"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Role Mapping Modal — GOV-01 + PERM-01 ───────────────────────────────────
function RoleMappingModal({
  positionName, templateList, permLoading, onConfirm, onClose, saving,
}: {
  positionName: string; templateList: RoleTemplate[]; permLoading: boolean;
  onConfirm: (templateId: string, notes: string) => void; onClose: () => void; saving: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState("");
  const active = templateList.find((t) => t.id === selectedId) ?? null;
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Map Role — {positionName}
                </h3>
                <p className="text-xs text-slate-400">GOV-01 · Binds a role template to this position</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Role Template <span className="text-red-400">*</span>
              </label>
              {permLoading && templateList.length === 0 ? (
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {templateList.map((t: RoleTemplate) => (
                    <button key={t.id} onClick={() => setSelectedId(t.id)}
                      className={cn("w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-all",
                        selectedId === t.id
                          ? "bg-[#064e3b] text-white border-[#064e3b]"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:border-[#064e3b]/30")}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="flex items-center gap-1.5"><ShieldCheck size={11} /> {t.name}</span>
                        <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                          selectedId === t.id ? "bg-white/20 text-white/70" : "bg-slate-200 text-slate-500")}>
                          {t.is_system ? "System" : "Custom"}
                        </span>
                      </div>
                      <p className={cn("text-[10px] font-normal", selectedId === t.id ? "text-white/70" : "text-slate-400")}>
                        {t.description}
                      </p>
                      {selectedId === t.id && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.permissions.slice(0, 4).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 bg-white/15 text-white/80 rounded text-[9px] font-mono">{s}</span>
                          ))}
                          {t.permissions.length > 4 && <span className="text-[9px] text-white/50">+{t.permissions.length - 4} more</span>}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason or context for this role mapping…" rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={() => selectedId && onConfirm(selectedId, notes)} disabled={!selectedId || saving}
                className="inline-flex items-center gap-2 bg-[#064e3b] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                {saving ? "Mapping…" : "Map Role"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Lock Slate Modal — ELS-05 ────────────────────────────────────────────────
function LockSlateModal({ slate, onConfirm, onClose, saving }: {
  slate: SlateData; onConfirm: (days: number) => void; onClose: () => void; saving: boolean;
}) {
  const [days, setDays] = useState(14);
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-amber-600" />
          </div>
          <h3 className="text-base font-bold text-center text-[#131b2e] mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Lock Slate</h3>
          <p className="text-sm text-center text-slate-500 mb-5">"{slate.label}" — {slate.term_start}–{slate.term_end}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
            <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Locking publishes this slate for voting. All positions and candidates will be frozen. This cannot be undone.</p>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Voting open for (days)</label>
            <input type="number" value={days} min={1} max={90} onChange={(e) => setDays(Number(e.target.value))}
              className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button onClick={() => onConfirm(days)} disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              {saving ? "Locking…" : "Confirm Lock"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SlateManagementPage() {
  const { activeMosque, isHydrating } = useMosque();
  const masjidId = isHydrating ? null : (activeMosque?.id ?? null);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    slates, slateDetail, positionDetail,
    loading: elLoading, error: elError,
    getSlates, getSlateDetail, createSlate,
    addPosition, getPositionDetail, updatePosition,
    setCandidates, lockSlate, mapElectionRole,
    clearError: clearElError, clearSlateDetail,
  } = useElections();

  const {
    staff, loading: staffLoading, error: staffError,
    getStaff, clearError: clearStaffError,
  } = useStaff();

  const {
    roleTemplates, loading: permLoading, error: permError,
    getRoleTemplates, clearError: clearPermError,
  } = usePermissions(masjidId ?? "");

  const loading  = elLoading || staffLoading || permLoading;
  const error    = elError   || staffError   || permError;
  const clearError = useCallback(() => { clearElError(); clearStaffError(); clearPermError(); },
    [clearElError, clearStaffError, clearPermError]);

  // ── View state ─────────────────────────────────────────────────────────────
  const [selectedSlateId,   setSelectedSlateId]   = useState<string | null>(null);
  const [focusedPositionId, setFocusedPositionId] = useState<string | null>(null);

  // Create slate form
  const [showCreateSlate, setShowCreateSlate] = useState(false);
  const [newSlateLabel,   setNewSlateLabel]   = useState("");
  const [newSlateStart,   setNewSlateStart]   = useState<number>(new Date().getFullYear());
  const [newSlateEnd,     setNewSlateEnd]     = useState<number>(new Date().getFullYear() + 1);

  // Add position form
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newPosName,      setNewPosName]      = useState("");
  const [newPosStart,     setNewPosStart]     = useState<number>(new Date().getFullYear());
  const [newPosEnd,       setNewPosEnd]       = useState<number>(new Date().getFullYear() + 1);
  const [newPosTemplateId, setNewPosTemplateId] = useState<string>("");

  // Edit position inline
  const [editingPosId,  setEditingPosId]  = useState<string | null>(null);
  const [editPosName,   setEditPosName]   = useState("");
  const [editPosTemplateId, setEditPosTemplateId] = useState<string>("");

  // Candidate picker
  const [candidatePosId,  setCandidatePosId]  = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");

  // Role mapping
  const [mappingPosId,    setMappingPosId]    = useState<string | null>(null);
  const [mappedPositions, setMappedPositions] = useState<Record<string, MapElectionRoleData>>({});

  // Lock modal
  const [lockingSlateId, setLockingSlateId] = useState<string | null>(null);
  const [lockedSlates,   setLockedSlates]   = useState<Record<string, LockSlateData>>({});

  // ─── Data loading ──────────────────────────────────────────────────────────

  // ELS-06
  useEffect(() => {
    if (!masjidId) return;
    getSlates(masjidId, { page: 1, limit: 50 });
  }, [masjidId, getSlates]);

  // ELS-07 when selection changes
  useEffect(() => {
    if (!masjidId || !selectedSlateId) return;
    getSlateDetail(masjidId, selectedSlateId);
    setFocusedPositionId(null);
    return () => clearSlateDetail();
  }, [masjidId, selectedSlateId, getSlateDetail, clearSlateDetail]);

  // Auto-select first slate
  useEffect(() => {
    const first = slateList[0];
    if (first && !selectedSlateId) setSelectedSlateId(first.slate_id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slates]);

  // INV-05: search-driven staff pool
  useEffect(() => {
    if (!masjidId) return;
    getStaff(masjidId, { search: candidateSearch.trim() || undefined, page: 1, limit: 30 });
  }, [masjidId, candidateSearch, getStaff]);

  // PERM-01: role templates
  useEffect(() => {
    if (!masjidId) return;
    getRoleTemplates({ page: 1, limit: 50 });
  }, [masjidId, getRoleTemplates]);

  useEffect(() => {
    if (!masjidId || !selectedSlateId || !focusedPositionId) return;
    getPositionDetail(masjidId, selectedSlateId, focusedPositionId);
  }, [masjidId, selectedSlateId, focusedPositionId, getPositionDetail]);

  // ─── Derived (declared before hooks that depend on them) ──────────────────
  const templateList: RoleTemplate[] = (roleTemplates?.data ?? []) as RoleTemplate[];

  // Auto-select first template when loaded
  useEffect(() => {
    if (templateList.length > 0 && !newPosTemplateId) {
      setNewPosTemplateId(templateList[0].id);
    }
  }, [templateList, newPosTemplateId]);

  // ─── Remaining derived ────────────────────────────────────────────────────
  const slateList: SlateData[]           = (slates?.data ?? []) as SlateData[];
  const activeSlate: SlateDetail | null  = selectedSlateId ? (slateDetail?.data as SlateDetail ?? null) : null;
  const positions: SlatePositionDetail[] = activeSlate?.positions ?? [];
  const activePos: PositionDetail | null = focusedPositionId ? (positionDetail?.data as PositionDetail ?? null) : null;
  const staffPool: StaffMember[]         = (staff?.data ?? []) as StaffMember[];
  const pagination                       = slates?.pagination;

  const candidatePosition = positions.find((p) => p.position_id === candidatePosId) ?? null;
  const mappingPosition   = positions.find((p) => p.position_id === mappingPosId)   ?? null;
  const lockingSlate      = slateList.find((s) => s.slate_id === lockingSlateId)    ?? null;

  const totalPositions    = positions.length;
  const posWithCandidates = positions.filter((p) => p.candidate_count > 0).length;
  const posRoleMapped     = Object.keys(mappedPositions).filter((id) => positions.some((p) => p.position_id === id)).length;
  const allReadyToLock    = totalPositions > 0 && posWithCandidates === totalPositions;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  // ELS-01
  const handleCreateSlate = useCallback(async () => {
    if (!masjidId || !newSlateLabel.trim()) return;
    const res = await createSlate(masjidId, { label: newSlateLabel.trim(), term_start: newSlateStart, term_end: newSlateEnd });
    if (res) { setShowCreateSlate(false); setNewSlateLabel(""); setSelectedSlateId(res.data.slate_id); }
  }, [masjidId, newSlateLabel, newSlateStart, newSlateEnd, createSlate]);

  // ELS-02
  const handleAddPosition = useCallback(async () => {
    if (!masjidId || !selectedSlateId || !newPosName.trim()) return;
    // Derive role_bundle from selected template, fallback to executive_admin
    const selectedTemplate = templateList.find((t) => t.id === newPosTemplateId);
    const roleBundle: RoleBundle = nameToRoleBundle(selectedTemplate?.name ?? "");
    const res = await addPosition(masjidId, selectedSlateId, {
      position_name: newPosName.trim(),
      role_bundle: roleBundle,
      term_start: newPosStart,
      term_end: newPosEnd,
    });
    if (res) { setShowAddPosition(false); setNewPosName(""); }
  }, [masjidId, selectedSlateId, newPosName, newPosTemplateId, newPosStart, newPosEnd, addPosition, templateList]);

  // ELS-03
  const handleUpdatePosition = useCallback(async () => {
    if (!masjidId || !selectedSlateId || !editingPosId) return;
    const selectedTemplate = templateList.find((t) => t.id === editPosTemplateId);
    const roleBundle: RoleBundle = nameToRoleBundle(selectedTemplate?.name ?? "");
    const res = await updatePosition(masjidId, selectedSlateId, editingPosId, {
      position_name: editPosName,
      role_bundle: roleBundle,
    });
    if (res) setEditingPosId(null);
  }, [masjidId, selectedSlateId, editingPosId, editPosName, editPosTemplateId, updatePosition, templateList]);

  // ELS-04
  const handleSetCandidates = useCallback(async (ids: string[]) => {
    if (!masjidId || !selectedSlateId || !candidatePosId) return;
    const res = await setCandidates(masjidId, selectedSlateId, candidatePosId, ids);
    if (res) { setCandidatePosId(null); setCandidateSearch(""); }
  }, [masjidId, selectedSlateId, candidatePosId, setCandidates]);

  // ELS-05
  const handleLockSlate = useCallback(async (days: number) => {
    if (!masjidId || !lockingSlateId) return;
    const res = await lockSlate(masjidId, lockingSlateId, { deadline_days: days, confirm_lock: true });
    if (res) { setLockedSlates((p) => ({ ...p, [lockingSlateId]: res.data })); setLockingSlateId(null); }
  }, [masjidId, lockingSlateId, lockSlate]);

  // GOV-01
  const handleMapRole = useCallback(async (templateId: string, notes: string) => {
    if (!masjidId || !mappingPosId) return;
    const res = await mapElectionRole(masjidId, mappingPosId, { role_template_id: templateId, notes: notes || undefined });
    if (res) { setMappedPositions((p) => ({ ...p, [mappingPosId]: res.data })); setMappingPosId(null); }
  }, [masjidId, mappingPosId, mapElectionRole]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
      <AnimatePresence>
        {error && <ErrorBanner message={error} onDismiss={clearError} />}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Elections · Admin</p>
          <h1 className="text-3xl font-extrabold text-[#131b2e] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            Slate & Selection Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Mosque:{" "}
            {isHydrating
              ? <span className="inline-block w-24 h-3 bg-slate-200 rounded animate-pulse align-middle" />
              : <span className="font-semibold text-[#003527]">{activeMosque?.name ?? "—"}</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (masjidId) getSlates(masjidId, { page: 1, limit: 50 }); }}
            disabled={loading || !masjidId}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          </button>
          <button onClick={() => setShowCreateSlate(true)} disabled={!masjidId}
            className="inline-flex items-center gap-2 bg-[#064e3b] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#043d2f] disabled:opacity-50">
            <Plus size={14} /> New Slate
          </button>
        </div>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <Award size={16} />,       label: "Total Slates",      value: pagination?.total ?? slateList.length, accent: "#064e3b" },
          { icon: <Users size={16} />,       label: "Positions",          value: totalPositions,                        accent: "#1d4ed8" },
          { icon: <CheckCircle2 size={16} />,label: "Candidates Set",     value: posWithCandidates,                     accent: "#7c3aed" },
          { icon: <ShieldCheck size={16} />, label: "Roles Mapped",      value: posRoleMapped,                         accent: "#b45309" },
        ].map((s, i) => (
          <motion.div key={s.label} variants={fadeUp} initial="hidden" animate="visible" custom={i + 2}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                 style={{ backgroundColor: s.accent }}>{s.icon}</div>
            <div>
              <p className="text-xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                {elLoading && !slates ? <span className="inline-block w-8 h-5 bg-slate-100 rounded animate-pulse" /> : s.value}
              </p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Slates list */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}
          className="lg:col-span-4 flex flex-col gap-4">

          {/* ELS-01 create slate form */}
          <AnimatePresence>
            {showCreateSlate && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-white rounded-2xl border border-[#064e3b]/30 shadow-sm p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>New Slate — ELS-01</h3>
                  <input type="text" value={newSlateLabel} onChange={(e) => setNewSlateLabel(e.target.value)}
                    placeholder="Slate label (e.g. 2026–2027 Executive Board)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="number" value={newSlateStart} onChange={(e) => setNewSlateStart(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                    </div>
                    <span className="self-center text-slate-300 font-bold text-sm">→</span>
                    <div className="relative flex-1">
                      <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="number" value={newSlateEnd} onChange={(e) => setNewSlateEnd(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateSlate} disabled={!newSlateLabel.trim() || elLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#064e3b] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                      {elLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create Slate
                    </button>
                    <button onClick={() => setShowCreateSlate(false)} className="px-3 py-2.5 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ELS-06 slate list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Slates</h2>
              <span className="text-xs text-slate-400">{pagination?.total ?? slateList.length} total</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
              {elLoading && slateList.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                      <div className="flex-1 space-y-2"><div className="h-3.5 bg-slate-100 rounded w-3/4" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
                    </div>
                  ))
                : slateList.length === 0
                ? <div className="py-12 text-center text-slate-400 text-sm">{!masjidId ? "Select a mosque." : "No slates yet."}</div>
                : slateList.map((s: SlateData) => {
                    const sessionLocked = !!lockedSlates[s.slate_id];
                    const isSelected = selectedSlateId === s.slate_id;
                    return (
                      <button key={s.slate_id} onClick={() => setSelectedSlateId(s.slate_id)}
                        className={cn("w-full text-left px-5 py-4 flex items-center gap-3 transition-colors",
                          isSelected ? "bg-[#f0faf5]" : "hover:bg-slate-50/60")}>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          s.status === "locked" || sessionLocked ? "bg-amber-50" : "bg-emerald-50")}>
                          {s.status === "locked" || sessionLocked ? <Lock size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-emerald-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#131b2e] truncate">{s.label}</p>
                          <p className="text-xs text-slate-400">{s.term_start}–{s.term_end}{s.position_count !== undefined && ` · ${s.position_count} positions`}</p>
                          {(s.locked_at || sessionLocked) && (
                            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                              Locked {s.locked_at ? formatDate(s.locked_at) : "just now"}
                              {lockedSlates[s.slate_id]?.voting_deadline && <> · Votes due {formatDate(lockedSlates[s.slate_id].voting_deadline)}</>}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <SlateBadge status={sessionLocked ? "locked" : s.status} />
                          {isSelected && <ChevronRight size={14} className="text-[#064e3b]" />}
                        </div>
                      </button>
                    );
                  })
              }
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Slate detail */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}
          className="lg:col-span-8 flex flex-col gap-5">
          <AnimatePresence mode="wait">
            {!selectedSlateId ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-24 text-center">
                <Award size={36} className="text-slate-200 mb-3" />
                <p className="text-slate-400 font-semibold text-sm">Select a slate to view details</p>
              </motion.div>
            ) : (
              <motion.div key={selectedSlateId} variants={slideRight} initial="hidden" animate="visible" exit="exit"
                className="flex flex-col gap-5">

                {/* ELS-07 slate header */}
                {elLoading && !activeSlate ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
                    <div className="h-6 bg-slate-100 rounded w-64 mb-2" />
                    <div className="h-4 bg-slate-100 rounded w-40" />
                  </div>
                ) : activeSlate ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                            {activeSlate.label}
                          </h2>
                          <SlateBadge status={lockedSlates[activeSlate.slate_id] ? "locked" : activeSlate.status} />
                        </div>
                        <p className="text-sm text-slate-500">
                          Term: {activeSlate.term_start}–{activeSlate.term_end}
                          {" · "}Created {formatDate(activeSlate.created_at)}
                          {activeSlate.locked_at && <> · Locked {formatDate(activeSlate.locked_at)}</>}
                        </p>
                      </div>
                      {/* ELS-05 lock button */}
                      {activeSlate.status !== "locked" && !lockedSlates[activeSlate.slate_id] && (
                        <div className="flex items-center gap-2">
                          {!allReadyToLock && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Info size={12} /> {posWithCandidates}/{totalPositions} positions ready
                            </span>
                          )}
                          <button onClick={() => setLockingSlateId(activeSlate.slate_id)}
                            disabled={!allReadyToLock || loading}
                            className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                              allReadyToLock && !loading ? "bg-amber-500 text-white hover:bg-amber-400" : "bg-slate-100 text-slate-400 cursor-not-allowed")}>
                            <Lock size={13} /> Lock Slate
                          </button>
                        </div>
                      )}
                      {lockedSlates[activeSlate.slate_id] && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
                          <Lock size={14} className="text-amber-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-700">Slate locked successfully</p>
                            <p className="text-[10px] text-amber-600">
                              {lockedSlates[activeSlate.slate_id].positions_locked} positions locked
                              {" · "}Votes due {formatDate(lockedSlates[activeSlate.slate_id].voting_deadline)}
                              {" · "}Audit: <span className="font-mono">{lockedSlates[activeSlate.slate_id].audit_event_id}</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-50">
                      {[
                        { label: "Positions",       value: totalPositions },
                        { label: "With Candidates", value: posWithCandidates },
                        { label: "Roles Mapped",    value: posRoleMapped },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <p className="text-2xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>{s.value}</p>
                          <p className="text-[11px] text-slate-400">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* ELS-02 add position */}
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Positions ({totalPositions})
                  </h3>
                  {activeSlate?.status !== "locked" && !lockedSlates[activeSlate?.slate_id ?? ""] && (
                    <button onClick={() => setShowAddPosition((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064e3b] bg-[#064e3b]/10 px-3 py-1.5 rounded-full hover:bg-[#064e3b]/20">
                      <Plus size={11} /> Add Position
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showAddPosition && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="bg-white rounded-2xl border border-[#064e3b]/20 shadow-sm p-5 space-y-4">
                        <h4 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Add Position — ELS-02</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Position Name *</label>
                            <input type="text" value={newPosName} onChange={(e) => setNewPosName(e.target.value)}
                              placeholder="e.g., Masjid President, Head of Finance"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Start Year</label>
                            <input type="number" value={newPosStart} onChange={(e) => setNewPosStart(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">End Year</label>
                            <input type="number" value={newPosEnd} onChange={(e) => setNewPosEnd(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Role Template (PERM-01)</label>
                            <select value={newPosTemplateId} onChange={(e) => setNewPosTemplateId(e.target.value)}
                              disabled={templateList.length === 0}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 disabled:opacity-50">
                              {templateList.length === 0
                                ? <option value="">Loading templates…</option>
                                : templateList.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))
                              }
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setShowAddPosition(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                          <button onClick={handleAddPosition} disabled={!newPosName.trim() || elLoading}
                            className="inline-flex items-center gap-2 bg-[#064e3b] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                            {elLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Position
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ELS-07 positions list */}
                <div className="space-y-4">
                  {elLoading && positions.length === 0
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                          <div className="h-5 bg-slate-100 rounded w-48 mb-2" /><div className="h-3.5 bg-slate-100 rounded w-32" />
                        </div>
                      ))
                    : positions.length === 0
                    ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No positions yet. Add one above.</div>
                    : positions.map((pos: SlatePositionDetail) => {
                        const isEditing   = editingPosId === pos.position_id;
                        const isFocused   = focusedPositionId === pos.position_id;
                        const roleMapped  = mappedPositions[pos.position_id];
                        const isSlotLocked = activeSlate?.status === "locked" || !!lockedSlates[activeSlate?.slate_id ?? ""];

                        return (
                          <motion.div key={pos.position_id} layout
                            className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden transition-all",
                              isFocused ? "border-[#064e3b]/30" : "border-slate-100")}>
                            <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="space-y-2.5">
                                    <input value={editPosName} onChange={(e) => setEditPosName(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                                    <select value={editPosTemplateId} onChange={(e) => setEditPosTemplateId(e.target.value)}
                                      disabled={templateList.length === 0}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 disabled:opacity-50">
                                      {templateList.length === 0
                                        ? <option value="">Loading templates…</option>
                                        : templateList.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                          ))
                                      }
                                    </select>
                                    <div className="flex gap-2">
                                      <button onClick={handleUpdatePosition} disabled={elLoading}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#064e3b] text-white rounded-xl text-xs font-bold disabled:opacity-50">
                                        {elLoading ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                                      </button>
                                      <button onClick={() => setEditingPosId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-base font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>{pos.position_name}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <PositionBadge status={pos.status} />
                                      <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">{roleBundleLabel(pos.role_bundle, templateList)}</span>
                                      <span className="text-[10px] text-slate-400">{pos.term_start}–{pos.term_end}</span>
                                      {roleMapped && (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-[#064e3b] bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                                          <Link2 size={9} /> {roleMapped.role_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {!isEditing && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* ELS-08: expand */}
                                  <button onClick={() => setFocusedPositionId(isFocused ? null : pos.position_id)}
                                    className={cn("p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors", isFocused && "text-[#064e3b] bg-emerald-50")}
                                    title="View position detail (ELS-08)">
                                    <ChevronDown size={14} className={cn("transition-transform", isFocused && "rotate-180")} />
                                  </button>
                                  {/* ELS-03: edit */}
                                  {!isSlotLocked && (
                                    <button onClick={() => {
                                      setEditingPosId(pos.position_id);
                                      setEditPosName(pos.position_name);
                                      // Find template that matches role_bundle, default to first
                                      const match = templateList.find((t) => nameToRoleBundle(t.name) === pos.role_bundle);
                                      setEditPosTemplateId(match?.id ?? templateList[0]?.id ?? "");
                                    }}
                                      className="p-2 rounded-xl text-slate-400 hover:text-[#064e3b] hover:bg-emerald-50 transition-colors" title="Edit (ELS-03)">
                                      <Edit3 size={14} />
                                    </button>
                                  )}
                                  {/* ELS-04: set candidates */}
                                  {!isSlotLocked && (
                                    <button onClick={() => { setCandidatePosId(pos.position_id); setCandidateSearch(""); }}
                                      className={cn("p-2 rounded-xl transition-colors",
                                        pos.candidate_count > 0 ? "text-[#064e3b] bg-emerald-50 hover:bg-emerald-100" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")}
                                      title="Set candidates (ELS-04)">
                                      <Users size={14} />
                                    </button>
                                  )}
                                  {/* GOV-01: map role */}
                                  {!isSlotLocked && (
                                    <button onClick={() => setMappingPosId(pos.position_id)}
                                      className={cn("p-2 rounded-xl transition-colors",
                                        roleMapped ? "text-[#064e3b] bg-emerald-50 hover:bg-emerald-100" : "text-slate-400 hover:text-purple-600 hover:bg-purple-50")}
                                      title="Map role template (GOV-01)">
                                      <Link2 size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Candidates preview */}
                            {pos.candidate_count > 0 && (
                              <div className="px-6 pb-4 flex flex-wrap gap-1.5">
                                {pos.candidates.map((c: CandidateRef, ci) => <CandidatePill key={c.user_id ?? `candidate-${ci}`} candidate={c} />)}
                                {pos.candidate_count > pos.candidates.length && (
                                  <span className="text-xs text-slate-400 self-center font-semibold">+{pos.candidate_count - pos.candidates.length} more</span>
                                )}
                              </div>
                            )}
                            {pos.candidate_count === 0 && !isEditing && (
                              <div className="px-6 pb-4">
                                <button onClick={() => { setCandidatePosId(pos.position_id); setCandidateSearch(""); }}
                                  disabled={isSlotLocked}
                                  className="text-xs text-slate-400 hover:text-[#064e3b] flex items-center gap-1.5 disabled:opacity-40 transition-colors">
                                  <Plus size={11} /> Add candidates via INV-05 getStaff
                                </button>
                              </div>
                            )}

                            {/* ELS-08: expanded position detail */}
                            <AnimatePresence>
                              {isFocused && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                  className="overflow-hidden border-t border-slate-50">
                                  {elLoading && !activePos ? (
                                    <div className="p-5 animate-pulse space-y-2">
                                      <div className="h-3.5 bg-slate-100 rounded w-40" /><div className="h-3 bg-slate-100 rounded w-56" />
                                    </div>
                                  ) : activePos ? (
                                    <div className="p-5 bg-slate-50/50">
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">ELS-08 Full Position Detail</p>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                        {[
                                          { label: "Status",     value: (activePos.status ?? "").replace("_", " ") || "—" },
                                          { label: "Role Bundle",value: roleBundleLabel(activePos.role_bundle, templateList) },
                                          { label: "Term",       value: activePos.term_start && activePos.term_end ? `${activePos.term_start}–${activePos.term_end}` : "—" },
                                          { label: "Candidates", value: String(activePos.candidate_count ?? 0) },
                                        ].map((f) => (
                                          <div key={f.label}>
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{f.label}</p>
                                            <p className="text-xs font-semibold text-[#131b2e] mt-0.5 capitalize">{f.value}</p>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex gap-6 mb-3">
                                        <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Created</p><p className="text-xs text-slate-500">{activePos.created_at ? formatDate(activePos.created_at) : "—"}</p></div>
                                        <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Updated</p><p className="text-xs text-slate-500">{activePos.updated_at ? formatDate(activePos.updated_at) : "—"}</p></div>
                                      </div>
                                      {(activePos.candidates ?? []).length > 0 && (
                                        <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2">All Candidates</p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {(activePos.candidates ?? []).map((c: CandidateRef, ci) => <CandidatePill key={c.user_id ?? `pos-candidate-${ci}`} candidate={c} />)}
                                          </div>
                                        </div>
                                      )}
                                      {roleMapped && (
                                        <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Role Mapped — GOV-01</p>
                                          <p className="text-xs font-semibold text-[#064e3b]">{roleMapped.role_name}</p>
                                          <p className="text-[10px] text-emerald-600/70 mt-0.5">
                                            Mapped {formatDate(roleMapped.mapped_at)} · Template: <span className="font-mono">{roleMapped.role_template_id}</span>
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-5 text-center text-slate-400 text-xs">Loading position detail…</div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })
                  }
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ELS-04 Candidate picker modal */}
      <AnimatePresence>
        {candidatePosId && candidatePosition && (
          <CandidatePickerModal
            positionName={candidatePosition.position_name}
            existingCandidates={candidatePosition.candidates}
            staffPool={staffPool}
            staffLoading={staffLoading}
            search={candidateSearch}
            onSearchChange={setCandidateSearch}
            onConfirm={handleSetCandidates}
            onClose={() => { setCandidatePosId(null); setCandidateSearch(""); }}
            saving={elLoading}
          />
        )}
      </AnimatePresence>

      {/* GOV-01 Role mapping modal */}
      <AnimatePresence>
        {mappingPosId && mappingPosition && (
          <RoleMappingModal
            positionName={mappingPosition.position_name}
            templateList={templateList}
            permLoading={permLoading}
            onConfirm={handleMapRole}
            onClose={() => setMappingPosId(null)}
            saving={elLoading}
          />
        )}
      </AnimatePresence>

      {/* ELS-05 Lock slate modal */}
      <AnimatePresence>
        {lockingSlateId && lockingSlate && (
          <LockSlateModal
            slate={lockingSlate}
            onConfirm={handleLockSlate}
            onClose={() => setLockingSlateId(null)}
            saving={elLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}