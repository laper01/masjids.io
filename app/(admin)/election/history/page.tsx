"use client";

/**
 * Election History / Archive Page
 * app/(admin)/elections/history/page.tsx
 * ARC-01 · ARC-02 · ARC-03 · GOV-01
 *
 * Fixes vs original:
 * - getStatusCfg() fallback prevents cfg.dot crash on unknown status
 * - slateList derivation uses Array.isArray guard
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, ChevronLeft, ChevronRight, CheckCircle2, Users,
  Filter, Award, TrendingUp, Calendar, ChevronDown, Link2,
  AlertTriangle, Loader2, RefreshCw, Search, FileText, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMosque }    from "@/context/MosqueContext";
import { useElections } from "@/hooks/elections/useElections";
import type { ArchiveResult, PositionType, ReportFormat } from "@/types/elections";

// ─── View-model row ───────────────────────────────────────────────────────────
interface ArchiveRow {
  id: string; term: string; position: string; positionId: string;
  roleTemplateId: string; category: ArchiveResult["position_type"]; winner: string;
  initials: string; votes: number; total: number; certified: boolean; roleMapped: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const YEAR_RANGES = ["2020 – 2026", "2010 – 2019", "Legacy Records"] as const;
const CATEGORY_OPTIONS = [
  { label: "All Positions",   value: undefined          as PositionType | undefined },
  { label: "Executive Board", value: "executive_board"  as PositionType },
  { label: "Trustees",        value: "trustees"         as PositionType },
  { label: "Shura Council",   value: "shura_council"    as PositionType },
] as const;
const PAGE_SIZE = 6;

function parseYearRange(label: string): { year_from?: number; year_to?: number } {
  if (label === "2020 – 2026") return { year_from: 2020, year_to: 2026 };
  if (label === "2010 – 2019") return { year_from: 2010, year_to: 2019 };
  if (label === "Legacy Records") return { year_to: 2009 };
  return {};
}
function computeInitials(name: string): string {
  const parts = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, "").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function toRow(r: ArchiveResult, idx: number): ArchiveRow {
  return {
    id:             `${r.term_period}-${r.position}-${idx}`,
    term:           r.term_period,
    position:       r.position,
    positionId:     `pos-${r.position.toLowerCase().replace(/\s+/g, "-")}-${idx}`,
    roleTemplateId: `tmpl-${(r.position_type ?? "exec").replace(/\s+/g, "-")}-0001`,
    category:       r.position_type ?? "executive_board",
    winner:         r.winner_name,
    initials:       computeInitials(r.winner_name),
    votes:          r.votes_cast,
    total:          r.eligible,
    certified:      r.status === "certified",
    roleMapped:     r.role_mapped,
  };
}

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.065, ease: [0.22, 1, 0.36, 1] } }),
};
const rowVariants = {
  hidden:  { opacity: 0, x: -12 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { duration: 0.35, delay: i * 0.055, ease: [0.22, 1, 0.36, 1] } }),
  exit:    { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function ParticipationBar({ votes, total }: { votes: number; total: number }) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-[#003527] to-[#064e3b] rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />
      </div>
      <span className="text-xs font-bold text-[#131b2e] whitespace-nowrap tabular-nums">{votes.toLocaleString()}/{total.toLocaleString()}</span>
      <span className="text-[10px] text-slate-400 font-medium">{pct}%</span>
    </div>
  );
}
function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" }) {
  return (
    <div className={cn("rounded-lg bg-gradient-to-br from-[#064e3b] to-[#003527] flex items-center justify-center text-white font-bold shrink-0",
      size === "md" ? "w-10 h-10 text-xs" : "w-7 h-7 text-[10px]")}>
      {initials}
    </div>
  );
}
function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    executive_board: "bg-[#064e3b]/10 text-[#064e3b]",
    trustees:        "bg-blue-50 text-blue-700",
    shura_council:   "bg-purple-50 text-purple-700",
  };
  const labels: Record<string, string> = {
    executive_board: "Executive Board",
    trustees:        "Trustees",
    shura_council:   "Shura Council",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", map[category] ?? "bg-slate-100 text-slate-500")}>
      {labels[category] ?? category}
    </span>
  );
}
function SelectFilter({ label, options, value, onChange }: {
  label: string; options: { label: string; value: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-3 pr-8 text-sm font-semibold text-[#131b2e] appearance-none focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Map Role Cell — GOV-01 ───────────────────────────────────────────────────
function MapRoleCell({ masjidId, record, isMapped, onMap, loading }: {
  masjidId: string | null; record: ArchiveRow; isMapped: boolean;
  onMap: (positionId: string, roleTemplateId: string) => void; loading: boolean;
}) {
  if (!masjidId) return <span className="text-[10px] text-slate-300">No mosque</span>;
  if (isMapped) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#064e3b]/10 text-[#064e3b] text-[10px] font-bold">
        <CheckCircle2 size={11} /> Role Mapped
      </span>
    );
  }
  return (
    <button onClick={() => onMap(record.positionId, record.roleTemplateId)} disabled={loading}
      className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all",
        "border-[#064e3b]/30 text-[#064e3b] hover:bg-[#064e3b]/5", loading && "opacity-50 cursor-not-allowed")}>
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
      {loading ? "Mapping…" : "Map Role"}
    </button>
  );
}

// ─── Annual Report Modal — ARC-03 ────────────────────────────────────────────
function AnnualReportModal({ open, onClose, onGenerate, loading, report }: {
  open: boolean; onClose: () => void;
  onGenerate: (year: number, format: ReportFormat) => void;
  loading: boolean;
  report: { year?: number; status?: string; download_url?: string; poll_url?: string } | null;
}) {
  const currentYear = new Date().getFullYear();
  const [year,   setYear]   = useState(currentYear);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Generate Annual Report</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-3 pr-8 text-sm font-semibold text-[#131b2e]">
                {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as ReportFormat)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-3 pr-8 text-sm font-semibold text-[#131b2e]">
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
          {report && (
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
              <p className="font-bold text-[#064e3b] mb-1">{report.status === "cached" ? `Report for ${report.year} ready` : `Generating ${report.year}…`}</p>
              {report.status === "generating" && <p className="text-slate-400">Processing… check back shortly.</p>}
              {report.status === "cached" && report.download_url && (
                <a href={report.download_url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#064e3b] font-bold hover:underline">
                  <Download size={12} /> Download {format.toUpperCase()}
                </a>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
            <button onClick={() => onGenerate(year, format)} disabled={loading}
              className="inline-flex items-center gap-2 bg-[#064e3b] text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ElectionHistoryPage() {
  const { activeMosque, isHydrating } = useMosque();
  const {
    archive, archiveStats, annualReport, loading, error,
    getArchive, getArchiveStats, getAnnualReport, mapElectionRole, clearError, clearAnnualReport,
  } = useElections();

  const [yearRange,    setYearRange]    = useState<string>(YEAR_RANGES[0]);
  const [categoryIdx,  setCategoryIdx]  = useState(0);
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [mappedIds,    setMappedIds]    = useState<Set<string>>(new Set());
  const [mappingId,    setMappingId]    = useState<string | null>(null);
  const [reportOpen,   setReportOpen]   = useState(false);

  const masjidId      = isHydrating ? null : (activeMosque?.id ?? null);
  const activeCategory = CATEGORY_OPTIONS[categoryIdx];

  // ARC-01: fetch archive when filters change
  useEffect(() => {
    if (!masjidId) return;
    const { year_from, year_to } = parseYearRange(yearRange);
    getArchive(masjidId, { position_type: activeCategory.value, year_from, year_to, per_page: 100, page: 1 });
    setPage(1);
  }, [masjidId, yearRange, categoryIdx, getArchive]);

  // ARC-02: stats once per mosque
  useEffect(() => {
    if (!masjidId) return;
    getArchiveStats(masjidId);
  }, [masjidId, getArchiveStats]);

  // Derive rows from ARC-01
  const rawResults: ArchiveResult[] = (archive as any)?.results ?? [];

  const rows: ArchiveRow[] = useMemo(() => {
    const mapped = rawResults.map((r, i) => toRow(r, i));
    if (!search.trim()) return mapped;
    const q = search.toLowerCase();
    return mapped.filter((r) => r.winner.toLowerCase().includes(q) || r.position.toLowerCase().includes(q));
  }, [rawResults, search]);

  // Pre-seed mapped set from API flag
  useEffect(() => {
    const fromApi = rawResults
      .filter((r) => r.role_mapped)
      .map((r, i) => `pos-${r.position.toLowerCase().replace(/\s+/g, "-")}-${i}`);
    if (fromApi.length > 0) setMappedIds((prev) => new Set([...prev, ...fromApi]));
  }, [rawResults]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged      = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ARC-02 stats
  const statsData         = (archiveStats as any)?.data as import("@/types/elections").ArchiveStatsData | undefined;
  const totalElections    = statsData?.total_elections        ?? rows.length;
  const electedMembers    = statsData?.total_elected_members  ?? new Set(rows.map((r) => r.winner)).size;
  const avgParticipation  = statsData?.avg_participation_pct  ?? (rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + (r.total > 0 ? (r.votes / r.total) * 100 : 0), 0) / rows.length) : 0);
  const termsOnRecord     = statsData?.terms_on_record        ?? new Set(rows.map((r) => r.term)).size;

  const handleRefresh = useCallback(() => {
    if (!masjidId) return;
    const { year_from, year_to } = parseYearRange(yearRange);
    getArchive(masjidId, { position_type: activeCategory.value, year_from, year_to, per_page: 100, page: 1 });
    getArchiveStats(masjidId);
  }, [masjidId, yearRange, activeCategory, getArchive, getArchiveStats]);

  // GOV-01 map role
  const handleMapRole = useCallback(async (positionId: string, roleTemplateId: string) => {
    if (!masjidId) return;
    setMappingId(positionId);
    const res = await mapElectionRole(masjidId, positionId, { role_template_id: roleTemplateId });
    if (res) setMappedIds((prev) => new Set([...prev, positionId]));
    setMappingId(null);
  }, [masjidId, mapElectionRole]);

  // ARC-03 generate annual report
  const handleGenerateReport = useCallback(async (year: number, format: ReportFormat) => {
    if (!masjidId) return;
    await getAnnualReport(masjidId, { year, format });
  }, [masjidId, getAnnualReport]);

  const isPositionMapped = useCallback((id: string) => mappedIds.has(id), [mappedIds]);
  const showSkeleton     = loading && rows.length === 0;
  const mosqueName       = isHydrating ? null : (activeMosque?.name ?? "Your Mosque");
  const reportData       = (annualReport as any)?.data as import("@/types/elections").AnnualReportData | null;

  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="flex-1 text-sm text-red-700">{error}</p>
            <button onClick={clearError} className="text-xs font-bold text-red-500 hover:underline shrink-0">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Elections · Archive</p>
          <h1 className="text-3xl font-extrabold text-[#003527] tracking-tight leading-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>Election Archives</h1>
          <p className="text-slate-500 text-sm max-w-lg leading-relaxed">
            A transparent, immutable record of{" "}
            {mosqueName === null
              ? <span className="inline-block w-32 h-3.5 bg-slate-200 rounded animate-pulse align-middle" />
              : <span className="font-semibold text-[#003527]">{mosqueName}</span>
            }{" "}governance across all terms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleRefresh} disabled={!masjidId || loading}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-[#064e3b] px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50">
            <RefreshCw size={15} className={cn(loading && "animate-spin")} /> Refresh
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => { clearAnnualReport(); setReportOpen(true); }} disabled={!masjidId}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-[#064e3b] px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50">
            <Download size={15} /> Download Annual Report
          </motion.button>
        </div>
      </motion.div>

      {/* ARC-02 stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <Award size={16} />,      label: "Total Elections",    value: totalElections,         accent: "#064e3b" },
          { icon: <Users size={16} />,      label: "Elected Members",    value: electedMembers,         accent: "#1d4ed8" },
          { icon: <TrendingUp size={16} />, label: "Avg. Participation", value: `${avgParticipation}%`, accent: "#7c3aed" },
          { icon: <Calendar size={16} />,   label: "Terms on Record",    value: termsOnRecord,          accent: "#b45309" },
        ].map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} initial="hidden" animate="visible" custom={i + 1}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: stat.accent }}>{stat.icon}</div>
            <div>
              <p className="text-xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                {showSkeleton && !archiveStats ? <span className="inline-block w-10 h-5 bg-slate-200 rounded animate-pulse" /> : stat.value}
              </p>
              <p className="text-[11px] text-slate-400">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SelectFilter label="Year Range" value={yearRange} onChange={(v) => { setYearRange(v); setPage(1); }}
          options={YEAR_RANGES.map((r) => ({ label: r, value: r }))} />
        <SelectFilter label="Position Type" value={String(categoryIdx)} onChange={(v) => { setCategoryIdx(Number(v)); setPage(1); }}
          options={CATEGORY_OPTIONS.map((c, i) => ({ label: c.label, value: String(i) }))} />
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Search</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Winner or position…"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-9 pr-3 text-sm font-semibold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Total Archivists</p>
            <p className="text-2xl font-extrabold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>{electedMembers} Elected</p>
          </div>
          <div className="flex -space-x-2.5">
            {rows.slice(0, 4).map((r, i) => (
              <div key={r.id} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#064e3b] to-[#003527] border-2 border-white flex items-center justify-center text-white text-[9px] font-black" style={{ zIndex: 4 - i }}>
                {r.initials}
              </div>
            ))}
            {electedMembers > 4 && (
              <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[#064e3b] text-[9px] font-black" style={{ zIndex: 0 }}>+{electedMembers - 4}</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Archive table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#064e3b] flex items-center justify-center"><Award size={16} className="text-white" /></div>
            <div>
              <h2 className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>Certified Results</h2>
              <p className="text-xs text-slate-400">{rows.length} records found</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><Filter size={12} /><span>{activeCategory.label}</span></div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full" aria-label="Election archive">
            <thead>
              <tr className="border-b border-slate-50">
                {["Term Period", "Position", "Winner", "Participation", "Status", "Role"].map((col, i) => (
                  <th key={col} className={cn("px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400", i >= 4 ? "text-right" : "text-left")}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showSkeleton
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-b border-slate-50">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                : (
                  <AnimatePresence mode="popLayout">
                    {paged.map((record, i) => (
                      <motion.tr key={record.id} variants={rowVariants} initial="hidden" animate="visible" exit="exit"
                        custom={i} layout className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4"><span className="text-sm font-bold text-[#064e3b] tabular-nums">{record.term}</span></td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-[#131b2e]">{record.position}</p>
                          <CategoryBadge category={record.category} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar initials={record.initials} />
                            <p className="text-sm font-bold text-[#064e3b]">{record.winner}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4"><ParticipationBar votes={record.votes} total={record.total} /></td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b0f0d6]/50 text-[#002117] text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={11} /> Certified
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <MapRoleCell masjidId={masjidId} record={record}
                            isMapped={isPositionMapped(record.positionId) || record.roleMapped}
                            onMap={handleMapRole} loading={mappingId === record.positionId} />
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )
              }
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-50">
          {showSkeleton
            ? Array.from({ length: 3 }).map((_, i) => <div key={`msk-${i}`} className="p-4"><div className="h-12 bg-slate-100 rounded animate-pulse" /></div>)
            : (
              <AnimatePresence mode="popLayout">
                {paged.map((record, i) => (
                  <motion.div key={record.id} variants={rowVariants} initial="hidden" animate="visible" exit="exit" custom={i} layout className="p-4">
                    <button className="w-full text-left" onClick={() => setExpanded(expanded === record.id ? null : record.id)} aria-expanded={expanded === record.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={record.initials} />
                          <div>
                            <p className="text-sm font-bold text-[#131b2e]">{record.position}</p>
                            <p className="text-xs text-[#064e3b] font-semibold">{record.winner}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#064e3b]">{record.term}</span>
                          <ChevronDown size={14} className={cn("text-slate-400 transition-transform", expanded === record.id && "rotate-180")} />
                        </div>
                      </div>
                    </button>
                    <AnimatePresence>
                      {expanded === record.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                          <div className="pt-3 space-y-2.5">
                            <CategoryBadge category={record.category} />
                            <ParticipationBar votes={record.votes} total={record.total} />
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b0f0d6]/50 text-[#002117] text-[10px] font-bold uppercase tracking-wider">
                                <CheckCircle2 size={11} /> Certified
                              </span>
                              <MapRoleCell masjidId={masjidId} record={record}
                                isMapped={isPositionMapped(record.positionId) || record.roleMapped}
                                onMap={handleMapRole} loading={mappingId === record.positionId} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            )
          }
        </div>

        {!showSkeleton && paged.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="py-16 text-center text-slate-400 text-sm">
            {!masjidId ? "Select a mosque to load archives." : "No records match the selected filters."}
          </motion.div>
        )}
      </motion.div>

      {/* Pagination */}
      <motion.footer variants={fadeUp} initial="hidden" animate="visible" custom={7}
        className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-slate-400">
          Showing{" "}
          <span className="font-semibold text-[#131b2e]">{Math.min((page - 1) * PAGE_SIZE + 1, rows.length)}–{Math.min(page * PAGE_SIZE, rows.length)}</span>
          {" "}of{" "}
          <span className="font-semibold text-[#131b2e]">{rows.length}</span> archived terms
        </p>
        <div className="flex items-center gap-1.5">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#064e3b] flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={15} />
          </motion.button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <motion.button key={p} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setPage(p)}
              className={cn("w-9 h-9 rounded-xl text-sm font-bold transition-all",
                page === p ? "bg-[#064e3b] text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50")}>
              {p}
            </motion.button>
          ))}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#064e3b] flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={15} />
          </motion.button>
        </div>
      </motion.footer>

      {/* ARC-03 Annual report modal */}
      <AnimatePresence>
        {reportOpen && (
          <AnnualReportModal open={reportOpen} onClose={() => setReportOpen(false)}
            onGenerate={handleGenerateReport} loading={loading}
            report={reportData ? { year: reportData.year, status: reportData.status, download_url: reportData.download_url, poll_url: reportData.poll_url } : null} />
        )}
      </AnimatePresence>
    </div>
  );
}