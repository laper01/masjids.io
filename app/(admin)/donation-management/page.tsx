"use client";

/**
 * app/(admin)/donation-management/page.tsx
 *
 * Admin Donation Management — uses all useDonations hooks:
 *   getCampaigns       DON-02  GET  paginated campaign list
 *   getCampaignDetail  DON-03  GET  full campaign detail + stats
 *   createCampaign     DON-01  POST create new campaign
 *   updateCampaign     DON-04  PUT  edit campaign
 *   initiateDonation   DON-05  POST manual donation on behalf of member
 *   getDonations       DON-06  GET  paginated donations ledger per campaign
 */

import {
  useState, useEffect, useMemo, useCallback, useReducer, useRef,
} from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Search, ChevronLeft, ChevronRight,
  X, Loader2, AlertCircle, CheckCircle2,
  Heart, DollarSign, Target, TrendingUp, Users,
  RefreshCw, BarChart3, Zap, Calendar,
  Check, Receipt, Tag,
} from "lucide-react";
import { useMosque } from "@/context/MosqueContext";
import { useDonations } from "@/hooks/donations/useDonations";
import type {
  CampaignListItem, CampaignStatus,
  CreateCampaignRequest, UpdateCampaignRequest,
  InitiateDonationRequest, DonationRecord,
  GetCampaignsQuery,
} from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  primary:      "#003527",
  primaryMid:   "#064e3b",
  primaryLight: "#e8f5ef",
  primaryFixed: "#b0f0d6",
  surface:      "#faf8ff",
  surfaceLow:   "#f2f3ff",
  surfaceHigh:  "#e2e7ff",
  white:        "#ffffff",
  text:         "#131b2e",
  textMuted:    "#4b5563",
  textFaint:    "#9ca3af",
  border:       "rgba(0,53,39,0.08)",
  error:        "#ba1a1a",
  errorBg:      "#ffdad6",
  shadow:       "0 4px 24px -4px rgba(0,53,39,0.10)",
  shadowMd:     "0 8px 32px -6px rgba(0,53,39,0.14)",
  shadowLg:     "0 20px 48px -8px rgba(0,53,39,0.18)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// STATIC CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  active:  { label: "Active",  bg: C.primaryLight, color: C.primary,  dot: "#16a34a" },
  paused:  { label: "Paused",  bg: "#fef3c7",      color: "#92400e",  dot: "#d97706" },
  closed:  { label: "Closed",  bg: "#f3f4f6",      color: "#6b7280",  dot: "#9ca3af" },
};

const DONATION_TYPE_LABELS: Record<string, string> = {
  one_time:  "One-time",
  recurring: "Recurring",
  both:      "Both",
};

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// FORM STATE — useReducer
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignFormState {
  title: string;
  description: string;
  goal_amount: string;
  currency: string;
  donation_type: "one_time" | "recurring" | "both";
  status: CampaignStatus;
  end_date: string;
}

const FORM_INITIAL: CampaignFormState = {
  title: "", description: "", goal_amount: "", currency: "USD",
  donation_type: "one_time", status: "active", end_date: "",
};

type FormAction =
  | { type: "SET"; field: keyof CampaignFormState; value: string }
  | { type: "LOAD"; payload: CampaignFormState }
  | { type: "RESET" };

function formReducer(state: CampaignFormState, action: FormAction): CampaignFormState {
  switch (action.type) {
    case "SET":   return { ...state, [action.field]: action.value };
    case "LOAD":  return action.payload;
    case "RESET": return FORM_INITIAL;
    default:      return state;
  }
}

// Donate form state
interface DonateFormState {
  amount: string;
  currency: string;
  donation_type: "one_time" | "recurring";
  interval: "month" | "year";
}

const DONATE_INITIAL: DonateFormState = {
  amount: "", currency: "USD", donation_type: "one_time", interval: "month",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(n?: number | null, currency = "USD"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] as number[] },
});

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg animate-pulse ${className}`}
      style={{ background: "rgba(0,53,39,0.06)" }} />
  );
}

function RevealSection({ children, className = "" }: {
  children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  return (
    <motion.div ref={ref} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
      initial="hidden" animate={inView ? "visible" : "hidden"}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.closed;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ pct, raised, goal, currency }: {
  pct: number; raised: number; goal: number; currency: string;
}) {
  const safePct = Math.min(100, Math.max(0, pct));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-bold" style={{ color: C.primary }}>{fmtMoney(raised, currency)}</span>
        <span style={{ color: C.textFaint }}>{fmtMoney(goal, currency)} goal</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: C.surfaceHigh }}
        role="progressbar" aria-valuenow={safePct} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${safePct}% of goal reached`}>
        <motion.div className="h-full rounded-full"
          style={{ background: safePct >= 100 ? "#16a34a" : `linear-gradient(90deg, ${C.primary}, ${C.primaryMid})` }}
          initial={{ width: 0 }}
          animate={{ width: `${safePct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <p className="text-[10px] mt-1" style={{ color: C.textFaint }}>{safePct}% funded</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, sub, delay = 0, loading }: {
  label: string; value: string; icon: React.ElementType;
  sub?: string; delay?: number; loading?: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.textFaint }}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: C.primaryLight, color: C.primary }}>
          <Icon size={16} aria-hidden="true" />
        </div>
      </div>
      {loading ? <Sk className="h-9 w-28" /> : (
        <p className="text-3xl font-extrabold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
          {value}
        </p>
      )}
      {sub && <p className="text-xs" style={{ color: C.textFaint }}>{sub}</p>}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, pageSize, onChange }: {
  page: number; totalPages: number; total: number; pageSize: number;
  onChange: (n: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t"
      style={{ borderColor: C.border }}>
      <p className="text-xs" style={{ color: C.textFaint }}>
        Showing <strong style={{ color: C.text }}>{start}–{end}</strong> of{" "}
        <strong style={{ color: C.text }}>{total}</strong>
      </p>
      <div className="flex items-center gap-1">
        <motion.button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: C.textFaint }}
          whileHover={{ background: C.surfaceLow }} whileTap={{ scale: 0.9 }}
          aria-label="Previous page">
          <ChevronLeft size={15} />
        </motion.button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
          <motion.button key={n} onClick={() => onChange(n)}
            aria-current={page === n ? "page" : undefined}
            className="w-7 h-7 rounded-lg text-xs font-bold"
            style={page === n ? { background: C.primary, color: C.white } : { color: C.textMuted }}
            whileHover={page !== n ? { background: C.surfaceLow } : {}} whileTap={{ scale: 0.9 }}>
            {n}
          </motion.button>
        ))}
        {totalPages > 5 && <span style={{ color: C.textFaint }}>…</span>}
        <motion.button onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: C.textFaint }}
          whileHover={{ background: C.surfaceLow }} whileTap={{ scale: 0.9 }}
          aria-label="Next page">
          <ChevronRight size={15} />
        </motion.button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN FORM MODAL — create + edit (DON-01, DON-04)
// ─────────────────────────────────────────────────────────────────────────────

function CampaignFormModal({ mode, initial, onClose, onSubmit, loading, error }: {
  mode: "create" | "edit";
  initial?: Partial<CampaignFormState>;
  onClose: () => void;
  onSubmit: (form: CampaignFormState) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  const [form, dispatch] = useReducer(formReducer,
    initial ? { ...FORM_INITIAL, ...initial } : FORM_INITIAL
  );

  const set = (field: keyof CampaignFormState, value: string) =>
    dispatch({ type: "SET", field, value });

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)" }}
        onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="campaign-form-title">
        <div className="w-full max-w-lg my-8 rounded-2xl overflow-hidden"
          style={{ background: C.white, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>

          {/* Header */}
          <div className="px-7 pt-7 pb-5 flex items-start justify-between border-b"
            style={{ borderColor: C.border }}>
            <div>
              <h3 id="campaign-form-title" className="font-bold text-lg"
                style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                {mode === "create" ? "Create New Campaign" : "Edit Campaign"}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: C.textFaint }}>
                {mode === "create" ? "Set up a fundraising campaign for your community." : "Update campaign details."}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg transition-colors"
              style={{ color: C.textFaint }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
              <X size={15} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); void onSubmit(form); }}
            className="px-7 py-6 space-y-5">

            {/* Title */}
            <div>
              <label htmlFor="cf-title" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: C.textMuted }}>
                Campaign Title <span style={{ color: C.error }} aria-hidden="true">*</span>
              </label>
              <input id="cf-title" required type="text" value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Ramadan Building Fund"
                className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2"
                style={{ background: C.surfaceLow, color: C.text }} />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="cf-desc" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: C.textMuted }}>Description</label>
              <textarea id="cf-desc" rows={3} value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Tell your community what this campaign is for..."
                className="w-full rounded-xl px-4 py-3 text-sm border-none resize-none outline-none focus:ring-2"
                style={{ background: C.surfaceLow, color: C.text }} />
            </div>

            {/* Goal + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cf-goal" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: C.textMuted }}>
                  Goal Amount <span style={{ color: C.error }} aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: C.textFaint }} />
                  <input id="cf-goal" required type="number" min={1} value={form.goal_amount}
                    onChange={(e) => set("goal_amount", e.target.value)} placeholder="5000"
                    className="w-full rounded-xl pl-9 pr-4 py-3 text-sm border-none outline-none focus:ring-2"
                    style={{ background: C.surfaceLow, color: C.text }} />
                </div>
              </div>
              <div>
                <label htmlFor="cf-currency" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: C.textMuted }}>Currency</label>
                <select id="cf-currency" value={form.currency} onChange={(e) => set("currency", e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2 cursor-pointer"
                  style={{ background: C.surfaceLow, color: C.text }}>
                  {["USD","GBP","EUR","CAD","AUD","SGD","MYR","IDR"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Donation type */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.textMuted }}>
                Donation Type
              </p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Donation type">
                {(["one_time", "recurring", "both"] as const).map((t) => (
                  <button key={t} type="button" aria-pressed={form.donation_type === t}
                    onClick={() => set("donation_type", t)}
                    className="py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={form.donation_type === t
                      ? { background: C.primary, color: C.white }
                      : { background: C.surfaceLow, color: C.textMuted }}>
                    {DONATION_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Status + End date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cf-status" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: C.textMuted }}>Status</label>
                <select id="cf-status" value={form.status}
                  onChange={(e) => set("status", e.target.value as CampaignStatus)}
                  className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2 cursor-pointer"
                  style={{ background: C.surfaceLow, color: C.text }}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label htmlFor="cf-end" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: C.textMuted }}>End Date</label>
                <input id="cf-end" type="date" value={form.end_date}
                  onChange={(e) => set("end_date", e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2"
                  style={{ background: C.surfaceLow, color: C.text }} />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
                style={{ background: C.errorBg, color: C.error }}>
                <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ color: C.textMuted, background: C.surfaceLow }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHigh)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.surfaceLow)}>
                Cancel
              </button>
              <motion.button type="submit" disabled={loading}
                className="flex-[2] py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: C.primary, boxShadow: "0 4px 16px rgba(0,53,39,0.28)" }}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {mode === "create" ? "Create Campaign" : "Save Changes"}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN DETAIL DRAWER — DON-03 + DON-06
// (view-only — Edit / Donate action buttons removed)
// ─────────────────────────────────────────────────────────────────────────────

function CampaignDetailDrawer({ masjidId, campaignId, onClose }: {
  masjidId: string; campaignId: string;
  onClose: () => void;
}) {
  const {
    campaignDetail, donations, loading,
    getCampaignDetail, getDonations, clearCampaignDetail, clearDonations,
  } = useDonations();

  const [donPage, setDonPage] = useState(1);

  useEffect(() => {
    void getCampaignDetail(masjidId, campaignId);
    void getDonations(masjidId, campaignId, { page: 1, limit: 10 });
    return () => { clearCampaignDetail(); clearDonations(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjidId, campaignId]);

  const detail  = campaignDetail?.data;
  const donList: DonationRecord[] = donations?.data?.data ?? [];
  const donMeta = donations?.data?.metadata;
  const donTotal = donMeta?.total_data ?? 0;
  const donTotalPages = Math.max(1, Math.ceil(donTotal / 10));

  const loadDonPage = async (p: number) => {
    setDonPage(p);
    await getDonations(masjidId, campaignId, { page: p, limit: 10 });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
        onClick={onClose} />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg overflow-y-auto"
        style={{ background: C.white, boxShadow: "-8px 0 32px rgba(0,53,39,0.12)" }}
        role="complementary" aria-label="Campaign detail"
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b sticky top-0 z-10"
          style={{ background: C.white, borderColor: C.border }}>
          <h3 className="font-bold text-base" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            Campaign Detail
          </h3>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg transition-colors" style={{ color: C.textFaint }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
            <X size={15} />
          </button>
        </div>

        {loading && !detail ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin" style={{ color: C.primaryMid }} />
          </div>
        ) : detail ? (
          <div className="px-7 py-6 space-y-7">

            {/* Title + status */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                <h2 className="flex-1 text-xl font-extrabold leading-snug"
                  style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                  {detail.title}
                </h2>
                <StatusBadge status={detail.status} />
              </div>
              {detail.description && (
                <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
                  {detail.description}
                </p>
              )}
            </div>

            {/* Progress */}
            <div className="rounded-2xl p-5"
              style={{ background: C.primaryLight, border: `1px solid ${C.border}` }}>
              <ProgressBar
                pct={detail.progress_pct ?? 0}
                raised={detail.raised_amount ?? 0}
                goal={detail.goal_amount}
                currency={detail.currency}
              />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Donors",      value: String(detail.donor_count ?? 0),                    icon: Users    },
                { label: "Type",        value: DONATION_TYPE_LABELS[detail.donation_type] ?? "—",  icon: Tag      },
                { label: "End Date",    value: fmtDate(detail.end_date),                            icon: Calendar },
              ].map(({ label, value, icon: I }) => (
                <div key={label} className="rounded-xl p-3 text-center"
                  style={{ background: C.surfaceLow }}>
                  <I size={14} className="mx-auto mb-1" style={{ color: C.primaryMid }} aria-hidden="true" />
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: C.textFaint }}>
                    {label}
                  </p>
                  <p className="text-sm font-bold" style={{ color: C.text }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Donations ledger — DON-06 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.textFaint }}>
                  Donation Ledger ({donTotal})
                </p>
                <button onClick={() => loadDonPage(1)}
                  className="p-1 rounded-lg transition-colors" style={{ color: C.textFaint }}
                  aria-label="Refresh donations">
                  <RefreshCw size={13} />
                </button>
              </div>

              {donList.length === 0 ? (
                <div className="py-8 text-center">
                  <Heart size={24} className="mx-auto mb-2" style={{ color: C.textFaint }} />
                  <p className="text-sm" style={{ color: C.textFaint }}>No donations yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {donList.map((d: DonationRecord) => (
                    <div key={d.id}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: C.surfaceLow }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: C.primaryLight, color: C.primary }}>
                          <Heart size={13} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
                            {d.user?.name ?? "Anonymous"}
                          </p>
                          <p className="text-[11px]" style={{ color: C.textFaint }}>
                            {fmtDateTime(d.donated_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold" style={{ color: C.primary }}>
                          {fmtMoney(d.amount, d.currency)}
                        </p>
                        <span className="text-[10px] font-bold uppercase"
                          style={{ color: d.status === "succeeded" ? "#16a34a" : d.status === "failed" ? C.error : "#d97706" }}>
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Donation pagination */}
              {donTotalPages > 1 && (
                <Pagination page={donPage} totalPages={donTotalPages} total={donTotal}
                  pageSize={10} onChange={loadDonPage} />
              )}
            </div>
          </div>
        ) : null}
      </motion.aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE CLIENT SECRET MODAL (shown after DON-05 success)
// ─────────────────────────────────────────────────────────────────────────────

function ClientSecretModal({ clientSecret, onClose }: {
  clientSecret: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(clientSecret);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)" }}
        onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }} transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="secret-title">
        <div className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: C.white, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
          <div className="px-7 pt-7 pb-5 border-b flex items-center justify-between"
            style={{ borderColor: C.border }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: C.primaryLight }}>
                <Zap size={18} style={{ color: C.primary }} aria-hidden="true" />
              </div>
              <div>
                <h3 id="secret-title" className="font-bold text-base"
                  style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                  Payment Initiated
                </h3>
                <p className="text-xs" style={{ color: C.textFaint }}>
                  Pass this client_secret to Stripe.js to confirm the payment.
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg"
              style={{ color: C.textFaint }}>
              <X size={15} />
            </button>
          </div>
          <div className="px-7 py-6 space-y-4">
            <div className="rounded-xl p-4 font-mono text-xs break-all"
              style={{ background: C.surfaceLow, color: C.primaryMid }}>
              {clientSecret}
            </div>
            <div className="flex gap-3">
              <motion.button onClick={copy}
                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: C.primaryLight, color: C.primary }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                {copied ? <CheckCircle2 size={14} /> : <Receipt size={14} />}
                {copied ? "Copied!" : "Copy Secret"}
              </motion.button>
              <motion.button onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: C.primary }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                Done
              </motion.button>
            </div>
            <p className="text-xs text-center" style={{ color: C.textFaint }}>
              Use this with{" "}
              <code className="font-mono px-1.5 py-0.5 rounded" style={{ background: C.surfaceLow }}>
                stripe.confirmPayment()
              </code>{" "}
              in your frontend to complete the charge.
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// (all row/detail action buttons removed — table is now view-only,
//  modals remain reachable only via the ActiveModal type they were
//  removed as entry points for; wire up new triggers if needed)
// ─────────────────────────────────────────────────────────────────────────────

type ActiveModal =
  | { type: "detail"; campaignId: string; campaign: CampaignListItem }
  | { type: "secret"; clientSecret: string }
  | null;

export default function DonationManagementPage() {
  const { activeMosque, isHydrating } = useMosque();
  const {
    campaigns, loading, error,
    getCampaigns,
    clearError,
  } = useDonations();

  const masjidId = activeMosque?.id ?? "";

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch]         = useState("");
  const [debounced, setDebounced]   = useState("");
  const [statusFilter, setStatus]   = useState<"all" | CampaignStatus>("all");
  const [page, setPage]             = useState(1);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [toast, setToast]           = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, masjidId]);

  // Fetch on mount / filter change
  useEffect(() => {
    if (!masjidId || isHydrating) return;
    const query: GetCampaignsQuery = { page, limit: PAGE_SIZE };
    if (statusFilter !== "all") query.status = statusFilter;
    void getCampaigns(masjidId, query);
  }, [masjidId, page, statusFilter, isHydrating, getCampaigns]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const allCampaigns = campaigns?.data ?? [];
  const total        = campaigns?.metadata?.total_data ?? 0;
  const totalPages   = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = useMemo(() => {
    if (!debounced) return allCampaigns;
    return allCampaigns.filter((c) =>
      c.title.toLowerCase().includes(debounced)
    );
  }, [allCampaigns, debounced]);

  const totalRaised = allCampaigns.reduce((s, c) => s + (c.raised_amount ?? 0), 0);
  const totalDonors = allCampaigns.reduce((s, c) => s + (c.donor_count  ?? 0), 0);
  const activeCnt   = allCampaigns.filter((c) => c.status === "active").length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCloseModal = useCallback(() => {
    setActiveModal(null); clearError();
  }, [clearError]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: C.surface, fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="fixed top-6 right-6 z-[70] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-semibold text-white"
              style={{ background: C.primary, boxShadow: C.shadowLg }}
              role="status">
              <CheckCircle2 size={15} style={{ color: C.primaryFixed }} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page header */}
        <motion.div {...FADE_UP()} className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: C.textFaint }}>
              Admin · {activeMosque?.name ?? "Select a Mosque"}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
              Donation Management
            </h1>
            <p className="text-sm mt-1" style={{ color: C.textFaint }}>
              View fundraising campaigns and track donations.
            </p>
          </div>
        </motion.div>

        {/* No mosque warning */}
        {!isHydrating && !activeMosque && (
          <motion.div {...FADE_UP(0.05)}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-medium"
            style={{ background: "#fef3c7", color: "#92400e", border: "1px solid rgba(146,64,14,0.2)" }}>
            <AlertCircle size={15} className="shrink-0" />
            No mosque selected. Please select an active mosque to view campaigns.
          </motion.div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Total Raised"    value={fmtMoney(totalRaised)} icon={BarChart3}   sub="Across all campaigns" delay={0}    loading={loading && !campaigns} />
          <StatCard label="Total Donors"    value={String(totalDonors)}   icon={Users}       sub="Unique contributors"  delay={0.06} loading={loading && !campaigns} />
          <StatCard label="Active Campaigns"value={String(activeCnt)}     icon={Target}      sub="Currently accepting"  delay={0.12} loading={loading && !campaigns} />
          <StatCard label="Total Campaigns" value={String(total)}         icon={TrendingUp}  sub="All statuses"         delay={0.18} loading={loading && !campaigns} />
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div {...FADE_UP()} role="alert"
              className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm"
              style={{ background: C.errorBg, color: C.error, border: `1px solid rgba(186,26,26,0.2)` }}>
              <AlertCircle size={15} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={clearError} aria-label="Dismiss"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Campaign table */}
        <RevealSection>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b"
              style={{ borderColor: C.border }}>
              <div>
                <h2 className="text-base font-bold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                  Campaigns
                </h2>
                <p className="text-xs mt-0.5" style={{ color: C.textFaint }}>
                  {total} total{activeMosque ? ` · ${activeMosque.name}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: C.textFaint }} />
                  <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search campaigns…" aria-label="Search campaigns"
                    className="pl-9 pr-4 py-2.5 rounded-xl text-sm border-none outline-none focus:ring-2 w-52"
                    style={{ background: C.surfaceHigh, color: C.text }} />
                </div>
                {/* Status filter */}
                <div className="flex p-1 rounded-xl" style={{ background: C.surfaceLow }}
                  role="group" aria-label="Filter by status">
                  {(["all", "active", "paused", "closed"] as const).map((s) => (
                    <button key={s} onClick={() => setStatus(s)} aria-pressed={statusFilter === s}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                      style={statusFilter === s
                        ? { background: C.primaryFixed, color: C.primary }
                        : { color: C.textFaint }}>
                      {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto relative">
              {/* Loading bar */}
              {loading && (
                <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden" style={{ background: C.primaryLight }}>
                  <motion.div className="h-full w-1/3" style={{ background: C.primary }}
                    animate={{ x: ["-100%", "300%"] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
                </div>
              )}

              <table className="w-full text-left" role="table" aria-label="Campaigns table">
                <thead>
                  <tr style={{ background: "rgba(242,243,255,0.5)", borderBottom: `1px solid ${C.border}` }}>
                    {["Campaign", "Status", "Progress", "Donors", "Type"].map((h) => (
                      <th key={h} scope="col"
                        className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: C.textFaint }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isHydrating || (loading && allCampaigns.length === 0) ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-6 py-4">
                            <Sk className={`h-4 ${j === 0 ? "w-40" : "w-20"}`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Target size={32} className="mx-auto mb-3" style={{ color: C.textFaint }} />
                        <p className="text-sm font-semibold" style={{ color: C.textMuted }}>
                          {allCampaigns.length === 0 ? "No campaigns yet" : "No campaigns match"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    <>
                    {filtered.map((campaign) => (
                      <motion.tr key={campaign.id}
                        className="border-b last:border-0 transition-colors"
                        style={{ borderColor: C.border }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}>

                        {/* Campaign name */}
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-sm" style={{ color: C.text }}>
                              {campaign.title}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: C.textFaint }}>
                              {fmtMoney(campaign.raised_amount, campaign.currency)} raised
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <StatusBadge status={campaign.status} />
                        </td>

                        {/* Progress */}
                        <td className="px-6 py-4 min-w-[160px]">
                          <div>
                            <div className="flex justify-between text-[11px] mb-1"
                              style={{ color: C.textFaint }}>
                              <span>{campaign.progress_pct ?? 0}%</span>
                              <span>{fmtMoney(campaign.goal_amount, campaign.currency)}</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: C.surfaceHigh }}>
                              <motion.div className="h-full rounded-full"
                                style={{ background: C.primary }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, campaign.progress_pct ?? 0)}%` }}
                                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                            </div>
                          </div>
                        </td>

                        {/* Donors */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold" style={{ color: C.text }}>
                            {campaign.donor_count ?? 0}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium" style={{ color: C.textMuted }}>
                            {DONATION_TYPE_LABELS[campaign.donation_type] ?? campaign.donation_type}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <Pagination page={page} totalPages={totalPages} total={total}
                pageSize={PAGE_SIZE} onChange={setPage} />
            )}
          </div>
        </RevealSection>

      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}

      <AnimatePresence>
        {/* Detail — DON-03 + DON-06 (view-only) */}
        {activeModal?.type === "detail" && (
          <CampaignDetailDrawer key="detail"
            masjidId={masjidId} campaignId={activeModal.campaignId}
            onClose={handleCloseModal}
          />
        )}

        {/* Client secret result */}
        {activeModal?.type === "secret" && (
          <ClientSecretModal key="secret"
            clientSecret={activeModal.clientSecret}
            onClose={() => { handleCloseModal(); showToast("Donation initiated — complete payment with Stripe.js"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}