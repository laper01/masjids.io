"use client";

import {
  useState, useRef, useEffect, useMemo, useCallback, useReducer,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Search, TrendingUp, BadgeCheck, Clock, MoreVertical, UserPlus,
  ChevronLeft, ChevronRight, ChevronDown, DollarSign, X, Trash2,
  ShieldCheck, Loader2, AlertCircle, Calendar, CreditCard, RefreshCw,
  PauseCircle, Users, Receipt, Layers, Plus, Edit2,
  CheckCircle2, ExternalLink, Zap, AlertTriangle, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMosque } from "@/context/MosqueContext";
import { useMemberships } from "@/hooks/memberships/useMemberships";
import type {
  AdminMembershipItem, AdminPaymentItem, AdminPaymentDetail,
  MembershipStatus, PaymentStatus, Tier,
  CreateTierRequest, UpdateTierRequest,
  GetAdminMembershipsQuery, GetAdminPaymentsQuery,
} from "@/types/memberships";

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
  warning:      "#92400e",
  warningBg:    "#fef3c7",
  shadow:       "0 4px 24px -4px rgba(0,53,39,0.10)",
  shadowMd:     "0 8px 32px -6px rgba(0,53,39,0.14)",
  shadowLg:     "0 20px 48px -8px rgba(0,53,39,0.18)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type TabId = "members" | "payments" | "tiers";

// ─────────────────────────────────────────────────────────────────────────────
// STATIC CONFIG MAPS
// ─────────────────────────────────────────────────────────────────────────────

const MEMBERSHIP_STATUS: Record<MembershipStatus, {
  label: string; icon: React.ElementType; color: string; bg: string; dot: string;
}> = {
  active:    { label: "Active",    icon: BadgeCheck,  color: C.primary,   bg: C.primaryLight, dot: "#16a34a" },
  pending:   { label: "Pending",   icon: Clock,       color: "#92400e",   bg: "#fef3c7",      dot: "#d97706" },
  suspended: { label: "Suspended", icon: PauseCircle, color: "#92400e",   bg: "#fef3c7",      dot: "#d97706" },
  cancelled: { label: "Cancelled", icon: X,           color: C.error,     bg: C.errorBg,      dot: C.error   },
  expired:   { label: "Expired",   icon: Clock,       color: "#6b7280",   bg: "#f3f4f6",      dot: "#9ca3af" },
};

// API returns status in various casings ("ACTIVE", "active", etc). Normalize
// once here so every lookup/comparison against MembershipStatus is safe.
function normalizeStatus(status: string | null | undefined): MembershipStatus {
  return ((status ?? "").toLowerCase() as MembershipStatus);
}

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  paid:     { label: "Paid",     color: C.primary, bg: C.primaryLight },
  PAID:     { label: "Paid",     color: C.primary, bg: C.primaryLight },
  pending:  { label: "Pending",  color: "#92400e", bg: "#fef3c7"      },
  PENDING:  { label: "Pending",  color: "#92400e", bg: "#fef3c7"      },
  failed:   { label: "Failed",   color: C.error,   bg: C.errorBg      },
  FAILED:   { label: "Failed",   color: C.error,   bg: C.errorBg      },
  refunded: { label: "Refunded", color: "#6b7280", bg: "#f3f4f6"      },
  REFUNDED: { label: "Refunded", color: "#6b7280", bg: "#f3f4f6"      },
};

const AVATAR_PALETTE = [
  { bg: "#e8f5ef", text: C.primary   },
  { bg: "#d5e3fd", text: "#3a485c"   },
  { bg: "#fef3c7", text: "#92400e"   },
  { bg: "#ede9fe", text: "#5b21b6"   },
  { bg: "#fce7f3", text: "#9d174d"   },
  { bg: "#e0f2fe", text: "#075985"   },
];

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function initials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(seed?: string | null) {
  const s = seed ?? "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n?: number | null, currency = "USD"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] as number[] },
});

const STAGGER = { animate: { transition: { staggerChildren: 0.05 } } };
const STAGGER_ITEM = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg animate-pulse", className)}
      style={{ background: "rgba(0,53,39,0.06)" }} />
  );
}

function Avatar({ name, seed }: { name: string; seed: string }) {
  const c = avatarColor(seed);
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: c.bg, color: c.text }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const s = MEMBERSHIP_STATUS[normalized] ?? MEMBERSHIP_STATUS.pending;
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <Icon size={11} aria-hidden="true" />
      {s.label}
    </span>
  );
}

function PaymentPill({ status }: { status: string }) {
  const s = PAYMENT_STATUS_MAP[status] ?? PAYMENT_STATUS_MAP.pending;
  return (
    <span
      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, badge, icon: Icon, delay = 0, loading,
}: {
  label: string; value: string; sub: string;
  badge?: string; icon?: React.ElementType; delay?: number; loading?: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.textFaint }}>{label}</p>
        {badge && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: C.primaryLight, color: C.primary }}>
            {badge}
          </span>
        )}
        {Icon && !badge && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: C.surfaceLow, color: C.primary }}>
            <Icon size={15} aria-hidden="true" />
          </div>
        )}
      </div>
      {loading ? <Sk className="h-9 w-28" /> : (
        <p className="text-3xl font-extrabold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
          {value}
        </p>
      )}
      <p className="text-xs" style={{ color: C.textFaint }}>{sub}</p>
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
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);

  return (
    <div className="px-6 py-4 flex items-center justify-between border-t"
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
        {pages.map((n) => (
          <motion.button key={n} onClick={() => onChange(n)}
            aria-current={page === n ? "page" : undefined}
            className="w-7 h-7 rounded-lg text-xs font-bold"
            style={page === n ? { background: C.primary, color: C.white } : { color: C.textMuted }}
            whileHover={page !== n ? { background: C.surfaceLow } : {}}
            whileTap={{ scale: 0.9 }}>
            {n}
          </motion.button>
        ))}
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
// CONFIRM MODAL (reusable)
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, body, confirmLabel, danger = false,
  loading, onClose, onConfirm, withReason = false }: {
  open: boolean; title: string; body: string; confirmLabel: string;
  danger?: boolean; loading: boolean;
  onClose: () => void; onConfirm: (reason?: string) => void;
  withReason?: boolean;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (!open) setReason(""); }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
            onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: C.white, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
              <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b"
                style={{ borderColor: C.border }}>
                <h3 id="confirm-title" className="font-bold text-base"
                  style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>{title}</h3>
                <button onClick={onClose} aria-label="Close"
                  className="p-1.5 rounded-lg transition-colors" style={{ color: C.textFaint }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <X size={15} />
                </button>
              </div>
              <div className="px-7 py-6 space-y-4">
                <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>{body}</p>
                {withReason && (
                  <div>
                    <label htmlFor="reason" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                      style={{ color: C.textMuted }}>Reason (optional)</label>
                    <textarea id="reason" rows={3} value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Member requested cancellation"
                      className="w-full px-4 py-3 rounded-xl text-sm resize-none border-none outline-none focus:ring-2"
                      style={{ background: C.surfaceLow, color: C.text }} />
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{ color: C.textMuted, background: C.surfaceLow }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHigh)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = C.surfaceLow)}>
                    Cancel
                  </button>
                  <motion.button onClick={() => onConfirm(withReason ? reason.trim() || undefined : undefined)}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: danger ? C.error : C.primary }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {confirmLabel}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT DETAIL DRAWER  — MEM-MISS-07
// ─────────────────────────────────────────────────────────────────────────────

function PaymentDetailDrawer({ masjidId, paymentId, onClose }: {
  masjidId: string; paymentId: string; onClose: () => void;
}) {
  const { adminPaymentDetail, loading, getAdminPaymentDetail, clearAdminPaymentDetail } = useMemberships();

  useEffect(() => {
    void getAdminPaymentDetail(masjidId, paymentId);
    return () => clearAdminPaymentDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjidId, paymentId]);

  const p = adminPaymentDetail;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
        onClick={onClose} />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto"
        style={{ background: C.white, boxShadow: "-8px 0 32px rgba(0,53,39,0.12)" }}
        role="complementary" aria-label="Payment detail"
      >
        <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b sticky top-0 z-10"
          style={{ background: C.white, borderColor: C.border }}>
          <h3 className="font-bold text-base" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            Payment Details
          </h3>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg" style={{ color: C.textFaint }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
            <X size={15} />
          </button>
        </div>

        {loading && !p ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={18} className="animate-spin" style={{ color: C.primaryMid }} />
          </div>
        ) : p ? (
          <div className="px-7 py-6 space-y-6">
            {/* Amount + status */}
            <div className="rounded-2xl p-6 text-center"
              style={{ background: C.primaryLight, border: `1px solid ${C.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.primary }}>
                Amount
              </p>
              <p className="text-4xl font-extrabold" style={{ fontFamily: "Manrope, sans-serif", color: C.primary }}>
                {fmtMoney(p.amount, p.currency)}
              </p>
              <div className="mt-3 flex justify-center">
                <PaymentPill status={p.status} />
              </div>
            </div>

            {/* Details grid */}
            <div className="space-y-3">
              {[
                { label: "Member",        value: p.display_name },
                { label: "Tier",          value: p.tier_name },
                { label: "Method",        value: p.payment_method },
                { label: "Gateway Ref",   value: p.gateway_ref },
                { label: "Period Start",  value: fmtDate(p.period_start) },
                { label: "Period End",    value: fmtDate(p.period_end) },
                { label: "Paid At",       value: fmtDate((p as any).paid_at ?? p.period_end) },
                { label: "Created",       value: fmtDate(p.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b"
                  style={{ borderColor: C.border }}>
                  <p className="text-xs font-semibold" style={{ color: C.textFaint }}>{label}</p>
                  <p className="text-sm font-semibold" style={{ color: C.text }}>{value ?? "—"}</p>
                </div>
              ))}
            </div>

            {p.failure_reason && (
              <div className="rounded-xl px-4 py-3 flex items-start gap-2"
                style={{ background: C.errorBg, color: C.error }}>
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <p className="text-xs">{p.failure_reason}</p>
              </div>
            )}

            {p.invoice_url && (
              <a href={p.invoice_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-colors"
                style={{ background: C.primaryLight, color: C.primary }}>
                <ExternalLink size={14} /> View Invoice
              </a>
            )}
          </div>
        ) : null}
      </motion.aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER FORM MODAL — create + edit
// ─────────────────────────────────────────────────────────────────────────────

type TierFormState = {
  name: string; description: string; price: string; currency: string;
  interval: "monthly" | "yearly";
  visibility: "public" | "private" | "invite_only";
  can_vote: boolean; max_members: string; benefits: string;
};

const TIER_FORM_INITIAL: TierFormState = {
  name: "", description: "", price: "", currency: "USD",
  interval: "monthly", visibility: "public",
  can_vote: false, max_members: "", benefits: "",
};

function TierFormModal({ tier, onClose, onSubmit, loading }: {
  tier: Tier | null; // null = create mode
  onClose: () => void;
  onSubmit: (payload: CreateTierRequest | UpdateTierRequest) => Promise<boolean>;
  loading: boolean;
}) {
  const [form, setForm] = useState<TierFormState>(() =>
    tier ? {
      name: tier.name,
      description: tier.description,
      price: String(tier.price),
      currency: tier.currency,
      interval: tier.interval,
      visibility: tier.visibility ?? "public",
      can_vote: tier.can_vote,
      max_members: tier.max_members ? String(tier.max_members) : "",
      benefits: (tier.benefits ?? []).join("\n"),
    } : TIER_FORM_INITIAL
  );
  const [err, setErr] = useState<string | null>(null);

  const set = (field: keyof TierFormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErr("Name is required."); return; }
    if (!form.price || isNaN(Number(form.price))) { setErr("Valid price is required."); return; }
    setErr(null);

    const payload: CreateTierRequest = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      currency: form.currency,
      interval: form.interval,
      visibility: form.visibility,
      can_vote: form.can_vote,
      max_members: form.max_members ? Number(form.max_members) : null,
      benefits: form.benefits.split("\n").map((b) => b.trim()).filter(Boolean),
    };

    const ok = await onSubmit(payload);
    if (ok) onClose();
    else setErr("Failed to save tier. Please try again.");
  };

  const isEdit = !!tier;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
        onClick={onClose} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg overflow-y-auto"
        style={{ background: C.white, boxShadow: "-8px 0 32px rgba(0,53,39,0.12)" }}
        role="dialog" aria-modal="true" aria-labelledby="tier-form-title">
        <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b sticky top-0 z-10"
          style={{ background: C.white, borderColor: C.border }}>
          <h3 id="tier-form-title" className="font-bold text-base"
            style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            {isEdit ? "Edit Tier" : "Create New Tier"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg" style={{ color: C.textFaint }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
            <X size={15} />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="t-name" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: C.textMuted }}>
              Tier Name <span style={{ color: C.error }}>*</span>
            </label>
            <input id="t-name" type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Premium Supporting Member"
              className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2"
              style={{ background: C.surfaceLow, color: C.text }} />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="t-desc" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: C.textMuted }}>Description</label>
            <textarea id="t-desc" rows={3} value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe what this tier includes…"
              className="w-full rounded-xl px-4 py-3 text-sm border-none resize-none outline-none focus:ring-2"
              style={{ background: C.surfaceLow, color: C.text }} />
          </div>

          {/* Price + currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-price" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: C.textMuted }}>
                Price <span style={{ color: C.error }}>*</span>
              </label>
              <input id="t-price" type="number" min={0} value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="100"
                className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2"
                style={{ background: C.surfaceLow, color: C.text }} />
            </div>
            <div>
              <label htmlFor="t-currency" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: C.textMuted }}>Currency</label>
              <select id="t-currency" value={form.currency} onChange={(e) => set("currency", e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2 cursor-pointer"
                style={{ background: C.surfaceLow, color: C.text }}>
                {["USD", "MYR", "SGD", "GBP", "EUR", "IDR"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Interval + visibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-interval" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: C.textMuted }}>Billing Interval</label>
              <select id="t-interval" value={form.interval} onChange={(e) => set("interval", e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2 cursor-pointer"
                style={{ background: C.surfaceLow, color: C.text }}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label htmlFor="t-visibility" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: C.textMuted }}>Visibility</label>
              <select id="t-visibility" value={form.visibility} onChange={(e) => set("visibility", e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2 cursor-pointer"
                style={{ background: C.surfaceLow, color: C.text }}>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="invite_only">Invite Only</option>
              </select>
            </div>
          </div>

          {/* Max members */}
          <div>
            <label htmlFor="t-max" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: C.textMuted }}>Max Members (leave blank for unlimited)</label>
            <input id="t-max" type="number" min={0} value={form.max_members}
              onChange={(e) => set("max_members", e.target.value)}
              placeholder="No limit"
              className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2"
              style={{ background: C.surfaceLow, color: C.text }} />
          </div>

          {/* Benefits */}
          <div>
            <label htmlFor="t-benefits" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: C.textMuted }}>Benefits (one per line)</label>
            <textarea id="t-benefits" rows={4} value={form.benefits}
              onChange={(e) => set("benefits", e.target.value)}
              placeholder={"Voting rights\nEvent discounts\nPriority booking"}
              className="w-full rounded-xl px-4 py-3 text-sm border-none resize-none outline-none focus:ring-2"
              style={{ background: C.surfaceLow, color: C.text }} />
          </div>

          {/* Can vote toggle */}
          <div className="flex items-center gap-3">
            <button type="button" role="switch" aria-checked={form.can_vote}
              onClick={() => set("can_vote", !form.can_vote)}
              className="w-11 h-6 rounded-full relative transition-all focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: form.can_vote ? C.primary : C.surfaceHigh }}>
              <motion.span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                animate={{ x: form.can_vote ? 20 : 0 }} transition={{ duration: 0.2 }} />
            </button>
            <span className="text-sm font-medium" style={{ color: C.textMuted }}>
              Includes voting rights
            </span>
          </div>

          {err && (
            <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
              style={{ background: C.errorBg, color: C.error }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 flex gap-3 border-t sticky bottom-0"
          style={{ background: C.white, borderColor: C.border }}>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ color: C.textMuted, background: C.surfaceLow }}>
            Cancel
          </button>
          <motion.button onClick={handleSubmit} disabled={loading}
            className="flex-[2] py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: C.primary }}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isEdit ? "Save Changes" : "Create Tier"}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: MEMBERS
// ─────────────────────────────────────────────────────────────────────────────

function MembersTab({ masjidId }: { masjidId: string }) {
  const {
    adminMemberships, tiers, loading, error,
    getAdminMemberships, getTiers, updateMembership, cancelMembership, subscribeToTier,
    clearError,
  } = useMemberships();

  const [search, setSearch]           = useState("");
  const [debounced, setDebounced]     = useState("");
  const [statusFilter, setStatus]     = useState<"all" | MembershipStatus>("all");
  const [tierFilter, setTierFilter]   = useState("all");
  const [page, setPage]               = useState(1);
  const [cancelTarget, setCancelTarget] = useState<AdminMembershipItem | null>(null);
  const [addOpen, setAddOpen]         = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, tierFilter]);

  useEffect(() => { void getTiers(masjidId); }, [masjidId, getTiers]);

  useEffect(() => {
    void getAdminMemberships(masjidId, {
      page, limit: PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
      tier_id: tierFilter === "all" ? undefined : tierFilter,
    });
  }, [masjidId, page, statusFilter, tierFilter, getAdminMemberships]);

  const allRows  = adminMemberships?.data ?? [];
  // FIX: same pagination/metadata shape mismatch already handled in
  // PaymentsTab below — this admin endpoint returns `metadata.total_data`,
  // not `pagination.total`, so `total` was always falling back to 0.
  const total    = (adminMemberships as any)?.metadata?.total_data ?? adminMemberships?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = useMemo(() => {
    if (!debounced) return allRows;
    return allRows.filter((m) =>
      m.display_name.toLowerCase().includes(debounced) ||
      (m.tier?.name ?? "").toLowerCase().includes(debounced)
    );
  }, [allRows, debounced]);

  // Status comparisons normalized — API can return "ACTIVE"/"PENDING" etc.
  const stats = useMemo(() => ({
    total,
    active: allRows.filter((r) => normalizeStatus(r.status) === "active").length,
    pending: allRows.filter((r) => {
      const s = normalizeStatus(r.status);
      return s === "pending" || s === "suspended";
    }).length,
  }), [allRows, total]);

  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    member: AdminMembershipItem; next: MembershipStatus;
  } | null>(null);

  const handleConfirmStatusChange = useCallback(async (reason?: string) => {
    if (!statusChangeTarget) return;
    const { member, next } = statusChangeTarget;
    await updateMembership(masjidId, member.id, {
      status: next,
      reason: reason?.trim() || `Status changed to "${next}" by admin`,
    });
    setStatusChangeTarget(null);
    // Refetch so the table reflects the change even if the local patch in
    // the hook ever falls out of sync (e.g. concurrent edits by others).
    void getAdminMemberships(masjidId, {
      page, limit: PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
      tier_id: tierFilter === "all" ? undefined : tierFilter,
    });
  }, [statusChangeTarget, masjidId, updateMembership, getAdminMemberships, page, statusFilter, tierFilter]);

  const handleCancel = useCallback(async (reason?: string) => {
    if (!cancelTarget) return;
    await cancelMembership(masjidId, cancelTarget.id, reason || undefined);
    setCancelTarget(null);
  }, [masjidId, cancelTarget, cancelMembership]);

  const handleSubscribe = useCallback(async (tierId: string, paymentMethod: string): Promise<boolean> => {
    const res = await subscribeToTier(masjidId, tierId, paymentMethod);
    if (res) {
      void getAdminMemberships(masjidId, { page, limit: PAGE_SIZE });
      return true;
    }
    return false;
  }, [masjidId, page, subscribeToTier, getAdminMemberships]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Members" value={stats.total.toLocaleString()}
          sub="All statuses" badge="LIVE" delay={0} loading={loading && !adminMemberships} />
        <StatCard label="Active" value={stats.active.toString()}
          sub="Active on this page" icon={TrendingUp} delay={0.06} loading={loading && !adminMemberships} />
        <StatCard label="Needs Attention" value={stats.pending.toString()}
          sub="Pending or suspended" icon={AlertTriangle} delay={0.12} loading={loading && !adminMemberships} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            Community Members
          </h2>
          <p className="text-sm mt-0.5" style={{ color: C.textFaint }}>
            Manage memberships, tier assignments, and status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: C.textFaint }} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…" aria-label="Search members"
              className="pl-9 pr-4 py-2.5 rounded-xl text-sm border-none outline-none focus:ring-2 w-52"
              style={{ background: C.surfaceHigh, color: C.text }} />
          </div>
          {/* Status filter */}
          <div className="flex p-1 rounded-xl" style={{ background: C.surfaceLow }}
            role="group" aria-label="Filter by status">
            {(["all", "active", "pending"] as const).map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                aria-pressed={statusFilter === s}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                style={statusFilter === s
                  ? { background: C.primaryFixed, color: C.primary }
                  : { color: C.textFaint }}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {/* Tier filter */}
          <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
            aria-label="Filter by tier"
            className="rounded-xl pl-3.5 pr-8 py-2.5 text-sm border-none outline-none focus:ring-2 cursor-pointer"
            style={{ background: C.white, color: C.text, border: `1px solid ${C.border}` }}>
            <option value="all">All Tiers</option>
            {(tiers?.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {/* Subscribe CTA */}
          <motion.button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: C.primary, boxShadow: "0 4px 16px rgba(0,53,39,0.25)" }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
            aria-label="Subscribe a member">
            <UserPlus size={14} /> Subscribe
          </motion.button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div {...FADE_UP()} role="alert"
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm"
            style={{ background: C.errorBg, color: C.error }}>
            <AlertCircle size={15} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={clearError} aria-label="Dismiss"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
        {/* Loading bar */}
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden" style={{ background: C.primaryLight }}>
            <motion.div className="h-full w-1/3" style={{ background: C.primary }}
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table" aria-label="Members table">
            <thead>
              <tr style={{ background: "rgba(242,243,255,0.5)", borderBottom: `1px solid ${C.border}` }}>
                {["Member", "Tier", "Started", "Status", ""].map((h) => (
                  <th key={h} scope="col"
                    className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: C.textFaint }}>
                    {h || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {rows.length > 0 ? (
                  rows.map((m) => (
                    <MemberRow key={m.id} member={m}
                      onChangeStatus={(next) => setStatusChangeTarget({ member: m, next })}
                      onRemove={() => setCancelTarget(m)} />
                  ))
                ) : (
                  <tr key="empty">
                    <td colSpan={5} className="py-16 text-center text-sm" style={{ color: C.textFaint }}>
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin" /> Loading members…
                        </span>
                      ) : "No members match your filters."}
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {addOpen && (
          <SubscribeModal tiers={tiers?.data ?? []} loading={loading}
            onSubmit={handleSubscribe} onClose={() => setAddOpen(false)} />
        )}
        {statusChangeTarget && (
          <ConfirmModal open
            title={statusChangeTarget.next === "active" ? "Mark as Active" : "Suspend Membership"}
            body={`You're about to change ${statusChangeTarget.member.display_name || "this member"}'s status to "${statusChangeTarget.next}". Please provide a reason.`}
            confirmLabel="Confirm" danger={statusChangeTarget.next === "suspended"}
            loading={loading} withReason
            onClose={() => setStatusChangeTarget(null)} onConfirm={handleConfirmStatusChange} />
        )}
        {cancelTarget && (
          <ConfirmModal open title="Cancel Membership"
            body={`You're about to cancel ${cancelTarget.display_name || "this member"}'s membership. Future billing will stop.`}
            confirmLabel="Confirm Cancel" danger loading={loading} withReason
            onClose={() => setCancelTarget(null)} onConfirm={handleCancel} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ member, onChangeStatus, onRemove }: {
  member: AdminMembershipItem;
  onChangeStatus: (next: MembershipStatus) => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);

  // Close on outside click — check both the trigger button and the
  // portal-rendered menu itself, since the menu no longer lives inside the
  // same DOM subtree as the button.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // FIX: this dropdown used to be `absolute right-0 top-9` inside a table
  // wrapped in `overflow-x-auto`. Setting overflow-x forces overflow-y to
  // compute to `auto` too (CSS spec behavior), so the wrapper clipped the
  // menu whenever it would render past its bottom edge — mainly the last
  // row(s) on the page, requiring an extra scroll to even see it. Rendering
  // through a portal into document.body with `position: fixed`, computed
  // from the trigger button's own bounding rect, sidesteps that entirely.
  // Pass 1: tentative position directly below the button.
  useEffect(() => {
    if (!menuOpen) return;
    const updatePosition = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const MENU_WIDTH = 192; // w-48
      const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
      setCoords({ top: rect.bottom + 4, left });
      setVisible(false);
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [menuOpen]);

  // Pass 2: measure the menu's real height once rendered and flip it above
  // the button if it would overflow the bottom of the viewport.
  useEffect(() => {
    if (!menuOpen || !coords || visible) return;
    const menuEl = menuRef.current;
    const anchorRect = btnRef.current?.getBoundingClientRect();
    if (!menuEl || !anchorRect) return;

    const menuRect = menuEl.getBoundingClientRect();
    const overflowsBottom = menuRect.bottom > window.innerHeight - 8;

    if (overflowsBottom) {
      const flippedTop = Math.max(8, anchorRect.top - menuRect.height - 4);
      setCoords((prev) => (prev ? { ...prev, top: flippedTop } : prev));
    }
    setVisible(true);
  }, [menuOpen, coords, visible]);

  // Status comparisons normalized — API can return "ACTIVE", "PENDING" etc,
  // not just the lowercase MembershipStatus enum values.
  const status = normalizeStatus(member.status);
  const canActivate = status !== "active" && status !== "cancelled" && status !== "expired";
  const canSuspend  = status === "active";
  const canCancel   = status !== "cancelled" && status !== "expired";

  return (
    <motion.tr variants={STAGGER_ITEM}
      className="group border-b last:border-0 transition-colors"
      style={{ borderColor: C.border }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={member.display_name || "?"} seed={member.id} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
              {member.display_name || "Unknown"}
            </p>
            <p className="text-[11px]" style={{ color: C.textFaint }}>
              {member.payment_method || "No payment method"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: C.surfaceHigh, color: C.text }}>
          {member.tier?.name ?? "—"}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm" style={{ color: C.textMuted }}>{fmtDate(member.started_at)}</span>
      </td>
      <td className="px-6 py-4">
        <StatusPill status={member.status} />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="relative inline-block">
          <button ref={btnRef} onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true" aria-expanded={menuOpen}
            aria-label={`Actions for ${member.display_name}`}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
            style={{ color: C.textFaint }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHigh)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
            <MoreVertical size={15} />
          </button>
          {menuOpen && coords && typeof document !== "undefined" &&
            createPortal(
              <AnimatePresence>
                <motion.div ref={menuRef} role="menu"
                  initial={{ opacity: 0, scale: 0.93, y: -4 }}
                  animate={{ opacity: visible ? 1 : 0, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.93, y: -4 }}
                  transition={{ duration: 0.14 }}
                  style={{
                    position: "fixed", top: coords.top, left: coords.left, zIndex: 9999,
                    pointerEvents: visible ? "auto" : "none",
                    background: C.white, boxShadow: C.shadowLg, border: `1px solid ${C.border}`,
                  }}
                  className="w-48 rounded-xl overflow-hidden py-1">
                  {canActivate && (
                    <button role="menuitem" onClick={() => { onChangeStatus("active"); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium"
                      style={{ color: C.primaryMid }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.primaryLight)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                      <BadgeCheck size={12} /> Mark Active
                    </button>
                  )}
                  {canSuspend && (
                    <button role="menuitem" onClick={() => { onChangeStatus("suspended"); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium"
                      style={{ color: "#92400e" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fef3c7")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                      <PauseCircle size={12} /> Suspend
                    </button>
                  )}
                  {canCancel && (
                    <>
                      {(canActivate || canSuspend) && (
                        <div className="my-1" style={{ height: 1, background: C.border }} />
                      )}
                      <button role="menuitem" onClick={() => { onRemove(); setMenuOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-bold"
                        style={{ color: C.error }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = C.errorBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                        <Trash2 size={12} /> Cancel Membership
                      </button>
                    </>
                  )}
                  {!canActivate && !canSuspend && !canCancel && (
                    <p className="px-4 py-2.5 text-xs" style={{ color: C.textFaint }}>
                      No actions available
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>,
              document.body
            )}
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Subscribe Modal ──────────────────────────────────────────────────────────

function SubscribeModal({ tiers, loading, onSubmit, onClose }: {
  tiers: Tier[]; loading: boolean;
  onSubmit: (tierId: string, paymentMethod: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [tierId, setTierId]               = useState(tiers[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [done, setDone]                   = useState(false);
  const [err, setErr]                     = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!tierId) { setErr("Please choose a tier."); return; }
    setErr(null);
    const ok = await onSubmit(tierId, paymentMethod);
    if (ok) { setDone(true); setTimeout(onClose, 1500); }
    else setErr("Could not subscribe. Please try again.");
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
        onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }} transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: C.white, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
          <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b"
            style={{ borderColor: C.border }}>
            <h3 className="font-bold text-base" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
              Subscribe to Tier
            </h3>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg" style={{ color: C.textFaint }}>
              <X size={15} />
            </button>
          </div>
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="px-7 py-12 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: C.primaryLight }}>
                  <BadgeCheck size={28} style={{ color: C.primary }} />
                </div>
                <p className="font-bold" style={{ fontFamily: "Manrope, sans-serif", color: C.primary }}>
                  Subscribed!
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" className="px-7 py-6 space-y-4">
                {tiers.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: C.textFaint }}>
                    No tiers configured. Create one in the Tiers tab first.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="sub-tier" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                        style={{ color: C.textMuted }}>Select Tier</label>
                      <select id="sub-tier" value={tierId} onChange={(e) => setTierId(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2 cursor-pointer"
                        style={{ background: C.surfaceLow, color: C.text }}>
                        {tiers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {fmtMoney(t.price, t.currency)} / {t.interval}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Payment method */}
                    <div>
                      <label htmlFor="sub-payment" className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                        style={{ color: C.textMuted }}>Payment Method</label>
                      <select id="sub-payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2 cursor-pointer"
                        style={{ background: C.surfaceLow, color: C.text }}>
                        <option value="credit_card">Credit Card</option>
                        <option value="debit_card">Debit Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                  </div>
                )}
                {err && (
                  <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
                    style={{ background: C.errorBg, color: C.error }}>
                    <AlertCircle size={13} className="mt-0.5 shrink-0" /> {err}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold"
                    style={{ color: C.textMuted, background: C.surfaceLow }}>Cancel</button>
                  <motion.button onClick={handleSubmit} disabled={loading || tiers.length === 0}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: C.primary }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                    Subscribe
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PAYMENTS  — MEM-MISS-06 + MEM-MISS-07
// ─────────────────────────────────────────────────────────────────────────────

function PaymentsTab({ masjidId }: { masjidId: string }) {
  const {
    adminPayments, loading, error,
    getAdminPayments, clearError,
  } = useMemberships();

  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [page, setPage]                 = useState(1);
  const [detailId, setDetailId]         = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [statusFilter]);

  useEffect(() => {
    const query: GetAdminPaymentsQuery = { page, limit: PAGE_SIZE };
    if (statusFilter !== "all") query.status = statusFilter;
    void getAdminPayments(masjidId, query);
  }, [masjidId, page, statusFilter, getAdminPayments]);

  const rawPayments = adminPayments?.data as any;
  const payments = Array.isArray(rawPayments)
    ? rawPayments
    : Array.isArray(rawPayments?.data)
    ? rawPayments.data
    : [];
  const summary  = rawPayments?.summary ?? adminPayments?.summary ?? null;
  const total    = (adminPayments as any)?.metadata?.total_data ?? adminPayments?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Collected" value={fmtMoney(summary?.total_collected)}
          sub={summary?.period ?? "This period"} badge="Revenue" delay={0}
          loading={loading && !adminPayments} />
        <StatCard label="Total Transactions" value={total.toLocaleString()}
          sub="All payment records" icon={Receipt} delay={0.06}
          loading={loading && !adminPayments} />
        <StatCard label="Failed Payments"
          value={payments.filter((p: { status: string }) => p.status.toLowerCase() === "failed").length.toString()}
          sub="Requires follow-up" icon={AlertTriangle} delay={0.12}
          loading={loading && !adminPayments} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            Payment Transactions
          </h2>
          <p className="text-sm mt-0.5" style={{ color: C.textFaint }}>
            All billing activity for this masjid.
          </p>
        </div>
        <div className="flex p-1 rounded-xl" style={{ background: C.surfaceLow }}
          role="group" aria-label="Filter by payment status">
          {(["all", "paid", "pending", "failed", "refunded"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
              style={statusFilter === s
                ? { background: C.primaryFixed, color: C.primary }
                : { color: C.textFaint }}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div {...FADE_UP()} role="alert"
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm"
            style={{ background: C.errorBg, color: C.error }}>
            <AlertCircle size={15} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={clearError} aria-label="Dismiss"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table" aria-label="Payments table">
            <thead>
              <tr style={{ background: "rgba(242,243,255,0.5)", borderBottom: `1px solid ${C.border}` }}>
                {["Member", "Tier", "Amount", "Status", "Paid At", ""].map((h) => (
                  <th key={h} scope="col"
                    className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: C.textFaint }}>
                    {h || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((p: AdminPaymentItem) => (
                  <motion.tr key={p.id} variants={STAGGER_ITEM}
                    className="border-b last:border-0 group transition-colors"
                    style={{ borderColor: C.border }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.display_name || "?"} seed={p.id} />
                        <p className="text-sm font-semibold" style={{ color: C.text }}>
                          {p.display_name || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: C.textMuted }}>{p.tier_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-sm" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                        {fmtMoney(p.amount, p.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <PaymentPill status={p.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: C.textMuted }}>
                        {(p as any).paid_at ? fmtDate((p as any).paid_at) : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <motion.button onClick={() => setDetailId(p.id)}
                        aria-label={`View details for payment by ${p.display_name}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: C.primary, background: C.primaryLight }}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                        Details
                      </motion.button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm" style={{ color: C.textFaint }}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Loading payments…
                      </span>
                    ) : "No payment records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* Payment detail drawer — MEM-MISS-07 */}
      <AnimatePresence>
        {detailId && (
          <PaymentDetailDrawer masjidId={masjidId} paymentId={detailId} onClose={() => setDetailId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: TIERS — createTier + updateTier + deleteTier
// ─────────────────────────────────────────────────────────────────────────────

function TiersTab({ masjidId }: { masjidId: string }) {
  const {
    tiers, loading, error,
    getTiers, createTier, updateTier, deleteTier, clearError,
  } = useMemberships();

  const [formTier, setFormTier]     = useState<Tier | null | "create">(null); // null=closed, "create"=new
  const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null);

  useEffect(() => { void getTiers(masjidId); }, [masjidId, getTiers]);

  const handleSubmit = useCallback(async (payload: CreateTierRequest | UpdateTierRequest): Promise<boolean> => {
    if (formTier === "create") {
      const res = await createTier(masjidId, payload as CreateTierRequest);
      return !!res;
    } else if (formTier) {
      const res = await updateTier(masjidId, formTier.id, payload as UpdateTierRequest);
      return !!res;
    }
    return false;
  }, [formTier, masjidId, createTier, updateTier]);

  const handleDelete = useCallback(async (_reason?: string) => {
    if (!deleteTarget) return;
    await deleteTier(masjidId, deleteTarget.id);
    setDeleteTarget(null);
  }, [masjidId, deleteTarget, deleteTier]);

  const tierList = tiers?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            Membership Tiers
          </h2>
          <p className="text-sm mt-0.5" style={{ color: C.textFaint }}>
            Configure the membership plans available at this masjid.
          </p>
        </div>
        <motion.button onClick={() => setFormTier("create")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: C.primary, boxShadow: "0 4px 16px rgba(0,53,39,0.25)" }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          aria-label="Create new tier">
          <Plus size={14} /> New Tier
        </motion.button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div {...FADE_UP()} role="alert"
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm"
            style={{ background: C.errorBg, color: C.error }}>
            <AlertCircle size={15} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={clearError} aria-label="Dismiss"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tiers grid */}
      {loading && tierList.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl p-6 space-y-3"
              style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
              <Sk className="h-5 w-2/3" />
              <Sk className="h-3 w-full" />
              <Sk className="h-8 w-1/3" />
            </div>
          ))}
        </div>
      ) : tierList.length === 0 ? (
        <div className="rounded-2xl py-20 text-center"
          style={{ background: C.white, border: `1px solid ${C.border}` }}>
          <Layers size={32} className="mx-auto mb-3" style={{ color: C.textFaint }} />
          <p className="font-semibold" style={{ color: C.textMuted }}>No tiers yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: C.textFaint }}>
            Create your first membership tier to get started.
          </p>
          <motion.button onClick={() => setFormTier("create")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: C.primary }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
            <Plus size={14} /> Create First Tier
          </motion.button>
        </div>
      ) : (
        <motion.div variants={STAGGER} initial="initial" animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {tierList.map((tier) => (
            <motion.div key={tier.id} variants={STAGGER_ITEM}
              className="rounded-2xl p-6 flex flex-col gap-4 group"
              style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}
              whileHover={{ y: -3, boxShadow: C.shadowMd }}
              transition={{ duration: 0.2 }}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-base truncate"
                      style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                      {tier.name}
                    </p>
                    {!tier.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: "#f3f4f6", color: "#6b7280" }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>
                    {tier.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <motion.button onClick={() => setFormTier(tier)}
                    aria-label={`Edit ${tier.name}`}
                    className="p-1.5 rounded-lg" style={{ color: C.textFaint }}
                    whileHover={{ background: C.surfaceLow, color: C.primary }}
                    whileTap={{ scale: 0.9 }}>
                    <Edit2 size={13} />
                  </motion.button>
                  <motion.button onClick={() => setDeleteTarget(tier)}
                    aria-label={`Delete ${tier.name}`}
                    className="p-1.5 rounded-lg" style={{ color: C.textFaint }}
                    whileHover={{ background: C.errorBg, color: C.error }}
                    whileTap={{ scale: 0.9 }}>
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold"
                  style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                  {fmtMoney(tier.price, tier.currency)}
                </span>
                <span className="text-xs" style={{ color: C.textFaint }}>/ {tier.interval}</span>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-1.5">
                {tier.visibility && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize"
                  style={{ background: C.surfaceLow, color: C.textMuted }}>
                  {tier.visibility.replace("_", " ")}
                </span>
                )}
                {tier.can_vote && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1"
                    style={{ background: C.primaryLight, color: C.primary }}>
                    <ShieldCheck size={10} /> Voting
                  </span>
                )}
                {tier.max_members && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: C.surfaceLow, color: C.textMuted }}>
                    Max {tier.max_members}
                  </span>
                )}
              </div>

              {/* Benefits */}
              {(tier.benefits ?? []).length > 0 && (
                <ul className="space-y-1">
                  {(tier.benefits ?? []).slice(0, 3).map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: C.textMuted }}>
                      <CheckCircle2 size={11} style={{ color: C.primaryMid }} aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                  {(tier.benefits ?? []).length > 3 && (
                    <li className="text-[10px]" style={{ color: C.textFaint }}>
                      +{(tier.benefits ?? []).length - 3} more
                    </li>
                  )}
                </ul>
              )}

              {/* Members count */}
              <div className="flex items-center justify-between pt-2 border-t"
                style={{ borderColor: C.border }}>
                <span className="text-[11px] flex items-center gap-1.5" style={{ color: C.textFaint }}>
                  <Users size={11} aria-hidden="true" />
                  {tier.current_member_count ?? 0} members
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Tier form slideover */}
      <AnimatePresence>
        {formTier !== null && (
          <TierFormModal
            tier={formTier === "create" ? null : formTier}
            loading={loading}
            onSubmit={handleSubmit}
            onClose={() => setFormTier(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Tier"
        body={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone. Active members on this tier will need to be reassigned.`}
        confirmLabel="Delete Tier"
        danger
        loading={loading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE TABS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "members",  label: "Members",  icon: Users   },
  { id: "payments", label: "Payments", icon: Receipt },
  { id: "tiers",    label: "Tiers",    icon: Layers  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function MemberManagementPage() {
  const { activeMosque, isHydrating } = useMosque();
  const [activeTab, setActiveTab] = useState<TabId>("members");

  if (isHydrating) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={20} className="animate-spin" style={{ color: C.primaryMid }} />
      </div>
    );
  }

  if (!activeMosque) {
    return (
      <div className="rounded-2xl py-20 text-center"
        style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
        <AlertCircle size={28} className="mx-auto mb-3" style={{ color: "#d97706" }} />
        <p className="font-bold text-base" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
          No active masjid selected
        </p>
        <p className="text-sm mt-1" style={{ color: C.textFaint }}>
          Select a masjid from the switcher to manage members.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.surface, fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Page header */}
        <motion.div {...FADE_UP()} className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: C.textFaint }}>
              Admin · {activeMosque.name}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
              Member Management
            </h1>
          </div>
        </motion.div>

        {/* Tab bar */}
        <motion.div {...FADE_UP(0.06)}
          className="flex items-center gap-1 p-1 rounded-2xl w-fit"
          style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}
          role="tablist" aria-label="Management sections">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <motion.button key={id} role="tab" aria-selected={active}
                aria-controls={`panel-${id}`} id={`tab-${id}`}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={active
                  ? { background: C.primary, color: C.white, boxShadow: "0 2px 12px rgba(0,53,39,0.2)" }
                  : { color: C.textFaint }}
                whileHover={!active ? { background: C.surfaceLow, color: C.text } : {}}
                whileTap={{ scale: 0.97 }}>
                <Icon size={15} aria-hidden="true" />
                {label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Tab panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === "members"  && <MembersTab  masjidId={activeMosque.id} />}
            {activeTab === "payments" && <PaymentsTab masjidId={activeMosque.id} />}
            {activeTab === "tiers"    && <TiersTab    masjidId={activeMosque.id} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}