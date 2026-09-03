"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote, Calendar, Users, ShieldCheck, Search, X, Plus,
  ChevronRight, CheckCircle2, Clock, Lock, ArrowRight,
  Sparkles, FileText, AlertCircle, Loader2, RefreshCw, Edit3, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Hooks ────────────────────────────────────────────────────────────────────
import { useMosque }       from "@/context/MosqueContext";
import { useElections }    from "@/hooks/elections/useElections";
import { useStaff }        from "@/hooks/staff/useStaff";
import { usePermissions }  from "@/hooks/permissions/usePermissions";

// ─── Types ────────────────────────────────────────────────────────────────────
import type {
  RoleBundle,
  SlateData,
  SlatePositionDetail,
  SlateStatus,
  PositionStatus,
} from "@/types/elections";

import type {
  StaffMember,
  RoleTemplate,
} from "@/types/api";

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

const chipVariants = {
  hidden:  { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 22 } },
  exit:    { opacity: 0, scale: 0.7, transition: { duration: 0.15 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive initials from a full name for the avatar fallback */
function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Map a RoleTemplate.name to the closest RoleBundle enum value.
 * The backend RoleBundle enum: "executive_admin" | "treasurer" |
 * "secretary" | "general_council_member"
 * We do a loose match so custom templates degrade gracefully.
 */
function nameToRoleBundle(name: string): RoleBundle {
  const n = name.toLowerCase();
  if (n.includes("treasurer"))                          return "treasurer";
  if (n.includes("secretary"))                          return "secretary";
  if (n.includes("council") || n.includes("general"))  return "general_council_member";
  return "executive_admin"; // safe default
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepIndicator({ step, current }: { step: number; current: number }) {
  const done   = current > step;
  const active = current === step;
  return (
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300",
      done   ? "bg-[#064e3b] border-[#064e3b] text-white"  :
      active ? "bg-white border-[#064e3b] text-[#064e3b]"  :
               "bg-white border-slate-200 text-slate-400"
    )}>
      {done ? <CheckCircle2 size={14} /> : step}
    </div>
  );
}

function SlateStatusBadge({ status }: { status: SlateStatus | PositionStatus | string }) {
  const map: Record<string, string> = {
    open:          "bg-emerald-50 text-emerald-700 border-emerald-200",
    locked:        "bg-amber-50 text-amber-600 border-amber-200",
    pending_draft: "bg-slate-50 text-slate-500 border-slate-200",
    active_setup:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const icons: Record<string, React.ReactNode> = {
    open:          <CheckCircle2 size={10} />,
    locked:        <Lock size={10} />,
    pending_draft: <Clock size={10} />,
    active_setup:  <CheckCircle2 size={10} />,
  };
  const labels: Record<string, string> = {
    open:          "Open",
    locked:        "Locked",
    pending_draft: "Draft",
    active_setup:  "Active Setup",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
      map[status] ?? map.pending_draft
    )}>
      {icons[status] ?? <Clock size={10} />}
      {labels[status] ?? status}
    </span>
  );
}

/** Staff avatar — real avatar_url with initials fallback */
function StaffAvatar({ member, size = "sm" }: { member: StaffMember; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-9 h-9 text-xs" : "w-7 h-7 text-[10px]";
  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.name}
        className={cn("rounded-full object-cover shrink-0", dim)}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className={cn(
      "rounded-full bg-[#064e3b] flex items-center justify-center text-white font-bold shrink-0",
      dim
    )}>
      {toInitials(member.name)}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ElectionSetupPage() {
  // ── Context ────────────────────────────────────────────────────────────────
  const { activeMosque, isHydrating } = useMosque();
  const masjidId = isHydrating ? null : (activeMosque?.id ?? null);

  // ── useElections ──────────────────────────────────────────────────────────
  const {
    slates,
    slateDetail,
    loading:       electionsLoading,
    error:         electionsError,
    getSlates,
    getSlateDetail,
    createSlate,
    addPosition,
    getPositionDetail,
    updatePosition,
    setCandidates,
    lockSlate,
    mapElectionRole,
    clearError:    clearElectionsError,
    clearSlateDetail,
  } = useElections();

  // ── useStaff — INV-05 getStaff for candidate pool ────────────────────────
  const {
    staff,
    loading: staffLoading,
    error:   staffError,
    getStaff,
    clearError: clearStaffError,
  } = useStaff();

  // ── usePermissions — PERM-01 getRoleTemplates for role picker ─────────────
  // usePermissions takes masjidId as constructor arg; pass "" when null to
  // satisfy the string param — effects guard on masjidId before any call fires.
  const {
    roleTemplates,
    loading: permLoading,
    error:   permError,
    getRoleTemplates,
    clearError: clearPermError,
  } = usePermissions(masjidId ?? "");

  const loading = electionsLoading || staffLoading || permLoading;
  const error   = electionsError   || staffError   || permError;

  const clearError = useCallback(() => {
    clearElectionsError();
    clearStaffError();
    clearPermError();
  }, [clearElectionsError, clearStaffError, clearPermError]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [positionName,       setPositionName]       = useState("");
  const [termStart,          setTermStart]          = useState<number>(new Date().getFullYear());
  const [termEnd,            setTermEnd]            = useState<number>(new Date().getFullYear() + 1);
  const [candidateSearch,    setCandidateSearch]    = useState("");

  /**
   * selectedRole — the RoleBundle enum value sent to ELS-02 / ELS-03.
   * We derive it from the selected RoleTemplate via nameToRoleBundle().
   */
  const [selectedRole,       setSelectedRole]       = useState<RoleBundle>("executive_admin");

  /**
   * selectedTemplateId — the real RoleTemplate.id used for GOV-01
   * (role_template_id) and displayed in the role picker UI.
   */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  /** Staff members chosen as candidates for the current position */
  const [selectedCandidates, setSelectedCandidates] = useState<StaffMember[]>([]);
  const [currentStep,        setCurrentStep]        = useState(1);

  // ── Slate creation form ───────────────────────────────────────────────────
  const [slateLabel,      setSlateLabel]      = useState("");
  const [slateTermStart,  setSlateTermStart]  = useState<number>(new Date().getFullYear());
  const [slateTermEnd,    setSlateTermEnd]    = useState<number>(new Date().getFullYear() + 1);
  const [showCreateSlate, setShowCreateSlate] = useState(false);

  // ── Active slate / position selection ─────────────────────────────────────
  const [activeSlateId,    setActiveSlateId]    = useState<string | null>(null);
  const [activePositionId, setActivePositionId] = useState<string | null>(null);

  // ── Inline position edit ──────────────────────────────────────────────────
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editPositionName,  setEditPositionName]  = useState("");
  const [editRoleBundle,    setEditRoleBundle]    = useState<RoleBundle>("executive_admin");

  // ── Lock confirmation ─────────────────────────────────────────────────────
  const [lockConfirm,  setLockConfirm]  = useState(false);
  const [deadlineDays, setDeadlineDays] = useState(14);

  // ─── Data loading ─────────────────────────────────────────────────────────

  // ELS-06: slates list
  useEffect(() => {
    if (!masjidId) return;
    getSlates(masjidId);
  }, [masjidId, getSlates]);

  // ELS-07: slate detail when selection changes
  useEffect(() => {
    if (!masjidId || !activeSlateId) return;
    getSlateDetail(masjidId, activeSlateId);
    return () => clearSlateDetail();
  }, [masjidId, activeSlateId, getSlateDetail, clearSlateDetail]);

  // Auto-select first slate
  useEffect(() => {
    const first = slates?.data?.[0] as SlateData | undefined;
    if (first && !activeSlateId) setActiveSlateId(first.slate_id);
  }, [slates, activeSlateId]);

  /**
   * INV-05: Load staff members as the candidate pool.
   * Re-fires when candidateSearch changes so results always reflect
   * what the admin is typing — search is delegated to the API.
   */
  useEffect(() => {
    if (!masjidId) return;
    getStaff(masjidId, {
      search: candidateSearch.trim() || undefined,
      page:   1,
      limit:  20,
    });
  }, [masjidId, candidateSearch, getStaff]);

  /**
   * PERM-01: Load role templates as the role picker source.
   * Fetches both system + custom templates (no type filter).
   */
  useEffect(() => {
    if (!masjidId) return;
    getRoleTemplates({ page: 1, limit: 50 });
  }, [masjidId, getRoleTemplates]);

  // Auto-select first template once loaded
  useEffect(() => {
    const first = roleTemplates?.data?.[0] as RoleTemplate | undefined;
    if (first && !selectedTemplateId) {
      setSelectedTemplateId(first.id);
      setSelectedRole(nameToRoleBundle(first.name));
    }
  }, [roleTemplates, selectedTemplateId]);

  // ─── Derived data ─────────────────────────────────────────────────────────

const rawSlates = slates?.data;
const slateList: SlateData[] = Array.isArray(rawSlates)
  ? (rawSlates as SlateData[])
  : Array.isArray((rawSlates as any)?.items)
    ? ((rawSlates as any).items as SlateData[])
    : [];
  const activeSlate                         = slateDetail?.data;
  const positions:    SlatePositionDetail[] = activeSlate?.positions ?? [];
  const mappedCount                         = positions.filter((p) => p.candidate_count > 0).length;

  // PERM-01 templates — typed as RoleTemplate[]
  const templateList: RoleTemplate[] = (roleTemplates?.data ?? []) as RoleTemplate[];

  // The currently selected template object (for the preview card)
  const activeTemplate = templateList.find((t) => t.id === selectedTemplateId) ?? null;

  // INV-05 staff list — excludes already selected candidates
  const staffPool: StaffMember[] = (staff?.data ?? []).filter(
    (m) => !selectedCandidates.find((c) => c.user_id === m.user_id)
  );

  const steps = ["Position Details", "Candidates", "Permissions", "Review"];

  // ─── Handlers ─────────────────────────────────────────────────────────────

  /** Select a role template from PERM-01 list and derive the RoleBundle */
  const handleSelectTemplate = useCallback((templateId: string) => {
    const tmpl = templateList.find((t) => t.id === templateId);
    setSelectedTemplateId(templateId);
    if (tmpl) setSelectedRole(nameToRoleBundle(tmpl.name));
  }, [templateList]);

  // ELS-01: Create slate
  const handleCreateSlate = useCallback(async () => {
    if (!masjidId || !slateLabel.trim()) return;
    const res = await createSlate(masjidId, {
      label:      slateLabel.trim(),
      term_start: slateTermStart,
      term_end:   slateTermEnd,
    });
    if (res) {
      setShowCreateSlate(false);
      setSlateLabel("");
      setActiveSlateId((res.data as SlateData).slate_id);
    }
  }, [masjidId, slateLabel, slateTermStart, slateTermEnd, createSlate]);

  // ELS-02: Add position
  const handleAddPosition = useCallback(async () => {
    if (!masjidId || !activeSlateId || !positionName.trim()) return;
    const res = await addPosition(masjidId, activeSlateId, {
      position_name: positionName.trim(),
      role_bundle:   selectedRole,
      term_start:    termStart,
      term_end:      termEnd,
    });
    if (res) {
      setActivePositionId((res.data as any).position_id);
      setCurrentStep(2);
    }
  }, [masjidId, activeSlateId, positionName, selectedRole, termStart, termEnd, addPosition]);

  // ELS-08: View position detail
  const handleViewPosition = useCallback(async (posId: string) => {
    if (!masjidId || !activeSlateId) return;
    setActivePositionId(posId);
    await getPositionDetail(masjidId, activeSlateId, posId);
  }, [masjidId, activeSlateId, getPositionDetail]);

  // ELS-03: Update position
  const handleUpdatePosition = useCallback(async () => {
    if (!masjidId || !activeSlateId || !editingPositionId) return;
    const res = await updatePosition(masjidId, activeSlateId, editingPositionId, {
      position_name: editPositionName,
      role_bundle:   editRoleBundle,
    });
    if (res) setEditingPositionId(null);
  }, [masjidId, activeSlateId, editingPositionId, editPositionName, editRoleBundle, updatePosition]);

  /**
   * ELS-04: Set candidates — passes StaffMember.user_id[] to the API.
   * The IDs come directly from INV-05 getStaff response, no mock data.
   */
  const handleSetCandidates = useCallback(async () => {
    if (!masjidId || !activeSlateId || !activePositionId) return;
    await setCandidates(
      masjidId,
      activeSlateId,
      activePositionId,
      selectedCandidates.map((m) => m.user_id) // StaffMember.user_id
    );
    setCurrentStep(3);
  }, [masjidId, activeSlateId, activePositionId, selectedCandidates, setCandidates]);

  // ELS-05: Lock slate
  const handleLockSlate = useCallback(async () => {
    if (!masjidId || !activeSlateId) return;
    const res = await lockSlate(masjidId, activeSlateId, {
      deadline_days: deadlineDays,
      confirm_lock:  true,
    });
    if (res) setLockConfirm(false);
  }, [masjidId, activeSlateId, deadlineDays, lockSlate]);

  /**
   * GOV-01: Map role template to position.
   * role_template_id comes from PERM-01 selectedTemplateId — the real
   * RoleTemplate.id, not a hardcoded string.
   */
  const handleSubmit = useCallback(async () => {
    if (!masjidId || !activeSlateId) return;
    if (currentStep === 1) { await handleAddPosition(); return; }
    if (currentStep === 2) { await handleSetCandidates(); return; }
    if (currentStep === 3 && activePositionId && selectedTemplateId) {
      const res = await mapElectionRole(masjidId, activePositionId, {
        role_template_id: selectedTemplateId, // real PERM-01 RoleTemplate.id
        notes: `${positionName || "Position"} — ${termStart}–${termEnd}. Candidates: ${
          selectedCandidates.map((m) => m.name).join(", ")
        }.`,
      });
      if (res) setCurrentStep(4);
    }
  }, [
    masjidId, activeSlateId, currentStep, activePositionId, selectedTemplateId,
    handleAddPosition, handleSetCandidates,
    mapElectionRole, positionName, termStart, termEnd, selectedCandidates,
  ]);

  const canSubmit = positionName.trim().length > 0 && !loading && !!masjidId;

  const submitLabel = () => {
    if (loading)           return "Saving…";
    if (currentStep === 1) return "Save & Add Candidates";
    if (currentStep === 2) return "Set Candidates";
    if (currentStep === 3) return "Map Role & Continue";
    return "Done";
  };

  // Candidate selection helpers
  function addCandidate(m: StaffMember) {
    setSelectedCandidates((prev) => [...prev, m]);
    setCandidateSearch(""); // clear search so dropdown closes
  }
  function removeCandidate(userId: string) {
    setSelectedCandidates((prev) => prev.filter((m) => m.user_id !== userId));
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── Unified Error Banner (elections + staff + permissions) ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 flex-1">{error}</p>
              <button onClick={clearError}
                className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Breadcrumb ── */}
      <motion.nav variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <span className="hover:text-[#064e3b] cursor-pointer transition-colors">Elections</span>
        <ChevronRight size={13} />
        <span className="text-[#064e3b] font-semibold">New Position Setup</span>
      </motion.nav>

      {/* ── Page Header ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-[#131b2e] tracking-tight leading-tight mb-2"
                style={{ fontFamily: "Manrope, sans-serif" }}>
              Configure Election Position
            </h1>
            <p className="text-slate-500 max-w-xl text-sm leading-relaxed">
              Establish formal leadership roles for the {slateTermStart}–{slateTermEnd} governing term.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Sparkles size={12} /> Slate Open · {positions.length} position{positions.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => { if (masjidId) { getSlates(masjidId); getRoleTemplates({ page: 1, limit: 50 }); } }}
              disabled={loading || !masjidId}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#064e3b] disabled:opacity-40 transition-colors">
              <RefreshCw size={13} className={cn(loading && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Step Progress ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}
        className="flex items-center gap-0 mb-10 overflow-x-auto" role="list">
        {steps.map((label, i) => (
          <div key={label} role="listitem" className="flex items-center">
            <button onClick={() => setCurrentStep(i + 1)}
              className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#064e3b] rounded-lg p-1"
              aria-current={currentStep === i + 1 ? "step" : undefined}>
              <StepIndicator step={i + 1} current={currentStep} />
              <span className={cn("text-xs font-semibold whitespace-nowrap",
                currentStep === i + 1 ? "text-[#064e3b]" :
                currentStep >  i + 1 ? "text-slate-500" : "text-slate-300")}>
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn("w-8 h-px mx-2 rounded-full transition-colors duration-500",
                currentStep > i + 1 ? "bg-[#064e3b]" : "bg-slate-200")} />
            )}
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── Main Form Card ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Card Header */}
            <div className="px-8 py-6 border-b border-slate-50 bg-gradient-to-r from-slate-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#064e3b] flex items-center justify-center">
                  <Vote size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Position Details
                  </h2>
                  <p className="text-xs text-slate-400">Step {currentStep} of {steps.length}</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-50">

              {/* ── Step 1: Position Name ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
                className="flex flex-col sm:flex-row items-start gap-4 p-8 hover:bg-slate-50/40 transition-colors">
                <div className="sm:w-1/3">
                  <label htmlFor="pos-name" className="font-semibold text-sm text-[#131b2e] block mb-1"
                         style={{ fontFamily: "Manrope, sans-serif" }}>
                    Position Name
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">The formal title as it appears on ballots.</p>
                </div>
                <div className="sm:w-2/3 w-full">
                  <div className="relative">
                    <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="pos-name" type="text" value={positionName}
                      onChange={(e) => setPositionName(e.target.value)}
                      placeholder="e.g., President, Board Secretary"
                      className="w-full bg-[#f2f3ff] border border-transparent rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 transition-all"
                      aria-required="true" />
                  </div>
                </div>
              </motion.div>

              {/* ── Term Duration ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}
                className="flex flex-col sm:flex-row items-start gap-4 p-8 hover:bg-slate-50/40 transition-colors">
                <div className="sm:w-1/3">
                  <label className="font-semibold text-sm text-[#131b2e] block mb-1"
                         style={{ fontFamily: "Manrope, sans-serif" }}>Term Duration</label>
                  <p className="text-xs text-slate-400 leading-relaxed">Specify the active governance window.</p>
                </div>
                <div className="sm:w-2/3 w-full flex gap-3">
                  <div className="relative flex-1">
                    <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" value={termStart}
                      onChange={(e) => setTermStart(Number(e.target.value))}
                      placeholder="Start year"
                      className="w-full bg-[#f2f3ff] border border-transparent rounded-xl pl-8 pr-3 py-2.5 text-sm text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 transition-all" />
                  </div>
                  <span className="self-center text-slate-300 font-bold">→</span>
                  <div className="relative flex-1">
                    <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" value={termEnd}
                      onChange={(e) => setTermEnd(Number(e.target.value))}
                      placeholder="End year"
                      className="w-full bg-[#f2f3ff] border border-transparent rounded-xl pl-8 pr-3 py-2.5 text-sm text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 transition-all" />
                  </div>
                </div>
              </motion.div>

              {/* ── Step 2: Candidate Selection — INV-05 getStaff ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}
                className="flex flex-col sm:flex-row items-start gap-4 p-8 hover:bg-slate-50/40 transition-colors">
                <div className="sm:w-1/3">
                  <label htmlFor="cand-search" className="font-semibold text-sm text-[#131b2e] block mb-1"
                         style={{ fontFamily: "Manrope, sans-serif" }}>
                    Candidate Selection
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Search staff members by name or email.
                    Results come from{" "}
                    <span className="font-semibold text-[#064e3b]">INV-05 getStaff</span>.
                    {activePositionId && (
                      <span className="block text-[#064e3b] mt-1 font-semibold">
                        IDs submitted via ELS-04 on next step.
                      </span>
                    )}
                  </p>
                </div>
                <div className="sm:w-2/3 w-full space-y-3">

                  {/* Search input — delegates to getStaff({ search }) */}
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="cand-search" type="search" value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full bg-[#f2f3ff] border border-transparent rounded-xl pl-8 pr-10 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 transition-all" />
                    {staffLoading && (
                      <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                    )}
                  </div>

                  {/* INV-05 results dropdown — StaffMember.name, email, avatar_url, role_name */}
                  <AnimatePresence>
                    {candidateSearch && staffPool.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                        className="bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto"
                        role="listbox"
                      >
                        {staffPool.map((m: StaffMember) => (
                          <li key={m.user_id}>
                            <button onClick={() => addCandidate(m)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#f0faf5] transition-colors text-left">
                              <StaffAvatar member={m} size="sm" />
                              <div className="flex-1 min-w-0">
                                {/* StaffMember.name */}
                                <p className="font-semibold text-[#131b2e] truncate">{m.name}</p>
                                {/* StaffMember.email */}
                                <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                              </div>
                              {/* StaffMember.role_name */}
                              <span className="text-[10px] text-[#064e3b] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                                {m.role_name}
                              </span>
                              <Plus size={13} className="text-slate-300 shrink-0" />
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                    {/* No results state */}
                    {candidateSearch && !staffLoading && staffPool.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-400 text-center"
                      >
                        No staff members found matching "{candidateSearch}"
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Selected candidates chips */}
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {selectedCandidates.map((m: StaffMember) => (
                        <motion.div key={m.user_id}
                          variants={chipVariants} initial="hidden" animate="visible" exit="exit"
                          className="flex items-center gap-2 bg-[#b0f0d6]/40 border border-[#064e3b]/20 text-[#064e3b] px-3 py-1.5 rounded-full text-xs font-semibold">
                          <StaffAvatar member={m} size="sm" />
                          {/* StaffMember.name */}
                          <span>{m.name}</span>
                          <button onClick={() => removeCandidate(m.user_id)}
                            aria-label={`Remove ${m.name}`}
                            className="ml-0.5 hover:text-red-500 transition-colors">
                            <X size={11} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {selectedCandidates.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No candidates selected yet.</p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ── Step 3: Role Template — PERM-01 getRoleTemplates ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}
                className="flex flex-col sm:flex-row items-start gap-4 p-8 hover:bg-slate-50/40 transition-colors">
                <div className="sm:w-1/3">
                  <label className="font-semibold text-sm text-[#131b2e] block mb-1"
                         style={{ fontFamily: "Manrope, sans-serif" }}>
                    Role Template
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Permissions granted automatically to the winner. Sourced from{" "}
                    <span className="font-semibold text-[#064e3b]">PERM-01 getRoleTemplates</span>.
                    <span className="block text-[#064e3b] mt-1 font-semibold">
                      Template ID sent via GOV-01 on Step 3.
                    </span>
                  </p>
                </div>
                <div className="sm:w-2/3 w-full space-y-3">
                  {/* PERM-01 loading skeleton */}
                  {permLoading && templateList.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {templateList.map((tmpl: RoleTemplate) => (
                        <motion.button key={tmpl.id}
                          whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                          onClick={() => handleSelectTemplate(tmpl.id)}
                          aria-pressed={selectedTemplateId === tmpl.id}
                          className={cn(
                            "text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-all",
                            selectedTemplateId === tmpl.id
                              ? "bg-[#064e3b] text-white border-[#064e3b] shadow-sm"
                              : "bg-[#f2f3ff] text-slate-600 border-transparent hover:border-[#064e3b]/20"
                          )}>
                          <div className="flex items-center justify-between gap-1.5 mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck size={11} />
                              {/* RoleTemplate.name */}
                              <span>{tmpl.name}</span>
                            </div>
                            {/* RoleTemplate.is_system badge */}
                            {tmpl.is_system && (
                              <span className={cn(
                                "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                                selectedTemplateId === tmpl.id
                                  ? "bg-white/20 text-white/70"
                                  : "bg-slate-200 text-slate-500"
                              )}>
                                System
                              </span>
                            )}
                          </div>
                          {/* RoleTemplate.description */}
                          <p className={cn(
                            "text-[10px] font-normal leading-tight",
                            selectedTemplateId === tmpl.id ? "text-white/70" : "text-slate-400"
                          )}>
                            {tmpl.description}
                          </p>
                          {/* RoleTemplate.member_count */}
                          <p className={cn(
                            "text-[9px] mt-1",
                            selectedTemplateId === tmpl.id ? "text-white/50" : "text-slate-300"
                          )}>
                            {tmpl.member_count} member{tmpl.member_count !== 1 ? "s" : ""}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Active template preview — RoleTemplate.permissions[] */}
                  <AnimatePresence mode="wait">
                    {activeTemplate && (
                      <motion.div key={activeTemplate.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-[#f0faf5] border border-[#064e3b]/10">
                        <ShieldCheck size={15} className="text-[#064e3b] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#064e3b] mb-0.5">{activeTemplate.name}</p>
                          <p className="text-[11px] text-slate-500 mb-2">{activeTemplate.description}</p>
                          {/* Show first 6 permission scopes from RoleTemplate.permissions */}
                          <div className="flex flex-wrap gap-1">
                            {activeTemplate.permissions.slice(0, 6).map((scope) => (
                              <span key={scope}
                                className="px-1.5 py-0.5 bg-[#064e3b]/10 text-[#064e3b] rounded text-[9px] font-mono font-semibold">
                                {scope}
                              </span>
                            ))}
                            {activeTemplate.permissions.length > 6 && (
                              <span className="text-[9px] text-slate-400 font-semibold self-center">
                                +{activeTemplate.permissions.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* ── Step 4: Review & Lock — ELS-05 ── */}
              {currentStep === 4 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="p-8 space-y-4 bg-[#f0faf5]/40">
                  <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Review & Lock Slate
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Lock the slate to publish it for voting.
                    Calls ELS-05 with <code className="font-mono text-[#064e3b]">deadline_days</code> and{" "}
                    <code className="font-mono text-[#064e3b]">confirm_lock: true</code>.
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                      Voting deadline (days)
                    </label>
                    <input type="number" value={deadlineDays} min={1} max={90}
                      onChange={(e) => setDeadlineDays(Number(e.target.value))}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#064e3b]/30" />
                  </div>
                  {!lockConfirm ? (
                    <button onClick={() => setLockConfirm(true)} disabled={!activeSlateId || loading}
                      className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-amber-400 transition-colors">
                      <Lock size={13} /> Lock Slate
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-amber-700 font-semibold">Confirm? This cannot be undone.</span>
                      <button onClick={handleLockSlate} disabled={loading}
                        className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50">
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Yes, Lock
                      </button>
                      <button onClick={() => setLockConfirm(false)}
                        className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* ── Card Footer ── */}
            <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <AlertCircle size={13} />
                <span>All edits are logged in the audit trail.</span>
              </div>
              <div className="flex items-center gap-3">
                {currentStep > 1 && (
                  <button onClick={() => setCurrentStep((s) => s - 1)}
                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-[#131b2e] hover:bg-slate-100 rounded-xl transition-all">
                    Back
                  </button>
                )}
                <button type="button"
                  className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-[#131b2e] hover:bg-slate-100 rounded-xl transition-all">
                  Cancel
                </button>
                {currentStep < 4 && (
                  <motion.button type="button" onClick={handleSubmit} disabled={!canSubmit}
                    whileHover={canSubmit ? { scale: 1.02 } : {}}
                    whileTap={canSubmit ? { scale: 0.97 } : {}}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl shadow-sm transition-colors",
                      canSubmit
                        ? "bg-[#064e3b] text-white hover:bg-[#043d2f]"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}>
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Saving…
                        </motion.span>
                      ) : (
                        <motion.span key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2">
                          <Vote size={14} /> {submitLabel()}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Right Sidebar ── */}
        <div className="flex flex-col gap-6">

          {/* ELS-01 / ELS-06: Slates */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Slates {slates ? `(${slateList.length})` : ""}
                </h3>
                <p className="text-[11px] text-slate-400">ELS-01 / ELS-06</p>
              </div>
              <button onClick={() => setShowCreateSlate((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#064e3b] bg-[#064e3b]/10 px-2.5 py-1.5 rounded-full hover:bg-[#064e3b]/20 transition-colors">
                <Plus size={10} /> New Slate
              </button>
            </div>

            <AnimatePresence>
              {showCreateSlate && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-4 space-y-3 border-b border-slate-50 bg-slate-50/40">
                    <input type="text" value={slateLabel}
                      onChange={(e) => setSlateLabel(e.target.value)}
                      placeholder="Slate label (e.g. 2026–2027 Board)"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                    <div className="flex gap-2">
                      <input type="number" value={slateTermStart}
                        onChange={(e) => setSlateTermStart(Number(e.target.value))}
                        placeholder="Start year"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                      <input type="number" value={slateTermEnd}
                        onChange={(e) => setSlateTermEnd(Number(e.target.value))}
                        placeholder="End year"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCreateSlate}
                        disabled={!slateLabel.trim() || loading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#064e3b] text-white rounded-xl text-xs font-bold disabled:opacity-50">
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Create
                      </button>
                      <button onClick={() => setShowCreateSlate(false)}
                        className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
              {electionsLoading && !slates ? (
                [0, 1].map((i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)
              ) : slateList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No slates yet.</p>
              ) : (
                slateList.map((s: SlateData, i: number) => (
                  <button key={s.slate_id} onClick={() => setActiveSlateId(s.slate_id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all",
                      activeSlateId === s.slate_id
                        ? "border-[#064e3b]/30 bg-[#f0faf5]"
                        : "border-slate-100 hover:bg-slate-50"
                    )}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[#131b2e] truncate">{s.label}</p>
                        <p className="text-[10px] text-slate-400">{s.term_start}–{s.term_end}</p>
                      </div>
                    </div>
                    <SlateStatusBadge status={s.status} />
                  </button>
                ))
              )}
            </div>
          </motion.div>

          {/* ELS-07: Active slate positions */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Active Slate
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeSlate ? `${activeSlate.label} · ELS-07` : "Select a slate"}
                </p>
              </div>
              {activeSlate?.status === "locked" && (
                <span className="inline-flex items-center gap-1 bg-[#064e3b] text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                  <Lock size={9} /> LOCKED
                </span>
              )}
            </div>

            <div className="p-4 space-y-2">
              {electionsLoading && !slateDetail ? (
                [0, 1, 2].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)
              ) : positions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No positions yet.</p>
              ) : (
                positions.map((pos: SlatePositionDetail, i: number) => (
                  <div key={pos.position_id}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      pos.status === "active_setup"
                        ? "border-emerald-100 bg-emerald-50/50"
                        : "border-slate-100 bg-white"
                    )}>
                    {editingPositionId === pos.position_id ? (
                      <div className="space-y-2">
                        <input value={editPositionName}
                          onChange={(e) => setEditPositionName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#064e3b]/30" />
                        {/* ELS-03: role_bundle select — still uses RoleBundle enum */}
                        <select value={editRoleBundle}
                          onChange={(e) => setEditRoleBundle(e.target.value as RoleBundle)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                          <option value="executive_admin">Executive Admin</option>
                          <option value="treasurer">Treasurer</option>
                          <option value="secretary">Secretary</option>
                          <option value="general_council_member">General Council Member</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={handleUpdatePosition} disabled={loading}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#064e3b] text-white rounded-lg text-[10px] font-bold disabled:opacity-50">
                            {loading ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                          </button>
                          <button onClick={() => setEditingPositionId(null)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#131b2e] truncate">{pos.position_name}</p>
                          <p className="text-[10px] text-slate-400">
                            {pos.candidate_count} candidates · {pos.role_bundle}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => {
                            setEditingPositionId(pos.position_id);
                            setEditPositionName(pos.position_name);
                            setEditRoleBundle(pos.role_bundle);
                            handleViewPosition(pos.position_id);
                          }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#064e3b] transition-colors">
                            <Edit3 size={12} />
                          </button>
                          <SlateStatusBadge status={pos.status} />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 pb-4">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => { setCurrentStep(1); setPositionName(""); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:border-[#064e3b]/40 hover:text-[#064e3b] hover:bg-[#f0faf5] transition-all">
                <Plus size={13} /> Add Another Position
              </motion.button>
            </div>
          </motion.div>

          {/* Security Card */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={8}
            className="relative overflow-hidden rounded-2xl bg-[#064e3b] text-white p-6">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <ShieldCheck size={20} className="text-[#b0f0d6]" />
              </div>
              <h4 className="text-base font-bold mb-2 leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                Secure Voting Protocols
              </h4>
              <p className="text-xs text-white/60 leading-relaxed mb-5">
                Every ballot is cryptographically signed and immutable.
              </p>
              <a href="#" className="inline-flex items-center gap-1.5 text-[#b0f0d6] text-xs font-bold hover:underline">
                Review Compliance Docs <ArrowRight size={12} />
              </a>
            </div>
          </motion.div>

          {/* Summary stats — all live from hooks */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={9}
            className="grid grid-cols-2 gap-3">
            {[
              {
                icon:  <Users size={15} />,
                label: "Candidates",
                // INV-05: count of selected staff members
                value: String(selectedCandidates.length),
              },
              {
                icon:  <Vote size={15} />,
                label: "Positions",
                // ELS-07: positions in active slate
                value: String(positions.length),
              },
              {
                icon:  <CheckCircle2 size={15} />,
                label: "Mapped",
                // ELS-07: positions with candidates set
                value: String(mappedCount),
              },
              {
                icon:  <ShieldCheck size={15} />,
                label: "Role Templates",
                // PERM-01: count of available templates
                value: String(templateList.length),
              },
            ].map((stat) => (
              <div key={stat.label}
                className="bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm">
                <div className="flex justify-center text-[#064e3b] mb-1.5">{stat.icon}</div>
                <p className="text-xl font-extrabold text-[#131b2e]"
                   style={{ fontFamily: "Manrope, sans-serif" }}>
                  {stat.value}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}