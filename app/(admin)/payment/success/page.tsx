"use client";

/**
 * app/(admin)/payment/success/page.tsx
 *
 * Landing page after Stripe Connect onboarding (or checkout) redirects back.
 * Reads ?account_id= or ?session_id= from the URL, shows a success state,
 * then lets the user continue to their dashboard.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("account_id");
  const sessionId = searchParams.get("session_id");

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  function handleContinue() {
    router.push("/dashboard");
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 text-center w-full"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: ready ? 1 : 0.4 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          {ready ? (
            <CheckCircle2 size={36} className="text-[#064e3b]" />
          ) : (
            <Loader2 size={28} className="text-[#064e3b] animate-spin" />
          )}
        </div>
        {ready &&
          [...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: Math.cos((i / 6) * Math.PI * 2) * 40,
                y: Math.sin((i / 6) * Math.PI * 2) * 40,
              }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: i % 2 === 0 ? "#064e3b" : "#6ee7b7" }}
            />
          ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2
          className="text-2xl font-extrabold text-[#0f1f1a] tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          {sessionId ? "Payment successful!" : "Setup complete!"}
        </h2>
        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
          {sessionId
            ? "Thank you — your payment has been received."
            : accountId
            ? "Your Stripe account has been connected. Return to the dashboard to check its status."
            : "You can now return to your dashboard."}
        </p>
      </motion.div>

      {(accountId || sessionId) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full bg-[#f8fffe] border border-emerald-100 rounded-2xl p-5 text-left"
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Reference
          </p>
          <p className="text-xs font-mono text-emerald-800 break-all">
            {accountId ?? sessionId}
          </p>
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleContinue}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#064e3b] text-white text-sm font-semibold rounded-xl shadow-md hover:bg-[#053d2f] transition-colors"
      >
        Go to Dashboard
        <ChevronRight size={15} />
      </motion.button>
    </motion.div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#f8fffe] flex flex-col items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-50/60 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-emerald-100/50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-emerald-50/50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md p-10"
      >
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#064e3b] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
              <path d="M12 2v20M2 7l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <span
            className="font-extrabold text-lg text-[#0f1f1a] tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Masjid Platform
          </span>
        </div>

        <Suspense fallback={<div className="h-40" />}>
          <SuccessContent />
        </Suspense>
      </motion.div>

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