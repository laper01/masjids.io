"use client";

/**
 * app/(public)/public-masjids/[id]/memberships/page.tsx
 */

import { useEffect, useState, useMemo, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, X, Loader2, ShieldCheck, Sparkles,
  ChevronRight, AlertCircle, BadgeCheck, Users, Clock,
  Calendar, Zap, Star, Lock, CreditCard,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemberships } from "@/hooks/memberships/useMemberships";
import type { Tier, MembershipStatus, TierBillingCycle } from "@/types/memberships";

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
// STATUS CONFIG — with fallback
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FALLBACK = { label: "Member", color: C.primary, bg: C.primaryLight, dot: "#16a34a" };

const MEMBERSHIP_STATUS_CONFIG: Record<MembershipStatus, {
  label: string; color: string; bg: string; dot: string;
}> = {
  active:    { label: "Active Member",  color: C.primary,   bg: C.primaryLight, dot: "#16a34a" },
  pending:   { label: "Pending",        color: "#92400e",   bg: "#fef3c7",      dot: "#d97706" },
  suspended: { label: "Suspended",      color: "#92400e",   bg: "#fef3c7",      dot: "#d97706" },
  cancelled: { label: "Cancelled",      color: C.error,     bg: C.errorBg,      dot: C.error   },
  expired:   { label: "Expired",        color: "#6b7280",   bg: "#f3f4f6",      dot: "#9ca3af" },
};

function getStatusCfg(status?: MembershipStatus | null) {
  if (!status) return STATUS_FALLBACK;
  return MEMBERSHIP_STATUS_CONFIG[status] ?? STATUS_FALLBACK;
}

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
    month: "long", day: "numeric", year: "numeric",
  });
}

function intervalLabel(interval: TierBillingCycle): string {
  const map: Record<TierBillingCycle, string> = {
    monthly:  "per month",
    yearly:   "per year",
  };
  return map[interval] ?? interval;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] as number[] },
});

const STAGGER = { animate: { transition: { staggerChildren: 0.08 } } };
const STAGGER_ITEM = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg animate-pulse ${className}`}
      style={{ background: "rgba(0,53,39,0.06)" }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENT MEMBERSHIP CARD
// ─────────────────────────────────────────────────────────────────────────────

function CurrentMembershipCard({
  status, tierName, nextBilling, expiresAt, canVote, onCancel, cancelLoading,
}: {
  status: MembershipStatus;
  tierName: string | null;
  nextBilling: string | null;
  expiresAt: string | null;
  canVote: boolean;
  onCancel: () => void;
  cancelLoading: boolean;
}) {
  // Always use getStatusCfg — never crashes even on unknown status values
  const cfg = getStatusCfg(status);
  const showCancel = status !== "cancelled" && status !== "expired";

  return (
    <motion.div {...FADE_UP(0.1)} data-testid="current-membership-card" className="rounded-2xl p-6"
      style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 100%)`,
        boxShadow: "0 16px 48px -8px rgba(0,53,39,0.35)",
        color: C.white,
      }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-1">
            Your Membership
          </p>
          <p data-testid="current-membership-tier-name" className="text-2xl font-extrabold leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            {tierName ?? "Active Member"}
          </p>
        </div>
        <span data-testid="current-membership-status-badge" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} aria-hidden="true" />
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: "Next Billing", value: fmtDate(nextBilling), icon: Calendar, testid: "current-membership-next-billing" },
          { label: "Expires",      value: fmtDate(expiresAt),   icon: Clock,    testid: "current-membership-expires" },
        ].map(({ label, value, icon: I, testid }) => (
          <div key={label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{label}</p>
            <p data-testid={testid} className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
              <I size={12} aria-hidden="true" />{value}
            </p>
          </div>
        ))}
      </div>

      {canVote && (
        <div data-testid="current-membership-voting-rights-badge" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold mb-5"
          style={{ background: "rgba(176,240,214,0.25)", color: C.primaryFixed }}>
          <ShieldCheck size={12} aria-hidden="true" />
          Voting Rights Enabled
        </div>
      )}

      {showCancel && (
        <div className="pt-4 border-t border-white/10">
          <button
            data-testid="current-membership-cancel-button"
            onClick={onCancel} disabled={cancelLoading}
            className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50">
            {cancelLoading && <Loader2 size={11} className="animate-spin" />}
            Cancel membership
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER CARD
// ─────────────────────────────────────────────────────────────────────────────

function TierCard({ tier, isCurrent, isPopular, isAuthenticated, onSubscribe, subscribing }: {
  tier: Tier; isCurrent: boolean; isPopular: boolean;
  isAuthenticated: boolean;
  onSubscribe: (tierId: string) => void;
  subscribing: boolean;
}) {
  return (
    <motion.div variants={STAGGER_ITEM}
      data-testid={`tier-card-${tier.id}`}
      data-tier-current={isCurrent}
      data-tier-popular={isPopular}
      className="relative rounded-2xl flex flex-col"
      style={{
        background: isCurrent
          ? `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 100%)`
          : C.white,
        border: isPopular && !isCurrent ? `2px solid ${C.primaryFixed}` : `1px solid ${C.border}`,
        boxShadow: isCurrent ? C.shadowLg : C.shadow,
        color: isCurrent ? C.white : C.text,
      }}
      whileHover={!isCurrent ? { y: -4, boxShadow: C.shadowMd } : {}}
      transition={{ duration: 0.22 }}>

      {isPopular && !isCurrent && (
        <div data-testid="tier-popular-badge" className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5"
          style={{ background: C.primaryFixed, color: C.primary }}>
          <Star size={11} aria-hidden="true" /> Most Popular
        </div>
      )}
      {isCurrent && (
        <div data-testid="tier-current-badge" className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5"
          style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: C.white }}>
          <BadgeCheck size={11} aria-hidden="true" /> Your Plan
        </div>
      )}

      <div className="p-6 flex flex-col gap-5 flex-1 mt-2">
        <div>
          <h3 data-testid="tier-name" className="text-lg font-extrabold leading-snug mb-1"
            style={{ fontFamily: "Manrope, sans-serif", color: isCurrent ? C.white : C.text }}>
            {tier.name}
          </h3>
          {tier.description && (
            <p className="text-xs leading-relaxed"
              style={{ color: isCurrent ? "rgba(255,255,255,0.65)" : C.textMuted }}>
              {tier.description}
            </p>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span data-testid="tier-price" className="text-3xl font-extrabold"
            style={{ fontFamily: "Manrope, sans-serif", color: isCurrent ? C.white : C.text }}>
            {fmtMoney(tier.price, tier.currency)}
          </span>
          <span className="text-xs" style={{ color: isCurrent ? "rgba(255,255,255,0.5)" : C.textFaint }}>
            {intervalLabel(tier.interval)}
          </span>
        </div>

        {(tier.benefits ?? []).length > 0 ? (
          <ul className="space-y-2.5 flex-1">
            {(tier.benefits ?? []).map((benefit, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5"
                  style={{ color: isCurrent ? C.primaryFixed : C.primaryMid }} aria-hidden="true" />
                <span style={{ color: isCurrent ? "rgba(255,255,255,0.8)" : C.textMuted }}>{benefit}</span>
              </li>
            ))}
          </ul>
        ) : <div className="flex-1" />}

        {tier.can_vote && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold"
            style={{ color: isCurrent ? C.primaryFixed : C.primary }}>
            <ShieldCheck size={12} aria-hidden="true" />
            Includes voting rights
          </div>
        )}

        {tier.max_members && (
          <div className="flex items-center gap-1.5 text-[11px]"
            style={{ color: isCurrent ? "rgba(255,255,255,0.5)" : C.textFaint }}>
            <Users size={11} aria-hidden="true" />
            {tier.current_member_count ?? 0} / {tier.max_members} members
          </div>
        )}

        {isCurrent ? (
          <div data-testid="tier-current-plan-indicator" className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <BadgeCheck size={15} aria-hidden="true" /> Current Plan
          </div>
        ) : !isAuthenticated ? (
          <div data-testid="tier-signin-required" className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
            style={{ background: C.surfaceLow, color: C.textFaint }}>
            <Lock size={14} aria-hidden="true" /> Sign in to subscribe
          </div>
        ) : (
          <motion.button
            data-testid="tier-subscribe-button"
            onClick={() => onSubscribe(tier.id)} disabled={subscribing}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{
              background: isPopular
                ? `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})`
                : C.primary,
              boxShadow: isPopular ? "0 4px 16px rgba(0,53,39,0.3)" : "none",
            }}
            whileHover={{ scale: 1.02, boxShadow: "0 6px 20px rgba(0,53,39,0.35)" }}
            whileTap={{ scale: 0.97 }}
            aria-label={`Subscribe to ${tier.name}`}>
            {subscribing ? <Loader2 size={14} className="animate-spin" /> : (
              <><Zap size={14} aria-hidden="true" />Subscribe<ChevronRight size={14} aria-hidden="true" /></>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIBE CONFIRM MODAL — payment method fixed to Credit Card (only option)
// ─────────────────────────────────────────────────────────────────────────────

function SubscribeModal({
  tier, hasMembership,
  loading, onClose, onConfirm,
}: {
  tier: Tier; hasMembership: boolean;
  loading: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        data-testid="subscribe-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="sub-modal-title">
        <div className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: C.white, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
          <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b"
            style={{ borderColor: C.border }}>
            <h3 id="sub-modal-title" data-testid="subscribe-modal-title" className="font-bold text-base"
              style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
              {hasMembership ? "Switch Membership Plan" : "Confirm Subscription"}
            </h3>
            <button
              data-testid="subscribe-modal-close"
              onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg"
              style={{ color: C.textFaint }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
              <X size={15} />
            </button>
          </div>
          <div className="px-7 py-6 space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
              You're subscribing to{" "}
              <strong style={{ color: C.text }}>{tier.name}</strong>{" "}
              at {fmtMoney(tier.price, tier.currency)} {intervalLabel(tier.interval)}.
              Billing starts immediately.
            </p>

            {/* Payment method — fixed to Credit Card (only method supported) */}
            <div>
              <p className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: C.textMuted }}>
                Payment Method
              </p>
              <div data-testid="payment-method-display"
                className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ background: C.surfaceLow, color: C.text }}>
                <CreditCard size={15} style={{ color: C.primaryMid }} aria-hidden="true" />
                Credit Card
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                data-testid="subscribe-modal-cancel"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ color: C.textMuted, background: C.surfaceLow }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHigh)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.surfaceLow)}>
                Cancel
              </button>
              <motion.button
                data-testid="subscribe-confirm-button"
                onClick={onConfirm} disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: C.primary, boxShadow: "0 4px 16px rgba(0,53,39,0.3)" }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : (
                  hasMembership ? "Switch Plan" : "Subscribe Now"
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────

function CancelModal({ loading, onClose, onConfirm }: {
  loading: boolean; onClose: () => void; onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }} transition={{ duration: 0.25 }}
        data-testid="cancel-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
        <div className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: C.white, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
          <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b"
            style={{ borderColor: C.border }}>
            <h3 id="cancel-modal-title" className="font-bold text-base"
              style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
              Cancel Membership
            </h3>
            <button
              data-testid="cancel-modal-close"
              onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg"
              style={{ color: C.textFaint }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceLow)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
              <X size={15} />
            </button>
          </div>
          <div className="px-7 py-6 space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: C.textMuted }}>
              Are you sure you want to cancel? You'll retain access until the end of your
              current billing period.
            </p>
            <div>
              <label htmlFor="cancel-reason"
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: C.textMuted }}>
                Reason (optional)
              </label>
              <textarea id="cancel-reason" data-testid="cancel-reason-textarea" rows={3} value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Help us understand why you're leaving…"
                className="w-full px-4 py-3 rounded-xl text-sm resize-none border-none outline-none focus:ring-2"
                style={{ background: C.surfaceLow, color: C.text }} />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                data-testid="cancel-keep-button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ color: C.textMuted, background: C.surfaceLow }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHigh)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.surfaceLow)}>
                Keep Membership
              </button>
              <motion.button
                data-testid="cancel-confirm-button"
                onClick={() => onConfirm(reason.trim() || undefined)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: C.error, boxShadow: "0 4px 16px rgba(186,26,26,0.3)" }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Cancel Membership"}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS TOAST
// ─────────────────────────────────────────────────────────────────────────────

function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      data-testid="success-toast"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl"
      style={{ background: C.primary, color: C.white, boxShadow: "0 16px 40px rgba(0,53,39,0.35)" }}
      role="status" aria-live="polite">
      <CheckCircle2 size={18} style={{ color: C.primaryFixed }} aria-hidden="true" />
      <p className="text-sm font-semibold">{message}</p>
      <button data-testid="success-toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">
        <X size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

interface PageParams { params: Promise<{ id: string }> }

// Only payment method currently supported
const PAYMENT_METHOD = "credit_card";

export default function MasjidMembershipsPage({ params }: PageParams) {
  const { id: masjidId } = use(params);
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const {
    tiers, myMasjidMembership, loading, error,
    getTiers, getMyMasjidMembership, subscribeToTier, cancelMyMembership, clearError,
  } = useMemberships();

  const [subscribingId, setSubscribingId]       = useState<string | null>(null);
  const [cancelModal, setCancelModal]           = useState(false);
  const [confirmSubscribe, setConfirmSubscribe] = useState<Tier | null>(null);
  const [toast, setToast]                       = useState<string | null>(null);
  const [cancelLoading, setCancelLoading]       = useState(false);

  // Fetch on mount — silently ignore 400 "no membership" for getMyMasjidMembership
  useEffect(() => {
    void getTiers(masjidId);
    if (isAuthenticated) {
      getMyMasjidMembership(masjidId).catch(() => {});
    }
  }, [masjidId, isAuthenticated, getTiers, getMyMasjidMembership]);

  // Clear "no active membership" 400 errors — expected for non-members
  useEffect(() => {
    if (error?.includes("400") || error?.toLowerCase().includes("no active membership")) {
      clearError();
    }
  }, [error, clearError]);

  const tierList = useMemo(
    () => (tiers?.data ?? []).filter((t) => t.is_active).sort((a, b) => a.price - b.price),
    [tiers]
  );

  const membership    = myMasjidMembership?.data ?? null;
  const hasMembership = !!membership && membership.status !== "cancelled" && membership.status !== "expired";
  const currentTierId = membership?.tier?.id ?? null;

  const popularTierId = useMemo(() => {
    if (tierList.length < 3) return tierList[tierList.length - 1]?.id ?? null;
    return tierList[Math.floor(tierList.length / 2)]?.id ?? null;
  }, [tierList]);

  const handleSubscribeClick = useCallback((tierId: string) => {
    const tier = tierList.find((t) => t.id === tierId);
    if (tier) setConfirmSubscribe(tier);
  }, [tierList]);

  const handleConfirmSubscribe = useCallback(async () => {
    if (!confirmSubscribe) return;
    setSubscribingId(confirmSubscribe.id);
    setConfirmSubscribe(null);

    const res = await subscribeToTier(masjidId, confirmSubscribe.id, PAYMENT_METHOD);

    if (res?.data?.payment_url) {
      // Langsung redirect ke Stripe Checkout
      window.location.href = res.data.payment_url;
      return;
    }

    if (res) {
      // Fallback kalau payment_url kosong (e.g. cash)
      setToast(`Successfully subscribed to ${confirmSubscribe.name}!`);
      await getMyMasjidMembership(masjidId);
    }

    setSubscribingId(null);
  }, [confirmSubscribe, masjidId, subscribeToTier, getMyMasjidMembership]);

  const handleCancelConfirm = useCallback(async (reason?: string) => {
    setCancelLoading(true);
    const res = await cancelMyMembership(masjidId, reason);
    if (res) {
      setToast("Your membership has been cancelled.");
      await getMyMasjidMembership(masjidId);
    }
    setCancelLoading(false);
    setCancelModal(false);
  }, [masjidId, cancelMyMembership, getMyMasjidMembership]);

  return (
    <div data-testid="memberships-page" className="min-h-screen"
      style={{ background: C.surface, fontFamily: "Inter, sans-serif", color: C.text }}>
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">

        {/* Hero */}
        <motion.div {...FADE_UP(0)} className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-2"
            style={{ background: C.primaryLight, color: C.primary }}>
            <Sparkles size={13} aria-hidden="true" />
            Membership Plans
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            Support Your{" "}
            <span style={{ color: C.primary }}>Sacred Community</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: C.textMuted }}>
            Join as a member to unlock exclusive benefits, support the masjid's mission,
            and strengthen the Ummah together.
          </p>
        </motion.div>

        {/* Error banner — only show real errors, not 400 "no membership" */}
        <AnimatePresence>
          {error && !error.includes("400") && !error.toLowerCase().includes("no active membership") && (
            <motion.div {...FADE_UP()} role="alert"
              data-testid="memberships-error-banner"
              className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm"
              style={{ background: C.errorBg, color: C.error, border: `1px solid rgba(186,26,26,0.2)` }}>
              <AlertCircle size={15} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button data-testid="memberships-error-dismiss" onClick={clearError} aria-label="Dismiss error"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current membership */}
        <AnimatePresence>
          {isAuthenticated && hasMembership && membership && (
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              data-testid="current-membership-section"
              aria-labelledby="current-membership-heading">
              <h2 id="current-membership-heading"
                className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
                style={{ color: C.textFaint }}>
                Your Current Membership
              </h2>
              <CurrentMembershipCard
                status={membership.status}
                tierName={membership.tier?.name ?? null}
                nextBilling={membership.next_billing_at}
                expiresAt={membership.expires_at}
                canVote={membership.can_vote}
                onCancel={() => setCancelModal(true)}
                cancelLoading={cancelLoading}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Tier grid */}
        <section aria-labelledby="tiers-heading">
          <div className="text-center mb-10">
            <h2 id="tiers-heading" className="text-2xl font-extrabold tracking-tight mb-2"
              style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
              {hasMembership ? "Switch or Upgrade Your Plan" : "Choose Your Membership Plan"}
            </h2>
            <p className="text-sm" style={{ color: C.textFaint }}>
              {hasMembership
                ? "Upgrade to unlock more benefits or switch to a different tier."
                : "Select a plan that aligns with your commitment to the community."}
            </p>
          </div>

          {loading && tierList.length === 0 ? (
            <div data-testid="tiers-loading-skeleton" className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl p-6 space-y-4"
                  style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                  <Sk className="h-6 w-3/4" />
                  <Sk className="h-4 w-full" />
                  <Sk className="h-10 w-1/2" />
                  <div className="space-y-2 pt-2">
                    <Sk className="h-3 w-full" />
                    <Sk className="h-3 w-4/5" />
                    <Sk className="h-3 w-3/5" />
                  </div>
                  <Sk className="h-11 w-full rounded-xl mt-4" />
                </div>
              ))}
            </div>
          ) : tierList.length === 0 ? (
            <div data-testid="tiers-empty-state" className="rounded-2xl py-20 text-center"
              style={{ background: C.white, border: `1px solid ${C.border}` }}>
              <Sparkles size={36} className="mx-auto mb-3" style={{ color: C.textFaint }} />
              <p className="font-semibold text-lg" style={{ color: C.textMuted }}>
                No membership plans available yet
              </p>
              <p className="text-sm mt-1" style={{ color: C.textFaint }}>
                Check back soon — this masjid is setting up their membership program.
              </p>
            </div>
          ) : (
            <motion.div variants={STAGGER} initial="initial" animate="animate"
              data-testid="tiers-grid"
              className={`grid gap-8 ${
                tierList.length === 1
                  ? "grid-cols-1 max-w-sm mx-auto"
                  : tierList.length === 2
                  ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}>
              {tierList.map((tier) => (
                <TierCard key={tier.id} tier={tier}
                  isCurrent={tier.id === currentTierId && hasMembership}
                  isPopular={tier.id === popularTierId && !hasMembership}
                  isAuthenticated={isAuthenticated}
                  onSubscribe={handleSubscribeClick}
                  subscribing={subscribingId === tier.id} />
              ))}
            </motion.div>
          )}
        </section>

        {/* Not signed in nudge */}
        {!isAuthenticated && tierList.length > 0 && (
          <motion.div {...FADE_UP(0.2)} data-testid="signin-nudge" className="text-center">
            <div className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl"
              style={{ background: C.primaryLight, border: `1px solid ${C.border}` }}>
              <Lock size={20} style={{ color: C.primary }} aria-hidden="true" />
              <p className="font-semibold text-sm" style={{ color: C.primary }}>
                Sign in to subscribe to a membership plan
              </p>
              <a href="/login"
                data-testid="signin-nudge-link"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: C.primary }}>
                Sign In <ChevronRight size={14} aria-hidden="true" />
              </a>
            </div>
          </motion.div>
        )}

        {/* FAQ */}
        <motion.section {...FADE_UP(0.25)} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-center text-xl font-extrabold mb-8 tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif", color: C.text }}>
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              { q: "Can I cancel anytime?",              a: "Yes. You can cancel at any time. Access continues until the end of the billing period." },
              { q: "What payment methods are accepted?", a: "Credit card, processed securely through Stripe." },
              { q: "What does voting rights mean?",      a: "Certain tiers grant you the right to participate in masjid elections and governance." },
              { q: "Can I switch tiers?",                a: "Yes. You can upgrade or switch at any time from this page." },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-2xl p-5"
                style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
                <p className="font-bold text-sm mb-2" style={{ color: C.text }}>{q}</p>
                <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{a}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Subscribe modal — payment method fixed to credit card */}
      <AnimatePresence>
        {confirmSubscribe && (
          <SubscribeModal
            tier={confirmSubscribe}
            hasMembership={hasMembership}
            loading={subscribingId !== null}
            onClose={() => setConfirmSubscribe(null)}
            onConfirm={handleConfirmSubscribe}
          />
        )}
      </AnimatePresence>

      {/* Cancel modal */}
      <AnimatePresence>
        {cancelModal && (
          <CancelModal
            loading={cancelLoading}
            onClose={() => setCancelModal(false)}
            onConfirm={handleCancelConfirm}
          />
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {toast && <SuccessToast message={toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}