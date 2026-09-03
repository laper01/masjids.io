"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type State = "loading" | "success" | "error";

export default function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [state,   setState]   = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Verification token is missing or invalid.");
      return;
    }

    const verify = async () => {
      try {
        const res  = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          setState("error");
          setMessage(data.message ?? "Verification failed. The link may have expired.");
          return;
        }

        setState("success");
        setMessage(data.message ?? "Your email has been verified successfully.");
      } catch {
        setState("error");
        setMessage("Network error. Please try again.");
      }
    };

    verify();
  }, [token]);

  const isLoading = state === "loading";

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff] relative overflow-hidden">
      {/* Mesh gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            radial-gradient(at 0% 0%, rgba(149,211,186,0.18) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(6,78,59,0.06) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(210,217,244,0.22) 0px, transparent 50%)
          `,
        }}
      />

      <div className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 relative z-10" role="main">
        <div className="w-full max-w-md">
          <div
            className="bg-white rounded-xl p-10 text-center"
            style={{
              boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.08)",
              border: "1px solid rgba(191,201,195,0.2)",
            }}
          >
            {/* Loading state */}
            {isLoading && (
              <div aria-live="polite" aria-busy="true">
                <div className="w-16 h-16 rounded-full bg-[#f2f3ff] flex items-center justify-center mx-auto mb-5">
                  <Loader2 size={28} className="text-[#003527] animate-spin" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#003527] mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Verifying Your Email
                </h1>
                <p className="text-slate-500 text-sm">Please wait while we confirm your account…</p>
              </div>
            )}

            {/* Success state */}
            {state === "success" && (
              <div aria-live="polite">
                <div className="w-16 h-16 rounded-full bg-[#b0f0d6] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-[#003527]" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#003527] mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Email Verified!
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-7">{message}</p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 text-white font-bold rounded-lg text-sm transition-all hover:-translate-y-0.5 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)",
                    boxShadow: "0 6px 20px -6px rgba(0,53,39,0.4)",
                  }}
                >
                  Sign In to Your Account
                </Link>
              </div>
            )}

            {/* Error state */}
            {state === "error" && (
              <div aria-live="polite">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={32} className="text-red-500" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#003527] mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Verification Failed
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-7">{message}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-5 py-2.5 text-white font-bold rounded-lg text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)" }}
                  >
                    Go to Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-[#f2f3ff] text-[#003527] font-bold rounded-lg text-sm hover:bg-[#e2e7ff] transition-colors"
                  >
                    Re-register Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}