"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, TrendingUp, Users, Target, BarChart3, ArrowRight,
  CheckCircle2, XCircle, ExternalLink, Heart, Calendar, AlertCircle,
  Lock, Globe, Zap, ChevronRight, Info, Plus, Pencil, Eye, DollarSign,
  X, Search, ChevronDown, Loader2, RefreshCw, Landmark, AlertTriangle,
  Clock, CheckCircle, Copy, AlertOctagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMosque } from "@/context/MosqueContext";
import { useDonations } from "@/hooks/donations/useDonations";
import { useMemberships } from "@/hooks/memberships/useMemberships";
import type {
  CampaignListItem, CampaignStatus, CreateCampaignRequest,
  UpdateCampaignRequest, GetDonationsResponse, DonationRecord, PaginationMeta,
} from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ModalType = "create" | "edit" | "donations" | null;

interface PropertyRow {
  label: string;
  value: string;
  status?: "error" | "warning" | "success" | "neutral";
}

interface FeatureCard {
  icon: React.ElementType;
  title: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES: FeatureCard[] = [
  { icon: Heart,     title: "One-time Donations",  description: "Seamless, branded checkout flow for single gifts." },
  { icon: Calendar,  title: "Recurring Giving",    description: "Stable monthly or annual subscription support." },
  { icon: TrendingUp,title: "Goal Tracking",       description: "Visual campaign progress with real-time updates." },
];

const TRUST_BADGES = [
  { icon: Lock,       label: "256-bit TLS"    },
  { icon: ShieldCheck,label: "PCI DSS Level 1"},
  { icon: Globe,      label: "135+ Currencies"},
  { icon: Zap,        label: "Instant Payouts"},
];

const DONATION_TYPE_LABELS: Record<string, string> = {
  one_time:  "One-time",
  recurring: "Recurring",
  both:      "Both",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  paused: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200"   },
  closed: { bg: "bg-slate-100",  text: "text-slate-500",   ring: "ring-slate-200"   },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function FadeUp({ children, delay = 0, className }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

function StatusPill({ status, value }: { status: PropertyRow["status"]; value: string }) {
  if (status === "error") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200 text-[10px] font-bold uppercase tracking-wide">
      <XCircle size={9} />{value}
    </span>
  );
  if (status === "success") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-[10px] font-bold uppercase tracking-wide">
      <CheckCircle2 size={9} />{value}
    </span>
  );
  if (status === "warning") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[10px] font-bold uppercase tracking-wide">
      <AlertTriangle size={9} />{value}
    </span>
  );
  return <span className="text-sm font-semibold text-[#0d2117]">{value}</span>;
}

function CampaignStatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.closed;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1", c.bg, c.text, c.ring)}>
      {status}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-[#064e3b] to-emerald-400 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(),
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE CONNECT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function StripeConnectButton({ size = "md", onClick, href }: {
  size?: "md" | "lg"; onClick?: () => void; href?: string;
}) {
  const cls = cn(
    "group relative overflow-hidden flex items-center gap-3 font-bold rounded-xl bg-[#635bff] hover:bg-[#5a52e0] text-white transition-colors shadow-lg",
    size === "lg" ? "px-8 py-4 text-base" : "px-5 py-2.5 text-sm"
  );
  const inner = (
    <>
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-in-out pointer-events-none" />

      <span>{href ? "Complete Onboarding" : "Connect with Stripe"}</span>
      <ArrowRight size={size === "lg" ? 16 : 14} className="group-hover:translate-x-0.5 transition-transform" />
    </>
  );

  if (href) return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls} aria-label="Complete Stripe onboarding">
      {inner}
    </a>
  );

  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={onClick} className={cls} aria-label="Connect your Stripe account">
      {inner}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE ONBOARDING PANEL  (replaces hardcoded connectionStatus)
// ─────────────────────────────────────────────────────────────────────────────

function StripeOnboardingPanel({ masjidId, onStatusChange }: {
  masjidId: string;
  onStatusChange: (ready: boolean) => void;
}) {
  const { onboardingStatus, loading, error, getOnboardingStatus, clearError } = useMemberships();

  // Generate link state
  const [email, setEmail]           = useState("");
  const [generating, setGenerating] = useState(false);
  const [linkUrl, setLinkUrl]       = useState<string | null>(null);
  const [linkError, setLinkError]   = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    void getOnboardingStatus(masjidId);
  }, [masjidId, getOnboardingStatus]);

  const status   = onboardingStatus;
  const isReady  = !!(status?.charges_enabled && status?.payouts_enabled);

  // Notify parent of connection status
  useEffect(() => { onStatusChange(isReady); }, [isReady, onStatusChange]);

  const handleGenerateLink = useCallback(async () => {
    if (!email.trim()) { setLinkError("Email is required."); return; }
    setLinkError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/masjids/${masjidId}/payments/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLinkError(json?.error?.detail ?? json?.message ?? "Failed to generate link.");
      } else {
        setLinkUrl(json.data.onboarding_url);
        void getOnboardingStatus(masjidId);
      }
    } catch {
      setLinkError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [email, masjidId, getOnboardingStatus]);

  const handleCopy = () => {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Property sheet rows — populated from real API
  const propertyRows: PropertyRow[] = status ? [
    {
      label: "Account Status",
      value: isReady ? "Connected" : status.onboarding_status === "complete" ? "Review Pending" : "Incomplete",
      status: isReady ? "success" : "error",
    },
    {
      label: "Stripe Account ID",
      value: status.stripe_account_id || "Not assigned",
      status: "neutral",
    },
    {
      label: "Charges Enabled",
      value: status.charges_enabled ? "Yes" : "No",
      status: status.charges_enabled ? "success" : "error",
    },
    {
      label: "Payouts Enabled",
      value: status.payouts_enabled ? "Yes" : "No",
      status: status.payouts_enabled ? "success" : "error",
    },
    {
      label: "Last Checked",
      value: status.checked_at ? new Date(status.checked_at).toLocaleDateString() : "—",
      status: "neutral",
    },
  ] : [
    { label: "Account Status", value: loading ? "Loading…" : "Not Connected", status: "error" },
    { label: "Stripe Identity",  value: "Not Configured", status: "neutral" },
    { label: "Charges Enabled",  value: "No",             status: "error"   },
    { label: "Payouts Enabled",  value: "No",             status: "error"   },
    { label: "Last Checked",     value: "—",              status: "neutral" },
  ];

  // Outstanding requirements
  const requirements = status?.requirements;
  const hasRequirements = requirements && (
    (requirements.currently_due?.length ?? 0) > 0 ||
    (requirements.past_due?.length ?? 0) > 0
  );

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#0d2117] text-base" style={{ fontFamily: "Manrope, sans-serif" }}>
            Stripe Connect
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => void getOnboardingStatus(masjidId)} disabled={loading}
              className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40"
              aria-label="Refresh status">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowInfoModal(true)}
              className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
              aria-label="More information">
              <Info size={14} />
            </button>
          </div>
        </div>

        {/* Overall status badge */}
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: isReady ? "#e8f5ef" : "#fef3c7",
            border: `1px solid ${isReady ? "rgba(0,53,39,0.12)" : "rgba(146,64,14,0.15)"}`,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: isReady ? "#b0f0d6" : "#fde68a" }}
          >
            {isReady
              ? <CheckCircle2 size={20} className="text-[#003527]" />
              : <AlertOctagon size={20} className="text-amber-700" />
            }
          </div>
          <div>
            <p className="font-bold text-sm" style={{ fontFamily: "Manrope, sans-serif", color: isReady ? "#003527" : "#92400e" }}>
              {isReady ? "Payments Ready" : loading ? "Checking status…" : "Setup Required"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: isReady ? "#064e3b" : "#92400e" }}>
              {isReady
                ? "Your Stripe account is fully connected."
                : "Complete onboarding to accept membership payments."}
            </p>
          </div>
        </div>

        {/* Property sheet */}
        <div className="divide-y divide-slate-50">
          {propertyRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3">
              <span className="text-xs text-slate-400 font-medium">{row.label}</span>
              <StatusPill status={row.status} value={row.value} />
            </div>
          ))}
        </div>

        {/* Requirements */}
        {hasRequirements && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#fef3c7", border: "1px solid rgba(146,64,14,0.15)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Outstanding Requirements
            </p>
            {[
              { key: "currently_due" as const, label: "Due Now",   urgent: true  },
              { key: "past_due"      as const, label: "Past Due",  urgent: true  },
              { key: "eventually_due"as const, label: "Due Later", urgent: false },
            ].map(({ key, label, urgent }) => {
              const items = requirements?.[key] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: urgent ? "#ba1a1a" : "#92400e" }}>
                    {label} ({items.length})
                  </p>
                  <ul className="space-y-1">
                    {items.map((req: string) => (
                      <li key={req} className="text-xs flex items-center gap-1.5 text-amber-800">
                        <AlertCircle size={10} />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Generate onboarding link */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Generate Onboarding Link
          </p>
          <p className="text-xs text-slate-400">
            Send a Stripe Connect onboarding link to your admin's email.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@masjid.org"
              onKeyDown={(e) => e.key === "Enter" && handleGenerateLink()}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0d2117] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] transition-all"
              aria-label="Admin email for onboarding link"
            />
            <motion.button
              onClick={handleGenerateLink}
              disabled={generating}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#003527] text-white text-xs font-bold rounded-xl disabled:opacity-60 shrink-0"
              aria-label="Generate onboarding link"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              Generate
            </motion.button>
          </div>

          {linkError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              {linkError}
            </div>
          )}

          <AnimatePresence>
            {linkUrl && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-xl p-4 space-y-3"
                style={{ background: "#e8f5ef", border: "1px solid rgba(0,53,39,0.12)" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#003527]">
                  Link Generated
                </p>
                <p className="text-[11px] font-mono break-all text-[#064e3b]">{linkUrl}</p>
                <div className="flex gap-2">
                  <motion.button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: "#b0f0d6", color: "#003527" }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                    {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                    {copied ? "Copied!" : "Copy"}
                  </motion.button>
                  <StripeConnectButton size="md" href={linkUrl} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Connect button if not ready */}
        {!isReady && !linkUrl && (
          <StripeConnectButton size="md" />
        )}
      </div>

      {/* Info modal */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#0d2117]" style={{ fontFamily: "Manrope, sans-serif" }}>
                  About Stripe Connect
                </h3>
                <button onClick={() => setShowInfoModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <XCircle size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                The Stripe Connect panel shows your real-time account status fetched from
                Stripe. Once charges and payouts are both enabled, your masjid can start
                accepting donation payments. Commission rates are set by Stripe and may
                vary for verified non-profits.
              </p>
              <a href="https://stripe.com/docs/connect" target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#635bff] hover:underline">
                Stripe Connect docs <ExternalLink size={11} />
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN FORM
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignFormData {
  title: string; description: string; goal_amount: string;
  currency: string; donation_type: "one_time" | "recurring" | "both";
  status: CampaignStatus; end_date: string;
}

const EMPTY_FORM: CampaignFormData = {
  title: "", description: "", goal_amount: "", currency: "USD",
  donation_type: "one_time", status: "active", end_date: "",
};

function CampaignModal({ mode, campaign, onClose, onSubmit, loading, error }: {
  mode: "create" | "edit"; campaign?: CampaignListItem;
  onClose: () => void; onSubmit: (data: CampaignFormData) => void;
  loading: boolean; error: string | null;
}) {
  const [form, setForm] = useState<CampaignFormData>(() =>
    campaign ? {
      title: campaign.title, description: "",
      goal_amount: String(campaign.goal_amount), currency: campaign.currency,
      donation_type: campaign.donation_type as CampaignFormData["donation_type"],
      status: campaign.status as CampaignFormData["status"], end_date: "",
    } : EMPTY_FORM
  );
  const set = (key: keyof CampaignFormData, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8"
        role="dialog" aria-modal="true" aria-labelledby="campaign-modal-title"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 id="campaign-modal-title" className="font-bold text-[#0d2117] text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>
              {mode === "create" ? "New Campaign" : "Edit Campaign"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === "create" ? "Set up a fundraising campaign for your community" : "Update campaign details and settings"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Campaign Title *</label>
            <input required value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Ramadan Building Fund"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0d2117] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] transition-all" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} placeholder="Tell your community what this campaign is for..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0d2117] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] transition-all resize-none" />
          </div>

          {/* Goal + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Goal Amount *</label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="number" min="1" value={form.goal_amount}
                  onChange={(e) => set("goal_amount", e.target.value)} placeholder="5000"
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-[#0d2117] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Currency</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0d2117] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] transition-all appearance-none bg-white">
                {["USD","GBP","EUR","CAD","AUD","SGD","MYR","IDR"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Donation Type */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Donation Type</label>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Donation type">
              {(["one_time", "recurring", "both"] as const).map((t) => (
                <button key={t} type="button" onClick={() => set("donation_type", t)}
                  aria-pressed={form.donation_type === t}
                  className={cn("py-2 px-3 rounded-xl text-xs font-bold border transition-all",
                    form.donation_type === t ? "bg-[#003527] text-white border-[#003527]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300")}>
                  {DONATION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Status + End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value as CampaignStatus)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0d2117] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] transition-all appearance-none bg-white">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0d2117] focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] transition-all" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
              <AlertTriangle size={13} />{error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#003527] text-white text-sm font-bold hover:bg-[#064e3b] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {mode === "create" ? "Create Campaign" : "Save Changes"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DONATIONS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function DonationsModal({ campaign, donations, loading, onClose, onLoadMore }: {
  campaign: CampaignListItem; donations: GetDonationsResponse | null;
  loading: boolean; onClose: () => void; onLoadMore: () => void;
}) {
  const donationRecords: DonationRecord[] = donations?.data?.data ?? [];
  const meta: PaginationMeta | undefined  = donations?.data?.metadata;
  const hasNext = meta ? meta.page < meta.total_page : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        role="dialog" aria-modal="true" aria-labelledby="donations-modal-title"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 id="donations-modal-title" className="font-bold text-[#0d2117] text-lg" style={{ fontFamily: "Manrope, sans-serif" }}>
              Donation Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{campaign.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Raised</p>
              <p className="text-base font-extrabold text-emerald-600" style={{ fontFamily: "Manrope, sans-serif" }}>
                {formatCurrency(campaign.raised_amount, campaign.currency)}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {loading && !donations ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={24} className="animate-spin text-[#064e3b]" />
              <p className="text-sm text-slate-400">Loading donations…</p>
            </div>
          ) : donationRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Heart size={20} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No donations yet</p>
              <p className="text-xs text-slate-400">Share this campaign with your community to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {donationRecords.map((d: DonationRecord) => (
                <div key={d.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Heart size={13} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0d2117]">{d.user?.name ?? "Anonymous"}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={9} />
                        {d.donated_at ? new Date(d.donated_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">+{formatCurrency(d.amount, d.currency)}</p>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wide",
                      d.status === "succeeded" ? "text-emerald-500" : d.status === "failed" ? "text-red-400" : "text-amber-500")}>
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}
              {hasNext && (
                <div className="pt-2 flex justify-center">
                  <button onClick={onLoadMore} disabled={loading}
                    className="flex items-center gap-2 text-xs font-bold text-[#064e3b] hover:underline disabled:opacity-50">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN CARD
// ─────────────────────────────────────────────────────────────────────────────

function CampaignCard({ campaign, index, onEdit, onViewDonations }: {
  campaign: CampaignListItem; index: number;
  onEdit: (c: CampaignListItem) => void;
  onViewDonations: (c: CampaignListItem) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-white border border-slate-100 rounded-2xl p-5 hover:border-[#064e3b]/20 hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#0d2117] text-sm truncate leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            {campaign.title}
          </h4>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <CampaignStatusBadge status={campaign.status} />
            <span className="text-[10px] text-slate-400 font-medium">
              {DONATION_TYPE_LABELS[campaign.donation_type] ?? campaign.donation_type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(campaign)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#064e3b] transition-colors" title="Edit">
            <Pencil size={13} />
          </button>
          <button onClick={() => onViewDonations(campaign)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#064e3b] transition-colors" title="Donations">
            <Eye size={13} />
          </button>
        </div>
      </div>
      <div className="mb-3"><ProgressBar pct={campaign.progress_pct ?? 0} /></div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Raised",  value: formatCurrency(campaign.raised_amount, campaign.currency), color: "text-emerald-600" },
          { label: "Goal",    value: formatCurrency(campaign.goal_amount, campaign.currency),   color: "text-[#0d2117]"  },
          { label: "Donors",  value: String(campaign.donor_count ?? 0),                         color: "text-[#0d2117]"  },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-[10px] text-slate-400 font-medium">{label}</p>
            <p className={cn("text-sm font-extrabold leading-tight", color)} style={{ fontFamily: "Manrope, sans-serif" }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function MonetizationGatewayPage() {
  const { activeMosque, isHydrating } = useMosque();
  const {
    campaigns, donations, loading, error: hookError,
    getCampaigns, createCampaign, updateCampaign, getDonations, clearDonations, clearError,
  } = useDonations();

  const [isConnected, setIsConnected]         = useState(false);
  const [activeModal, setActiveModal]         = useState<ModalType>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignListItem | null>(null);
  const [donationsPage, setDonationsPage]     = useState(1);
  const [searchQuery, setSearchQuery]         = useState("");
  const [statusFilter, setStatusFilter]       = useState<"all" | CampaignStatus>("all");
  const [formError, setFormError]             = useState<string | null>(null);
  const [successMsg, setSuccessMsg]           = useState<string | null>(null);

  const masjidId = activeMosque?.id ?? "";

  useEffect(() => {
    if (masjidId && !isHydrating) void getCampaigns(masjidId, {});
  }, [masjidId, isHydrating, getCampaigns]);

  const allCampaigns = campaigns?.data ?? [];
  const filteredCampaigns = allCampaigns.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (statusFilter === "all" || c.status === statusFilter)
  );

  const totalRaised   = allCampaigns.reduce((s, c) => s + (c.raised_amount ?? 0), 0);
  const totalDonors   = allCampaigns.reduce((s, c) => s + (c.donor_count  ?? 0), 0);
  const activeCamps   = allCampaigns.filter((c) => c.status === "active").length;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleOpenCreate = () => { setSelectedCampaign(null); setFormError(null); clearError(); setActiveModal("create"); };
  const handleOpenEdit   = (c: CampaignListItem) => { setSelectedCampaign(c); setFormError(null); clearError(); setActiveModal("edit"); };
  const handleCloseModal = () => { setActiveModal(null); setSelectedCampaign(null); setFormError(null); clearError(); };

  const handleOpenDonations = useCallback(async (c: CampaignListItem) => {
    setSelectedCampaign(c); clearDonations(); setDonationsPage(1); setActiveModal("donations");
    await getDonations(masjidId, c.id, { page: 1, limit: 20 });
  }, [masjidId, getDonations, clearDonations]);

  const handleLoadMoreDonations = useCallback(async () => {
    if (!selectedCampaign) return;
    const next = donationsPage + 1;
    setDonationsPage(next);
    await getDonations(masjidId, selectedCampaign.id, { page: next, limit: 20 });
  }, [masjidId, selectedCampaign, donationsPage, getDonations]);

  const handleCreateSubmit = async (data: CampaignFormData) => {
    if (!masjidId) return;
    setFormError(null);
    const endDateIso = data.end_date
      ? (data.end_date.includes("T") ? data.end_date : `${data.end_date}T23:59:59Z`)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const payload: CreateCampaignRequest = {
      title: data.title, description: data.description,
      goal_amount: Number(data.goal_amount), currency: data.currency,
      donation_type: data.donation_type, end_date: endDateIso,
    };
    const res = await createCampaign(masjidId, payload);
    if (res) { handleCloseModal(); showSuccess("Campaign created successfully!"); }
    else setFormError(hookError ?? "Failed to create campaign.");
  };

  const handleEditSubmit = async (data: CampaignFormData) => {
    if (!masjidId || !selectedCampaign) return;
    setFormError(null);
    const payload: UpdateCampaignRequest = {
      title: data.title, description: data.description,
      goal_amount: Number(data.goal_amount), status: data.status,
    };
    const res = await updateCampaign(masjidId, selectedCampaign.id, payload);
    if (res) { handleCloseModal(); showSuccess("Campaign updated!"); }
    else setFormError(hookError ?? "Failed to update campaign.");
  };

  const KPI_CARDS = [
    { icon: BarChart3,  label: "Total Raised",     value: isConnected ? formatCurrency(totalRaised) : "$0",     iconColor: "text-emerald-700", iconBg: "bg-emerald-50", live: isConnected },
    { icon: Users,      label: "Active Donors",     value: isConnected ? String(totalDonors) : "0",             iconColor: "text-blue-700",    iconBg: "bg-blue-50",    live: isConnected },
    { icon: Target,     label: "Active Campaigns",  value: String(activeCamps),                                  iconColor: "text-violet-700",  iconBg: "bg-violet-50",  live: true        },
    { icon: TrendingUp, label: "Total Campaigns",   value: String(allCampaigns.length),                         iconColor: "text-amber-700",   iconBg: "bg-amber-50",   live: true        },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Success toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="fixed top-6 right-6 z-[60] flex items-center gap-2.5 bg-[#003527] text-white px-4 py-3 rounded-xl shadow-xl text-sm font-semibold"
            role="status">
            <CheckCircle2 size={15} className="text-emerald-400" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <FadeUp delay={0.04}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Management Console</p>
            <h1 className="text-3xl font-extrabold text-[#003527] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              Monetization Gateway
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              {activeMosque ? <>Managing <span className="font-semibold text-[#003527]">{activeMosque.name}</span></> : "Connect your payment infrastructure and unlock community giving tools."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {masjidId && (
              <button onClick={() => getCampaigns(masjidId, {})} disabled={loading}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-[#064e3b] hover:border-[#064e3b]/30 transition-colors disabled:opacity-40" title="Refresh">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
            )}
            <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold shrink-0",
              isConnected ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600")}>
              <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-400")} aria-hidden="true" />
              {isConnected ? "Stripe Connected" : "Stripe Disconnected"}
            </div>
          </div>
        </div>
      </FadeUp>

      {/* No mosque warning */}
      {!isHydrating && !activeMosque && (
        <FadeUp>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
            <AlertCircle size={15} className="shrink-0" />
            No mosque selected. Please select an active mosque from the sidebar.
          </div>
        </FadeUp>
      )}

      {/* Hero + Stripe Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Hero banner */}
        <FadeUp delay={0.08} className="lg:col-span-8">
          <div className="relative overflow-hidden rounded-2xl bg-[#003527] min-h-[360px] flex flex-col justify-end p-8 md:p-10 shadow-xl">
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-[#064e3b] opacity-60" />
              <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-[#001f17] to-transparent" />
            </div>
            <div className="relative z-10 mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b0f0d6]/10 border border-[#b0f0d6]/25 text-[#95d3ba] text-[10px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#95d3ba] animate-pulse" />
                {isConnected ? "Connected & Active" : "Action Required"}
              </span>
            </div>
            <div className="relative z-10 max-w-xl">
              <h2 className="text-4xl font-extrabold text-white leading-tight mb-3 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                {isConnected ? "Community Giving is Live" : "Enable Community Giving"}
              </h2>
              <p className="text-[#95d3ba]/80 text-base leading-relaxed mb-6">
                {isConnected
                  ? "Your Stripe account is connected. Create campaigns, track donations, and manage your community's giving."
                  : "Connect your Stripe account to unlock a powerful suite of financial tools designed for modern Muslim communities."}
              </p>
              <div className="flex flex-wrap gap-4 mb-6">
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={13} className="text-[#95d3ba]" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold leading-tight">{f.title}</p>
                        <p className="text-[#95d3ba]/60 text-[10px] mt-0.5">{f.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-2">
                {TRUST_BADGES.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.label} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10">
                      <Icon size={11} className="text-[#95d3ba] shrink-0" />
                      <span className="text-[10px] font-bold text-[#95d3ba]/80">{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Stripe onboarding panel — real data from useMemberships */}
        <div className="lg:col-span-4">
          <FadeUp delay={0.12}>
            {masjidId ? (
              <StripeOnboardingPanel
                masjidId={masjidId}
                onStatusChange={setIsConnected}
              />
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Landmark size={24} className="text-slate-300" />
                <p className="text-sm text-slate-400">Select a mosque to view Stripe status.</p>
              </div>
            )}
          </FadeUp>
        </div>
      </div>

      {/* KPI cards */}
      <FadeUp delay={0.2}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#0d2117] text-base" style={{ fontFamily: "Manrope, sans-serif" }}>Financial Metrics</h2>
            {!isConnected && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <AlertCircle size={11} /> Connect Stripe to unlock live data
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {KPI_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.label}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-[#064e3b]/20 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{card.label}</span>
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                        <Icon size={16} className={card.iconColor} aria-hidden="true" />
                      </div>
                    </div>
                    <div>
                      <p className={cn("text-3xl font-extrabold tracking-tight", card.live ? "text-[#0d2117]" : "text-slate-300")}
                        style={{ fontFamily: "Manrope, sans-serif" }}>
                        {card.value}
                      </p>
                      <p className={cn("text-[10px] mt-1 font-medium", card.live ? "text-emerald-500" : "text-slate-300")}>
                        {card.live ? "Live data" : "Awaiting connection"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </FadeUp>

      {/* Campaigns section */}
      <FadeUp delay={0.26}>
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-[#0d2117] text-base" style={{ fontFamily: "Manrope, sans-serif" }}>Donation Campaigns</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {campaigns?.metadata?.total_data ?? 0} total{activeMosque ? ` · ${activeMosque.name}` : ""}
              </p>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleOpenCreate} disabled={!masjidId}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#003527] text-white text-sm font-bold rounded-xl hover:bg-[#064e3b] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Create new campaign">
              <Plus size={14} /> New Campaign
            </motion.button>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-50 bg-slate-50/50">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns…" aria-label="Search campaigns"
                className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs text-[#0d2117] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white transition-all" />
            </div>
            <div className="flex items-center gap-1.5" role="group" aria-label="Filter by status">
              {(["all", "active", "paused", "closed"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                    statusFilter === s ? "bg-[#003527] text-white" : "text-slate-500 hover:bg-slate-100")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="p-6">
            {isHydrating || (loading && allCampaigns.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={24} className="animate-spin text-[#064e3b]" />
                <p className="text-sm text-slate-400">Loading campaigns…</p>
              </div>
            ) : !masjidId ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Landmark size={20} className="text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No mosque selected</p>
              </div>
            ) : hookError && allCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <AlertTriangle size={20} className="text-red-400" />
                <p className="text-sm font-semibold text-slate-500">Failed to load campaigns</p>
                <button onClick={() => getCampaigns(masjidId, {})}
                  className="text-xs font-bold text-[#064e3b] hover:underline flex items-center gap-1">
                  <RefreshCw size={11} /> Try again
                </button>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Target size={20} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">
                  {allCampaigns.length === 0 ? "No campaigns yet" : "No campaigns match"}
                </p>
                {allCampaigns.length === 0 && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleOpenCreate}
                    className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-[#003527] text-white text-xs font-bold rounded-xl hover:bg-[#064e3b] transition-colors">
                    <Plus size={12} /> Create First Campaign
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCampaigns.map((c, i) => (
                  <CampaignCard key={c.id} campaign={c} index={i} onEdit={handleOpenEdit} onViewDonations={handleOpenDonations} />
                ))}
              </div>
            )}
          </div>

          {/* Load more */}
          {campaigns?.metadata && campaigns.metadata.page < campaigns.metadata.total_page && (
            <div className="px-6 pb-6 flex justify-center">
              <button onClick={() => getCampaigns(masjidId, { page: campaigns.metadata.page + 1 })}
                disabled={loading}
                className="flex items-center gap-2 text-xs font-bold text-[#064e3b] hover:underline disabled:opacity-50">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
                Load more campaigns
              </button>
            </div>
          )}
        </div>
      </FadeUp>

      {/* Setup checklist */}
      <FadeUp delay={0.32}>
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-[#0d2117] text-base" style={{ fontFamily: "Manrope, sans-serif" }}>Setup Checklist</h2>
            <span className="text-xs font-bold text-slate-400">
              {(isConnected ? 1 : 0) + (allCampaigns.length > 0 ? 1 : 0)} / 3 complete
            </span>
          </div>
          <div className="space-y-3">
            {[
              { step: 1, title: "Connect Stripe Account",    desc: "Link your bank via Stripe's secure OAuth flow.",          done: isConnected,             cta: "Connect now",    action: undefined },
              { step: 2, title: "Verify Non-Profit Status",  desc: "Upload 501(c)(3) documentation for reduced fees.",        done: false,                   cta: "Upload docs",    action: undefined },
              { step: 3, title: "Create Your First Campaign",desc: "Set a fundraising goal and publish to your community.",   done: allCampaigns.length > 0, cta: "Create campaign",action: handleOpenCreate },
            ].map((item, i) => (
              <motion.div key={item.step}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.36 + i * 0.08, duration: 0.4 }}
                className={cn("flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  item.done ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100 hover:border-slate-200")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  item.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
                  {item.done ? <CheckCircle2 size={14} /> : item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold", item.done ? "text-emerald-700 line-through" : "text-[#0d2117]")}>
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                {!item.done && item.action && (
                  <button onClick={item.action}
                    className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#064e3b] hover:underline">
                    {item.cta} <ChevronRight size={12} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === "create" && (
          <CampaignModal key="create" mode="create" onClose={handleCloseModal}
            onSubmit={handleCreateSubmit} loading={loading} error={formError} />
        )}
        {activeModal === "edit" && selectedCampaign && (
          <CampaignModal key="edit" mode="edit" campaign={selectedCampaign} onClose={handleCloseModal}
            onSubmit={handleEditSubmit} loading={loading} error={formError} />
        )}
        {activeModal === "donations" && selectedCampaign && (
          <DonationsModal key="donations" campaign={selectedCampaign} donations={donations}
            loading={loading} onClose={handleCloseModal} onLoadMore={handleLoadMoreDonations} />
        )}
      </AnimatePresence>
    </div>
  );
}