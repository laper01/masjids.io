"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type State = "idle" | "loading" | "success" | "error";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") ?? "";

  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [state,           setState]           = useState<State>("idle");
  const [errorMsg,        setErrorMsg]        = useState("");

  const passwordsMatch  = newPassword === confirmPassword;
  const passwordStrong  = newPassword.length >= 8;
  const canSubmit       = passwordsMatch && passwordStrong && !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password:     newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.message ?? "Failed to reset password. The link may have expired.");
        setState("error");
        return;
      }

      setState("success");
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  };

  /* ── Missing token guard ──────────────────────────────────────── */
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-xl font-extrabold text-[#003527] mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
            Invalid Reset Link
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex px-5 py-2.5 text-sm font-bold text-white rounded-lg"
            style={{ background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)" }}
          >
            Request a New Link
          </Link>
        </div>
      </div>
    );
  }

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

      <div className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 relative z-10">
        <div className="w-full max-w-md">
          <div
            className="bg-white rounded-xl p-8"
            style={{
              boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.08)",
              border: "1px solid rgba(191,201,195,0.2)",
            }}
          >
            {state !== "success" ? (
              <>
                <div className="mb-7">
                  <h1
                    className="text-3xl font-extrabold text-[#003527] tracking-tight mb-2"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    New Password
                  </h1>
                  <p className="text-slate-500 text-sm">Choose a strong password for your account.</p>
                </div>

                {state === "error" && (
                  <div role="alert" className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* New password */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="new-password"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        required
                        disabled={state === "loading"}
                        className="w-full bg-[#f2f3ff] rounded-lg py-3 pl-10 pr-10 text-[#131b2e] placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-[#003527]/20 transition-all border-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        aria-label={showNew ? "Hide" : "Show"}
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="flex gap-1 mt-1.5 px-1">
                        {[1, 2, 3, 4].map((n) => (
                          <div
                            key={n}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              newPassword.length >= n * 3 ? "bg-[#003527]" : "bg-slate-200"
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-slate-400 ml-1">
                          {newPassword.length < 6
                            ? "Weak"
                            : newPassword.length < 10
                            ? "Fair"
                            : newPassword.length < 14
                            ? "Good"
                            : "Strong"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirm-password" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        required
                        disabled={state === "loading"}
                        className="w-full bg-[#f2f3ff] rounded-lg py-3 pl-10 pr-10 text-[#131b2e] placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-[#003527]/20 transition-all border-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        aria-label={showConfirm ? "Hide" : "Show"}
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-[11px] text-red-500 px-1 mt-1">Passwords do not match.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || state === "loading"}
                    className="w-full text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)",
                      boxShadow: "0px 8px 24px -6px rgba(0,53,39,0.35)",
                    }}
                  >
                    {state === "loading" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                    {state === "loading" ? "Saving…" : "Set New Password"}
                  </button>
                </form>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#b0f0d6] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-[#003527]" aria-hidden="true" />
                </div>
                <h2
                  className="text-2xl font-extrabold text-[#003527] mb-2"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  Password Updated!
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Your password has been reset. Redirecting you to sign in…
                </p>
                <div className="mt-5 w-8 h-1 bg-[#b0f0d6] rounded-full mx-auto animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}