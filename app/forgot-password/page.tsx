"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

type State = "idle" | "loading" | "success" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.message ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setState("error");
    }
  };

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

      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-emerald-950" style={{ fontFamily: "Manrope, sans-serif" }}>
            masjids.io
          </Link>
          <button className="bg-[#003527] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#064e3b] transition-colors">
            Support
          </button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 relative z-10">
        <div className="w-full max-w-md">
          <div
            className="bg-white rounded-xl p-8"
            style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.08)", border: "1px solid rgba(191,201,195,0.2)" }}
          >
            {state !== "success" ? (
              <>
                {/* Back link */}
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#003527] transition-colors mb-6"
                >
                  <ArrowLeft size={13} aria-hidden="true" />
                  Back to Sign In
                </Link>

                <div className="mb-7">
                  <h1
                    className="text-3xl font-extrabold text-[#003527] tracking-tight mb-2"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    Reset Password
                  </h1>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Enter your email and we&apos;ll send you a secure link to reset your password.
                  </p>
                </div>

                {/* Error */}
                {state === "error" && (
                  <div role="alert" className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@masjid.io"
                        autoComplete="email"
                        required
                        disabled={state === "loading"}
                        className="w-full bg-[#f2f3ff] rounded-lg py-3 pl-10 pr-4 text-[#131b2e] placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-[#003527]/20 transition-all border-none disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="w-full text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)", boxShadow: "0px 8px 24px -6px rgba(0,53,39,0.35)" }}
                  >
                    {state === "loading" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                    {state === "loading" ? "Sending…" : "Send Reset Link"}
                  </button>
                </form>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#b0f0d6] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-[#003527]" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#003527] mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Check Your Email
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-7">
                  A password reset link has been sent to{" "}
                  <strong className="text-[#003527]">{email}</strong>. It expires in 30 minutes.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-lg text-sm transition-all hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)" }}
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  Back to Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200/20 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>© 2024 masjids.io. The Sacred Sanctuary.</p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Help Center", "Contact"].map((l) => (
              <a key={l} href="#" className="hover:text-emerald-700 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
