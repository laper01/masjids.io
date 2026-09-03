"use client";

/**
 * app/invite/accept/page.tsx  (or wherever you mount it)
 *
 * Reads ?token= from the URL, calls acceptInvitation(token) → INV-04,
 * then shows one of three states:
 *   idle      → verifying token on mount
 *   success   → shows masjid name + granted scopes
 *   error     → shows reason + retry / contact support CTA
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useStaff } from "@/hooks/staff/useStaff";
import type { AcceptInvitationResponse } from "@/types/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState = "verifying" | "success" | "error";

// ─── Scope badge ──────────────────────────────────────────────────────────────

function ScopePill({ scope }: { scope: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-[11px] font-mono text-emerald-800">
      <Shield size={9} className="text-emerald-500 shrink-0" />
      {scope}
    </span>
  );
}

// ─── Verifying state ──────────────────────────────────────────────────────────

function VerifyingView() {
  return (
    <motion.div
      key="verifying"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[#f0fdf4] border-2 border-emerald-100 flex items-center justify-center">
          <Loader2 size={32} className="text-[#064e3b] animate-spin" />
        </div>
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-emerald-200 animate-ping opacity-30" />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold text-[#0f1f1a] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
          Verifying your invitation…
        </h2>
        <p className="text-slate-500 text-sm mt-2">
          This will only take a moment.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView({ data, onContinue }: {
  data: AcceptInvitationResponse;
  onContinue: () => void;
}) {
  const { masjid_name, role_name, effective_scopes = [] } = data.data;

  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 text-center w-full"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-[#064e3b]" />
        </div>
        {/* Confetti-like dots */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: Math.cos((i / 6) * Math.PI * 2) * 40, y: Math.sin((i / 6) * Math.PI * 2) * 40 }}
            transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }}
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{ backgroundColor: i % 2 === 0 ? "#064e3b" : "#6ee7b7" }}
          />
        ))}
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-extrabold text-[#0f1f1a] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
          Welcome to {masjid_name}!
        </h2>
        <p className="text-slate-500 text-sm mt-2">
          Your invitation has been accepted. You've been assigned the{" "}
          <span className="font-semibold text-[#064e3b]">{role_name}</span> role.
        </p>
      </motion.div>

      {/* Role + scopes card */}
      {effective_scopes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full bg-[#f8fffe] border border-emerald-100 rounded-2xl p-5 text-left"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-[#064e3b]" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Your Access Permissions
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {effective_scopes.map((scope: string) => (
              <ScopePill key={scope} scope={scope} />
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#064e3b] text-white text-sm font-semibold rounded-xl shadow-md hover:bg-[#053d2f] transition-colors"
      >
        Go to Dashboard
        <ChevronRight size={15} />
      </motion.button>
    </motion.div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorView({ message, token, onRetry }: {
  message: string;
  token: string;
  onRetry: () => void;
}) {
  const isExpired   = message.toLowerCase().includes("expir");
  const isRevoked   = message.toLowerCase().includes("revok");
  const isNotFound  = message.toLowerCase().includes("not found") || message.toLowerCase().includes("invalid");

  const hint = isExpired
    ? "This invitation link has expired. Please ask an admin to send a new one."
    : isRevoked
    ? "This invitation was revoked before it could be accepted. Contact your administrator."
    : isNotFound
    ? "This invitation link is invalid or has already been used."
    : "Something went wrong while accepting your invitation.";

  return (
    <motion.div
      key="error"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-6 text-center w-full"
    >
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
        {isExpired || isRevoked
          ? <AlertTriangle size={32} className="text-amber-500" />
          : <XCircle size={32} className="text-red-500" />
        }
      </div>

      {/* Text */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#0f1f1a] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
          {isExpired ? "Invitation Expired" : isRevoked ? "Invitation Revoked" : "Something went wrong"}
        </h2>
        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
          {hint}
        </p>
      </div>

      {/* Error detail pill */}
      <div className="w-full flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-left">
        <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
        <p className="text-xs text-red-700 leading-relaxed">{message}</p>
      </div>

      {/* Actions */}
      <div className="w-full flex flex-col gap-2.5">
        {/* Only show retry for transient errors, not expired/revoked/invalid */}
        {!isExpired && !isRevoked && !isNotFound && (
          <button
            onClick={onRetry}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#064e3b] rounded-xl hover:bg-[#053d2f] transition-colors"
          >
            Try Again
          </button>
        )}
        <a
          href="mailto:support@masjid.app"
          className="w-full py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-center"
        >
          Contact Support
        </a>
      </div>
    </motion.div>
  );
}

// ─── Inner component (uses useSearchParams — must be inside Suspense) ─────────

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const { acceptInvitation, loading } = useStaff();

  const [pageState, setPageState] = useState<PageState>("verifying");
  const [result, setResult] = useState<AcceptInvitationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function runAccept() {
    if (!token) {
      setErrorMsg("No invitation token found in the URL.");
      setPageState("error");
      return;
    }

    setPageState("verifying");
    const data = await acceptInvitation(token);

    if (data) {
      setResult(data);
      setPageState("success");
    } else {
      setErrorMsg("Failed to accept the invitation. The link may be invalid, expired, or already used.");
      setPageState("error");
    }
  }

  // Run on mount
  useEffect(() => { runAccept(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    window.location.href = "/dashboard";
  }

  return (
    <>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(["verifying", "success", "error"] as const).map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              pageState === s
                ? s === "error" ? "w-6 bg-red-400" : "w-6 bg-[#064e3b]"
                : pageState === "success" && s === "verifying"
                ? "w-3 bg-emerald-200"
                : "w-1.5 bg-slate-100"
            )}
          />
        ))}
      </div>

      {/* State views */}
      <AnimatePresence mode="wait">
        {pageState === "verifying" && <VerifyingView key="verifying" />}
        {pageState === "success" && result && (
          <SuccessView key="success" data={result} onContinue={handleContinue} />
        )}
        {pageState === "error" && (
          <ErrorView key="error" message={errorMsg} token={token} onRetry={runAccept} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Page (exported) ──────────────────────────────────────────────────────────

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen bg-[#f8fffe] flex flex-col items-center justify-center px-4">

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-50/60 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-emerald-100/50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-emerald-50/50" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md p-10"
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#064e3b] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
              <path d="M12 2v20M2 7l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-extrabold text-lg text-[#0f1f1a] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            Masjid Platform
          </span>
        </div>

        {/* Suspense wraps everything that calls useSearchParams */}
        <Suspense fallback={<VerifyingView />}>
          <AcceptInvitationContent />
        </Suspense>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 mt-6 text-xs text-slate-400 text-center"
      >
        Having trouble?{" "}
        <a href="mailto:support@masjid.app" className="underline hover:text-slate-600 transition-colors">
          Contact support
        </a>
      </motion.p>
    </div>
  );
}