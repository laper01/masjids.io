"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, CreditCard, Heart, TrendingUp, ChevronRight,
  Loader2, AlertCircle, X, BadgeCheck, Sparkles,
  Building2, Vote, Ticket, Star, Calendar, Receipt,
  Lock, Unlock, Clock, ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemberships } from "@/hooks/memberships/useMemberships";
import type {
  MembershipStatus,
  MyMembershipItem,
  MyPaymentHistoryItem,
  PaymentStatus,
  Tier,
} from "@/types/memberships";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  primary:       "#003527",
  primaryMid:    "#064e3b",
  primaryLight:  "#e8f5ef",
  primaryFixed:  "#b0f0d6",
  gold:          "#d4a853",
  goldLight:     "#fdf3dc",
  surface:       "#faf8ff",
  surfaceLow:    "#f2f3ff",
  surfaceHigh:   "#e2e7ff",
  white:         "#ffffff",
  text:          "#131b2e",
  textMuted:     "#4b5563",
  textFaint:     "#9ca3af",
  border:        "rgba(0,53,39,0.08)",
  borderMid:     "rgba(0,53,39,0.15)",
  error:         "#ba1a1a",
  errorBg:       "#ffdad6",
  shadow:        "0 4px 24px -4px rgba(0,53,39,0.10)",
  shadowMd:      "0 8px 32px -6px rgba(0,53,39,0.14)",
  shadowLg:      "0 20px 48px -8px rgba(0,53,39,0.18)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// STATIC MAPS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MembershipStatus, {
  label: string; color: string; bg: string; dot: string;
}> = {
  active:    { label: "Active Member",  color: C.primary,   bg: C.primaryLight, dot: "#16a34a" },
  pending:   { label: "Pending",        color: "#92400e",   bg: "#fef3c7",       dot: "#d97706" },
  suspended: { label: "Suspended",      color: "#92400e",   bg: "#fef3c7",       dot: "#d97706" },
  cancelled: { label: "Cancelled",      color: C.error,     bg: C.errorBg,       dot: C.error   },
  expired:   { label: "Expired",        color: "#6b7280",   bg: "#f3f4f6",       dot: "#9ca3af" },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid:     { label: "Paid",     color: C.primary, bg: C.primaryLight },
  PAID:     { label: "Paid",     color: C.primary, bg: C.primaryLight },
  pending:  { label: "Pending",  color: "#92400e", bg: "#fef3c7"      },
  PENDING:  { label: "Pending",  color: "#92400e", bg: "#fef3c7"      },
  failed:   { label: "Failed",   color: C.error,   bg: C.errorBg      },
  FAILED:   { label: "Failed",   color: C.error,   bg: C.errorBg      },
  refunded: { label: "Refunded", color: "#6b7280", bg: "#f3f4f6"      },
  REFUNDED: { label: "Refunded", color: "#6b7280", bg: "#f3f4f6"      },
};

const PERK_ICONS = [Vote, Ticket, Building2, ShieldCheck, Sparkles, Star];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtYear(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).getFullYear().toString();
}

function fmtMoney(n?: number | null, currency = "USD"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function paymentIcon(p: MyPaymentHistoryItem) {
  const name = (p.tier_name ?? "").toLowerCase();
  if (name.includes("premium") || name.includes("platinum") || name.includes("annual")) return CreditCard;
  if (name.includes("zakat") || name.includes("sadaqah") || name.includes("ramadan")) return Heart;
  return TrendingUp;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] as number[] },
});

const STAGGER = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const STAGGER_ITEM = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg animate-pulse", className)}
      style={{ background: "rgba(0,53,39,0.06)" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERSHIP LIST CARD — one row per membership record; opens the detail modal
// ─────────────────────────────────────────────────────────────────────────────

function MembershipListCard({ item, onClick }: {
  item: MyMembershipItem;
  onClick: () => void;
}) {
  const normalized = (item.status?.toLowerCase() ?? "") as MembershipStatus;
  const cfg = STATUS_CONFIG[normalized];
  const isInactive = normalized === "cancelled" || normalized === "expired";
  // Unique pattern id per card — SVG <defs> ids must not collide when many
  // of these cards render in the same DOM at once.
  const patternId = `islamic-geo-${item.membership_id}`;

  return (
    <motion.button
      variants={STAGGER_ITEM}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="relative overflow-hidden rounded-2xl p-5 text-left text-white select-none w-full"
      style={{
        background: isInactive
          ? "linear-gradient(135deg, #475569 0%, #64748b 100%)"
          : `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 60%, #0a6644 100%)`,
        boxShadow: "0 16px 40px -10px rgba(0,53,39,0.4)",
        aspectRatio: "1.6",
      }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id={patternId} x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M25 0 L50 12 L50 37 L25 50 L0 37 L0 12 Z" fill="none" stroke="white" strokeWidth="0.8" />
            <circle cx="25" cy="25" r="5" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <div className="relative flex flex-col h-full justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/45 mb-1">Membership</p>
            <p className="text-base font-extrabold leading-tight truncate" style={{ fontFamily: "Manrope, sans-serif" }}>
              {item.masjid.name}
            </p>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg?.dot ?? "#9ca3af" }} aria-hidden="true" />
            {cfg?.label ?? item.status}
          </span>
        </div>

        <div>
          <p className="text-lg font-extrabold leading-tight truncate" style={{ fontFamily: "Manrope, sans-serif" }}>
            {item.tier?.name ?? "Member"}
          </p>
          {item.tier?.price != null && (
            <p className="text-white/55 text-xs mt-1">
              {fmtMoney(item.tier.price, item.tier.currency)} / {item.tier.interval}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Since</p>
            <p className="text-xs font-bold text-white/80">{fmt(item.started_at)}</p>
          </div>
          <div className="w-9 h-6 rounded-md border border-white/20"
            style={{ background: "rgba(212,168,83,0.35)" }} aria-hidden="true" />
        </div>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERSHIP CARD
// ─────────────────────────────────────────────────────────────────────────────

function MembershipCard({
  loading, masjidName, memberName, tierName, status,
  memberSince, membershipId, canVote,
}: {
  loading: boolean;
  masjidName: string;
  memberName: string;
  tierName: string | null;
  status: MembershipStatus | null;
  memberSince: string;
  membershipId: string | null;
  canVote: boolean;
}) {
  const cfg = status ? STATUS_CONFIG[status] : null;
  const hasCard = !!status;

  return (
    <motion.div
      {...FADE_UP(0)}
      className="relative overflow-hidden rounded-3xl p-8 text-white select-none"
      style={{
        background: hasCard
          ? `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 60%, #0a6644 100%)`
          : `linear-gradient(135deg, #1e293b 0%, #334155 100%)`,
        boxShadow: "0 24px 64px -12px rgba(0,53,39,0.45)",
        minHeight: 220,
      }}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.3 }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="islamic-geo" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M30 0 L60 15 L60 45 L30 60 L0 45 L0 15 Z" fill="none" stroke="white" strokeWidth="0.8" />
            <path d="M30 10 L50 20 L50 40 L30 50 L10 40 L10 20 Z" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="30" cy="30" r="6" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic-geo)" />
      </svg>

      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)" }}
        animate={{ x: ["−100%", "200%"] }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 2 }}
      />

      <div className="relative flex flex-col h-full gap-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-1">Membership Card</p>
            <p className="text-lg font-extrabold text-white leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              {masjidName || "—"}
            </p>
          </div>
          {cfg && (
            <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} aria-hidden="true" />
              {cfg.label}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <Sk className="h-8 w-48" />
            <Sk className="h-4 w-32" />
          </div>
        ) : hasCard ? (
          <div>
            <p className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              {memberName}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {tierName ?? "Member"}
              {canVote && (
                <span className="ml-3 inline-flex items-center gap-1 text-[#b0f0d6]">
                  <Vote size={11} aria-hidden="true" /> Voting rights
                </span>
              )}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-extrabold tracking-tight text-white/50" style={{ fontFamily: "Manrope, sans-serif" }}>
              No active membership
            </p>
            <p className="text-white/40 text-sm mt-1">Subscribe to a tier to activate your card</p>
          </div>
        )}

        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Member Since</p>
            <p className="text-sm font-bold text-white/80">{memberSince || "—"}</p>
          </div>
          {membershipId && (
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-0.5">ID</p>
              <p className="text-xs font-mono text-white/50 truncate max-w-[120px]">
                {membershipId.slice(0, 8).toUpperCase()}
              </p>
            </div>
          )}
          <div className="w-10 h-7 rounded-md border border-white/20"
            style={{ background: "rgba(212,168,83,0.35)" }} aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER CARD
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: `benefits` is the only tier field NOT present in the actual
// /api/masjids/:id/tiers response (which does include `description` and
// `can_vote`), so only the benefits list UI has been removed.

function TierCard({ tier, isCurrent, onSubscribe, loading }: {
  tier: Tier;
  isCurrent: boolean;
  onSubscribe: (tierId: string) => void;
  loading: boolean;
}) {
  return (
    <motion.div
      variants={STAGGER_ITEM}
      className="relative rounded-2xl p-5 flex flex-col gap-4 transition-all"
      style={{
        background: isCurrent
          ? `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 100%)`
          : C.white,
        border: isCurrent ? "none" : `1.5px solid ${C.border}`,
        boxShadow: isCurrent ? C.shadowLg : C.shadow,
        color: isCurrent ? C.white : C.text,
      }}
      whileHover={!isCurrent ? { y: -2, boxShadow: C.shadowMd } : {}}
      transition={{ duration: 0.2 }}
    >
      {isCurrent && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
          Current
        </div>
      )}

      <div>
        <p className="text-base font-extrabold leading-snug"
          style={{ fontFamily: "Manrope, sans-serif", color: isCurrent ? C.white : C.text }}>
          {tier.name}
        </p>
        {tier.description && (
          <p className="text-xs mt-1 leading-relaxed"
            style={{ color: isCurrent ? "rgba(255,255,255,0.65)" : C.textMuted }}>
            {tier.description}
          </p>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold"
          style={{ fontFamily: "Manrope, sans-serif", color: isCurrent ? C.white : C.text }}>
          {fmtMoney(tier.price, tier.currency)}
        </span>
        <span className="text-xs" style={{ color: isCurrent ? "rgba(255,255,255,0.5)" : C.textFaint }}>
          / {tier.interval}
        </span>
      </div>

      {tier.can_vote && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: isCurrent ? C.primaryFixed : C.primary }}>
          <Vote size={11} aria-hidden="true" />
          Includes voting rights
        </div>
      )}

      {!isCurrent && (
        <motion.button
          onClick={() => onSubscribe(tier.id)}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-auto disabled:opacity-60"
          style={{ background: C.primary, color: C.white, boxShadow: "0 4px 16px rgba(0,53,39,0.25)" }}
          whileHover={{ scale: 1.02, boxShadow: "0 6px 20px rgba(0,53,39,0.35)" }}
          whileTap={{ scale: 0.97 }}
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : <>Subscribe <ChevronRight size={14} aria-hidden="true" /></>
          }
        </motion.button>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT HISTORY ROW
// ─────────────────────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: MyPaymentHistoryItem }) {
  const Icon = paymentIcon(payment);
  const pill = PAYMENT_STATUS[payment.status] ?? PAYMENT_STATUS.pending;
  const normalizedStatus = payment.status.toLowerCase() as PaymentStatus;

  return (
    <motion.li
      variants={STAGGER_ITEM}
      className="flex items-center gap-4 py-4 border-b last:border-0"
      style={{ borderColor: C.border }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: C.primaryLight, color: C.primary }}>
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{payment.tier_name}</p>
        <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: C.textFaint }}>
          <Clock size={9} aria-hidden="true" />
          {normalizedStatus === "paid" && payment.paid_at ? fmt(payment.paid_at) : "Awaiting payment"}
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ color: pill.color, background: pill.bg }}>
          {pill.label}
        </span>
        <span className="text-sm font-extrabold"
          style={{ fontFamily: "Manrope, sans-serif", color: C.primary }}>
          {fmtMoney(payment.amount, payment.currency)}
        </span>
      </div>
    </motion.li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERK ITEM
// ─────────────────────────────────────────────────────────────────────────────

function PerkItem({ icon: Icon, title, locked }: {
  icon: React.ElementType; title: string; locked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: locked ? "rgba(0,0,0,0.02)" : C.primaryLight, opacity: locked ? 0.5 : 1 }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: locked ? C.surfaceHigh : C.primaryFixed, color: C.primary }}>
        {locked ? <Lock size={13} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
      </div>
      <span className="text-xs font-semibold truncate" style={{ color: locked ? C.textFaint : C.primary }}>
        {title}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────

function CancelConfirmModal({
  open, loading, masjidName, onClose, onConfirm,
}: {
  open: boolean;
  loading: boolean;
  masjidName: string;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (!open) setReason(""); }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <div className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: C.white, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
              <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b"
                style={{ borderColor: C.border }}>
                <h3 id="cancel-title" className="font-bold text-base"
                  style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                  Cancel Membership
                </h3>
                <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg transition-colors"
                  style={{ color: C.textFaint }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <X size={15} />
                </button>
              </div>
              <div className="px-7 py-6 space-y-5">
                <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
                  You're cancelling your membership at{" "}
                  <strong style={{ color: C.text }}>{masjidName}</strong>.
                  Future billing will stop and you'll lose member benefits.
                </p>
                <div>
                  <label htmlFor="cancel-reason"
                    className="block text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: C.textMuted }}>
                    Reason (optional)
                  </label>
                  <textarea id="cancel-reason" rows={3} value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Help us understand why you're leaving…"
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none border-none outline-none focus:ring-2"
                    style={{ background: C.surfaceLow, color: C.text }} />
                </div>
                <div className="flex gap-3">
                  <button onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{ color: C.textMuted, background: C.surfaceLow }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHigh)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = C.surfaceLow)}>
                    Keep Membership
                  </button>
                  <motion.button
                    onClick={() => onConfirm(reason.trim() || undefined)}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: C.error, boxShadow: "0 4px 16px rgba(186,26,26,0.3)" }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {loading
                      ? <Loader2 size={14} className="animate-spin" />
                      : <><BadgeCheck size={14} /> Confirm Cancellation</>
                    }
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
// SUBSCRIBE CONFIRM MODAL — includes payment_method selector
// ─────────────────────────────────────────────────────────────────────────────

function SubscribeConfirmModal({
  open, loading, tierName, masjidName, hasMembership,
  paymentMethod, onPaymentMethodChange, onClose, onConfirm,
}: {
  open: boolean;
  loading: boolean;
  tierName: string;
  masjidName: string;
  hasMembership: boolean;
  paymentMethod: string;
  onPaymentMethodChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="sub-confirm-title">
            <div className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: C.white, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
              <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b"
                style={{ borderColor: C.border }}>
                <h3 id="sub-confirm-title" className="font-bold text-base"
                  style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                  {hasMembership ? "Switch Tier" : "Subscribe to Tier"}
                </h3>
                <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg transition-colors"
                  style={{ color: C.textFaint }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <X size={15} />
                </button>
              </div>
              <div className="px-7 py-6 space-y-4">
                <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
                  You'll be subscribing to{" "}
                  <strong style={{ color: C.text }}>{tierName}</strong>{" "}
                  at {masjidName}. Billing starts immediately.
                </p>

                {/* Payment method selector */}
                <div>
                  <label htmlFor="pm-method"
                    className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: C.textMuted }}>
                    Payment Method
                  </label>
                  <select id="pm-method" value={paymentMethod}
                    onChange={(e) => onPaymentMethodChange(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-2 cursor-pointer"
                    style={{ background: C.surfaceLow, color: C.text }}>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                    style={{ color: C.textMuted, background: C.surfaceLow }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHigh)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = C.surfaceLow)}>
                    Cancel
                  </button>
                  <motion.button onClick={onConfirm} disabled={loading}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: C.primary, boxShadow: "0 4px 16px rgba(0,53,39,0.3)" }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {loading
                      ? <Loader2 size={14} className="animate-spin" />
                      : <><BadgeCheck size={14} /> {hasMembership ? "Confirm Switch" : "Subscribe"}</>
                    }
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
// MEMBERSHIP DETAIL MODAL — full info for one membership, opened by clicking
// its card. Data (current tier, benefits, payment history) is only fetched
// once this is open, so nothing here is ever shown before the user asks for it.
// ─────────────────────────────────────────────────────────────────────────────

function MembershipDetailModal({
  open, onClose,
  loadingMembership, loadingPayments, loadingTiers,
  masjidName, tierName, status, memberSince, startedAt, nextBillingAt,
  membershipId, canVote, hasMembership,
  sortedTiers, currentTierId,
  payments, ytdTotal, yearlyGoal, ytdPct, currency,
  onSubscribeClick, onCancelClick, subscribeBusy, subscribingTierId,
}: {
  open: boolean;
  onClose: () => void;
  loadingMembership: boolean;
  loadingPayments: boolean;
  loadingTiers: boolean;
  masjidName: string;
  tierName: string | null;
  status: MembershipStatus | null;
  memberSince: string;
  startedAt?: string | null;
  nextBillingAt?: string | null;
  membershipId: string | null;
  canVote: boolean;
  hasMembership: boolean;
  sortedTiers: Tier[];
  currentTierId: string | null;
  payments: Array<MyPaymentHistoryItem & { status: PaymentStatus }>;
  ytdTotal: number;
  yearlyGoal: number;
  ytdPct: number;
  currency: string;
  onSubscribeClick: (tierId: string) => void;
  onCancelClick: () => void;
  subscribeBusy: boolean;
  subscribingTierId: string | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
            <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl"
              style={{ background: C.surface, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

              <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b"
                style={{ background: C.surface, borderColor: C.border }}>
                <h3 id="detail-modal-title" className="font-bold text-base"
                  style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                  Membership details
                </h3>
                <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg transition-colors"
                  style={{ color: C.textFaint }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <X size={16} />
                </button>
              </div>

              <div className="p-6">
                {hasMembership && status !== "cancelled" && (
                  <div className="flex justify-end mb-4">
                    <button onClick={onCancelClick}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: C.textFaint }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = C.error)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.textFaint)}>
                      Cancel membership
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

                  {/* Left column */}
                  <div className="md:col-span-3 space-y-6">
                    <MembershipCard
                      loading={loadingMembership}
                      masjidName={masjidName}
                      memberName="Friend"
                      tierName={tierName}
                      status={status}
                      memberSince={memberSince}
                      membershipId={membershipId}
                      canVote={canVote}
                    />

                    {hasMembership && (
                      <div className="rounded-2xl p-6"
                        style={{ background: C.white, boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
                        <h2 className="text-sm font-bold mb-5"
                          style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                          Membership Details
                        </h2>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                          {[
                            { label: "Status",       value: status ? (STATUS_CONFIG[status]?.label ?? status) : "—", icon: ShieldCheck },
                            { label: "Tier",         value: tierName ?? "—",         icon: Star     },
                            { label: "Started",      value: fmt(startedAt),          icon: Calendar },
                            { label: "Next Billing", value: fmt(nextBillingAt),      icon: Clock    },
                          ].map(({ label, value, icon: I }) => (
                            <div key={label} className="flex items-start gap-2.5">
                              <I size={13} className="mt-0.5 shrink-0" style={{ color: C.textFaint }} aria-hidden="true" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.textFaint }}>
                                  {label}
                                </p>
                                <p className="text-sm font-semibold mt-0.5" style={{ color: C.text }}>{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {canVote && (
                          <div className="mt-5 pt-4 flex items-center gap-2 text-xs font-bold border-t"
                            style={{ borderColor: C.border, color: C.primary }}>
                            <Unlock size={13} aria-hidden="true" />
                            Voting rights enabled for this masjid
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-2xl p-6"
                      style={{ background: C.white, boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                          Membership Benefits
                        </h2>
                        {hasMembership && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                            style={{ background: C.primaryLight, color: C.primary }}>
                            {tierName}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { icon: Vote,        title: "Voting Rights",    locked: !hasMembership },
                          { icon: Ticket,      title: "Event Discounts",  locked: !hasMembership },
                          { icon: Building2,   title: "Hall Booking",     locked: !hasMembership },
                          { icon: ShieldCheck, title: "Priority Support", locked: !hasMembership },
                          { icon: Star,        title: "Member Badge",     locked: !hasMembership },
                          { icon: Receipt,     title: "Tax Receipts",     locked: !hasMembership },
                        ].map(({ icon, title, locked }) => (
                          <PerkItem key={title} icon={icon} title={title} locked={locked} />
                        ))}
                      </div>
                      {!hasMembership && (
                        <p className="text-xs mt-4 text-center" style={{ color: C.textFaint }}>
                          Subscribe to a tier to unlock these benefits
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl p-6"
                      style={{ background: C.white, boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                          Contribution History
                        </h2>
                        <button className="text-xs font-semibold flex items-center gap-1 transition-colors"
                          style={{ color: C.primary }} aria-label="View all receipts">
                          <ReceiptText size={13} aria-hidden="true" />
                          View receipts
                        </button>
                      </div>

                      {hasMembership && yearlyGoal > 0 && (
                        <div className="mb-6 p-4 rounded-xl" style={{ background: C.surfaceLow }}>
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-semibold" style={{ color: C.textMuted }}>
                              {new Date().getFullYear()} Contributions
                            </p>
                            <p className="text-xs font-bold" style={{ color: C.primary }}>
                              {fmtMoney(ytdTotal, currency)} / {fmtMoney(yearlyGoal, currency)}
                            </p>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: C.surfaceHigh }}
                            role="progressbar" aria-valuenow={ytdTotal} aria-valuemin={0} aria-valuemax={yearlyGoal}
                            aria-label={`${ytdPct}% of yearly contribution goal`}>
                            <motion.div className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.primaryMid})` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${ytdPct}%` }}
                              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                          </div>
                        </div>
                      )}

                      {loadingPayments ? (
                        <div className="space-y-4 py-2">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                              <Sk className="w-10 h-10 rounded-xl" />
                              <div className="flex-1 space-y-2">
                                <Sk className="h-3 w-40" />
                                <Sk className="h-2 w-24" />
                              </div>
                              <Sk className="h-4 w-16" />
                            </div>
                          ))}
                        </div>
                      ) : payments.length === 0 ? (
                        <div className="py-8 text-center">
                          <Receipt size={28} className="mx-auto mb-2" style={{ color: C.textFaint }} />
                          <p className="text-sm" style={{ color: C.textFaint }}>No contribution history yet.</p>
                        </div>
                      ) : (
                        <motion.ul variants={STAGGER} initial="initial" animate="animate"
                          className="divide-y" style={{ borderColor: C.border }}>
                          {payments.slice(0, 5).map((p) => (
                            <PaymentRow key={p.payment_id} payment={p} />
                          ))}
                        </motion.ul>
                      )}
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl p-6"
                      style={{ background: C.white, boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold" style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
                          Available Tiers
                        </h2>
                        {sortedTiers.length > 0 && (
                          <span className="text-[10px] font-semibold" style={{ color: C.textFaint }}>
                            {sortedTiers.length} plan{sortedTiers.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {loadingTiers ? (
                        <div className="space-y-3">
                          {[0, 1].map((i) => <Sk key={i} className="h-32 rounded-xl" />)}
                        </div>
                      ) : sortedTiers.length === 0 ? (
                        <div className="py-8 text-center">
                          <Sparkles size={24} className="mx-auto mb-2" style={{ color: C.textFaint }} />
                          <p className="text-sm" style={{ color: C.textFaint }}>No tiers available yet.</p>
                        </div>
                      ) : (
                        <motion.div variants={STAGGER} initial="initial" animate="animate" className="space-y-3">
                          {sortedTiers.map((tier) => (
                            <TierCard
                              key={tier.id}
                              tier={tier}
                              isCurrent={tier.id === currentTierId}
                              onSubscribe={onSubscribeClick}
                              loading={subscribeBusy && subscribingTierId === tier.id}
                            />
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {hasMembership && status === "active" && (
                      <div className="rounded-2xl p-6 text-center"
                        style={{
                          background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 100%)`,
                          boxShadow: C.shadowMd,
                        }}>
                        <p className="text-2xl mb-2" aria-hidden="true">🤲</p>
                        <p className="text-base font-extrabold text-white mb-1"
                          style={{ fontFamily: "Manrope, sans-serif" }}>
                          JazakAllahu Khairan
                        </p>
                        <p className="text-white/60 text-xs leading-relaxed">
                          Your support strengthens our community and keeps the sanctuary running.
                          May Allah accept your contributions.
                        </p>
                      </div>
                    )}
                  </div>
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
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

type ConfirmKind =
  | { kind: "subscribe"; tierId: string; tierName: string }
  | { kind: "cancel" }
  | null;


export default function MembershipPage() {
  const {
    myMemberships,
    myPaymentHistory,
    tiers,
    loading,
    error,
    getMyMemberships,
    getMyPaymentHistory,
    cancelMyMembership,
    getTiers,
    subscribeToTier,
    clearError,
  } = useMemberships();

  const [selectedItem, setSelectedItem]   = useState<MyMembershipItem | null>(null);
  const [detailOpen, setDetailOpen]       = useState(false);
  const [confirm, setConfirm]             = useState<ConfirmKind>(null);
  const [busy, setBusy]                   = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");

  // MEM-ME-01: fetch all memberships on mount
  useEffect(() => {
    void getMyMemberships({ page: 1, limit: 50 });
  }, [getMyMemberships]);

  // Every record from the list, newest first. `membership_id` (unique per
  // record) is used as the React key elsewhere — this list is intentionally
  // NOT deduped by masjid, since the whole point of this view is to show
  // every record exactly as the backend returned it.
  const membershipItems = useMemo<MyMembershipItem[]>(() => {
    const items = myMemberships?.data ?? [];
    return [...items].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }, [myMemberships]);

  const selectedMasjidId = selectedItem?.masjid.id ?? null;

  const handleCardClick = useCallback((item: MyMembershipItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => setDetailOpen(false), []);

  // Tiers + payment history — fetched only once the modal is actually open.
  // NOTE: we deliberately do NOT call a separate "get membership detail by
  // masjid" endpoint here. That endpoint is scoped per-masjid, not per
  // membership_id — a masjid can have several membership records (e.g. old
  // pending attempts), and the endpoint always resolves to whichever one the
  // backend considers "current," regardless of which specific card the user
  // clicked. Using it caused clicking one record to show another record's
  // data. All per-record fields (status, tier, started_at, next_billing_at,
  // can_vote, membership_id) are already present on the clicked list item
  // itself, so we use that directly instead.
  useEffect(() => {
    if (!detailOpen || !selectedMasjidId) return;
    void getTiers(selectedMasjidId);
    void getMyPaymentHistory({ page: 1, limit: 20 });
  }, [detailOpen, selectedMasjidId, getTiers, getMyPaymentHistory]);

  // ── Derived (detail modal) ──────────────────────────────────────────────────
  // membership = the exact record the user clicked, not a separate fetch —
  // this is what actually fixes the "wrong tier shown" bug.
  const membership      = selectedItem;
  const hasMembership   = !!membership;
  // API returns status uppercase (e.g. "ACTIVE"), STATUS_CONFIG keys are lowercase
  const status          = (membership?.status
    ? (membership.status.toLowerCase() as MembershipStatus)
    : null);
  const tierName        = membership?.tier?.name ?? null;
  const currentTierId   = membership?.tier?.id ?? null;
  const canVote         = membership?.can_vote ?? false;

  const sortedTiers = useMemo(
    () => (tiers?.data ?? []).filter((t) => t.is_active).sort((a, b) => a.price - b.price),
    [tiers]
  );

  const currentTier = useMemo(
    () => sortedTiers.find((t) => t.id === currentTierId) ?? null,
    [sortedTiers, currentTierId]
  );

  const payments = useMemo(() => {
    const history = myPaymentHistory?.data?.history;
    if (!Array.isArray(history) || !selectedMasjidId) return [];
    return history
      .filter((p) => p.masjid.id === selectedMasjidId)
      .map((p) => ({ ...p, status: p.status as PaymentStatus }));
  }, [myPaymentHistory, selectedMasjidId]);

  const ytdTotal = useMemo(() => {
    const year = new Date().getFullYear();
    return payments
      .filter((p) => p.status.toLowerCase() === "paid" && p.paid_at && new Date(p.paid_at).getFullYear() === year)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const yearlyGoal = useMemo(() => {
    if (!currentTier) return 0;
    return currentTier.interval === "monthly" ? currentTier.price * 12 : currentTier.price;
  }, [currentTier]);

  const ytdPct = yearlyGoal > 0 ? Math.min(100, Math.round((ytdTotal / yearlyGoal) * 100)) : 0;
  const currency = currentTier?.currency ?? membership?.tier?.currency ?? "USD";

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubscribeClick = useCallback((tierId: string) => {
    const tier = sortedTiers.find((t) => t.id === tierId);
    if (tier) setConfirm({ kind: "subscribe", tierId: tier.id, tierName: tier.name });
  }, [sortedTiers]);

  const runConfirm = useCallback(async (reason?: string) => {
    if (!selectedMasjidId || !confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "subscribe") {
        // Pass payment_method to API — required field
        const res = await subscribeToTier(selectedMasjidId, confirm.tierId, paymentMethod);
        // If the backend returns a Stripe Checkout URL (e.g. for card payments),
        // redirect there instead of treating this as an immediately-completed
        // subscription — mirrors the public membership page's behavior.
        if (res?.data?.payment_url) {
          window.location.href = res.data.payment_url;
          return;
        }
        if (res) {
          const refreshed = await getMyMemberships({ page: 1, limit: 50 });
          const latest = (refreshed?.data ?? [])
            .filter((m) => m.masjid.id === selectedMasjidId)
            .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
          if (latest) setSelectedItem(latest);
          await getMyPaymentHistory({ page: 1, limit: 20 });
        }
      } else if (confirm.kind === "cancel") {
        const res = await cancelMyMembership(selectedMasjidId, reason);
        if (res) {
          const refreshed = await getMyMemberships({ page: 1, limit: 50 });
          const latest = (refreshed?.data ?? [])
            .filter((m) => m.masjid.id === selectedMasjidId)
            .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
          if (latest) setSelectedItem(latest);
        }
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }, [
    selectedMasjidId, confirm, paymentMethod,
    subscribeToTier, cancelMyMembership,
    getMyMemberships, getMyPaymentHistory,
  ]);

  const isLoadingPayments = loading && !myPaymentHistory;
  const isLoadingTiers    = loading && !tiers;
  const isLoadingList     = loading && membershipItems.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: C.surface, fontFamily: "Inter, sans-serif", color: C.text }}>
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Page header */}
        <motion.div {...FADE_UP(0)}>
          <h1 className="text-2xl font-extrabold tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            My Membership
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.textMuted }}>
            Tap a membership to view its full details, tiers, and payment history.
          </p>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="alert"
              className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm"
              style={{ background: C.errorBg, color: C.error, border: `1px solid rgba(186,26,26,0.2)` }}>
              <AlertCircle size={15} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={clearError} aria-label="Dismiss error"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Membership list */}
        {isLoadingList ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <Sk key={i} className="h-[190px] rounded-2xl" />)}
          </div>
        ) : membershipItems.length === 0 ? (
          <div className="py-16 text-center rounded-2xl"
            style={{ background: C.white, border: `1px solid ${C.border}` }}>
            <Sparkles size={28} className="mx-auto mb-3" style={{ color: C.textFaint }} />
            <p className="font-semibold" style={{ color: C.textMuted }}>No memberships yet</p>
            <p className="text-sm mt-1" style={{ color: C.textFaint }}>
              Join a masjid membership to see it listed here.
            </p>
          </div>
        ) : (
          <motion.div variants={STAGGER} initial="initial" animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {membershipItems.map((item) => (
              <MembershipListCard
                key={item.membership_id}
                item={item}
                onClick={() => handleCardClick(item)}
              />
            ))}
          </motion.div>
        )}
      </main>

      {/* Detail modal — full membership info, only fetched after a card is clicked */}
      <MembershipDetailModal
        open={detailOpen}
        onClose={closeDetail}
        loadingMembership={false}
        loadingPayments={isLoadingPayments}
        loadingTiers={isLoadingTiers}
        masjidName={membership?.masjid.name ?? selectedItem?.masjid.name ?? ""}
        tierName={tierName}
        status={status}
        memberSince={fmtYear(membership?.started_at)}
        startedAt={membership?.started_at}
        nextBillingAt={membership?.next_billing_at}
        membershipId={membership?.membership_id ?? null}
        canVote={canVote}
        hasMembership={hasMembership}
        sortedTiers={sortedTiers}
        currentTierId={currentTierId}
        payments={payments}
        ytdTotal={ytdTotal}
        yearlyGoal={yearlyGoal}
        ytdPct={ytdPct}
        currency={currency}
        onSubscribeClick={handleSubscribeClick}
        onCancelClick={() => setConfirm({ kind: "cancel" })}
        subscribeBusy={busy}
        subscribingTierId={confirm?.kind === "subscribe" ? confirm.tierId : null}
      />

      {/* Subscribe — with payment_method selector */}
      <SubscribeConfirmModal
        open={confirm?.kind === "subscribe"}
        loading={busy}
        tierName={confirm?.kind === "subscribe" ? confirm.tierName : ""}
        masjidName={membership?.masjid.name ?? "this masjid"}
        hasMembership={hasMembership}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onClose={() => setConfirm(null)}
        onConfirm={() => runConfirm()}
      />

      {/* Cancel — with reason textarea */}
      <CancelConfirmModal
        open={confirm?.kind === "cancel"}
        loading={busy}
        masjidName={membership?.masjid.name ?? "this masjid"}
        onClose={() => setConfirm(null)}
        onConfirm={(reason) => runConfirm(reason)}
      />
    </div>
  );
}