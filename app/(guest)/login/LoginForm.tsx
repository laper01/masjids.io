"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Globe, Loader2 } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
const rawCallback = searchParams.get("callbackUrl") ?? "/dashboard";

// ✅ Always use relative path — prevents open redirect + breaks the loop
const callbackUrl = rawCallback.startsWith("/") ? rawCallback : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // NEW
  const [error, setError] = useState<string | null>(null);

  // --- NEW: Handle Google Login with loading state ---
  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error("Google Login Error:", err);
      setError("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };
  // ---------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }
    router.push(callbackUrl);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff] relative overflow-hidden">
      {/* Mesh gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(at 0% 0%, rgba(149,211,186,0.18) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(6,78,59,0.06) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(210,217,244,0.22) 0px, transparent 50%)",
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
            <div className="text-center mb-8">
              <h1
                className="text-3xl font-extrabold text-[#003527] tracking-tight mb-2"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                The Gate
              </h1>
              <p className="text-slate-500 text-sm">Enter the sacred sanctuary of your community.</p>
            </div>

            {error && (
              <div role="alert" className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Google Sign In Button — now uses handleGoogleLogin */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#131b2e] font-medium py-3 px-4 rounded-lg transition-all duration-200 group disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ border: "1px solid rgba(191,201,195,0.2)" }}
            >
              {isGoogleLoading ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <span className="group-hover:scale-110 transition-transform">
                  <GoogleIcon />
                </span>
              )}
              {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-[11px] uppercase tracking-widest text-slate-400 font-medium">
                  or sign in with email
                </span>
              </div>
            </div>

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
                    disabled={loading || isGoogleLoading}
                    className="w-full bg-[#f2f3ff] rounded-lg py-3 pl-10 pr-4 text-[#131b2e] placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-[#003527]/20 transition-all border-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="password" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-[11px] font-semibold text-[#003527] hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading || isGoogleLoading}
                    className="w-full bg-[#f2f3ff] rounded-lg py-3 pl-10 pr-10 text-[#131b2e] placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-[#003527]/20 transition-all border-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isGoogleLoading}
                className="w-full text-white font-bold py-3.5 rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-95 mt-1 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
                style={{
                  background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)",
                  boxShadow: "0px 8px 24px -6px rgba(0,53,39,0.35)",
                }}
              >
                {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-[#003527] font-bold hover:underline ml-1">
                  Create an Account
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-4">
            {[
              { icon: ShieldCheck, label: "Secure & Encrypted" },
              { icon: Globe, label: "Global Sanctuary" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full"
                style={{ border: "1px solid rgba(191,201,195,0.2)" }}
              >
                <Icon size={13} className="text-emerald-700" aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}