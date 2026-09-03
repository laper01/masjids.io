"use client";

/*
  Register Community page
  ─────────────────────────────────────────────────────────────
  Fields  : firstName, lastName, username, email, phoneNumber (with country code),
            gender, password, confirm_password
  Styling : Matches RegisterMasjidModal exactly (lucide-react, cn, Tailwind only)
  State   : Native React state (no Formik/Yup)
  API     : POST /api/register
  ─────────────────────────────────────────────────────────────
*/

import { useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  AtSign,
  Mail,
  Phone,
  Users,
  Lock,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Shared Constants & Types
// ─────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { code: "US", name: "United States", phone: "1" },
  { code: "GB", name: "United Kingdom", phone: "44" },
  { code: "CA", name: "Canada", phone: "1" },
  { code: "AU", name: "Australia", phone: "61" },
  { code: "ID", name: "Indonesia", phone: "62" },
  { code: "MY", name: "Malaysia", phone: "60" },
  { code: "SG", name: "Singapore", phone: "65" },
  { code: "SA", name: "Saudi Arabia", phone: "966" },
  { code: "AE", name: "UAE", phone: "971" },
  { code: "PK", name: "Pakistan", phone: "92" },
  { code: "BD", name: "Bangladesh", phone: "880" },
  { code: "IN", name: "India", phone: "91" },
  { code: "EG", name: "Egypt", phone: "20" },
  { code: "TR", name: "Turkey", phone: "90" },
  { code: "NG", name: "Nigeria", phone: "234" },
];

type Errors = Record<string, string>;

// ─────────────────────────────────────────────────────────────
// Shared Primitives (Extracted directly from RegisterMasjidModal)
// ─────────────────────────────────────────────────────────────

const inputCls = (error?: string) =>
  cn(
    "w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#131b2e] bg-[#f2f3ff] placeholder:text-slate-400 transition-all",
    "focus:outline-none focus:ring-2 focus:bg-white",
    error
      ? "border-red-300 focus:ring-red-200"
      : "border-transparent focus:ring-[#064e3b]/20 focus:border-[#064e3b]/30"
  );

const selectCls = (error?: string) =>
  cn(
    "w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#131b2e] bg-[#f2f3ff] appearance-none transition-all",
    "focus:outline-none focus:ring-2 focus:bg-white",
    error
      ? "border-red-300 focus:ring-red-200"
      : "border-transparent focus:ring-[#064e3b]/20 focus:border-[#064e3b]/30"
  );

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[#131b2e]">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-slate-400">{hint}</p>}
      {error && (
        <p className="text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle size={9} /> {error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────

export default function RegisterCommunityPage() {
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    countryCode: "1",
    phoneNumber: "",
    gender: "",
    password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const patchData = useCallback((patch: Partial<typeof data>) => {
    setData((d) => ({ ...d, ...patch }));
    // Clear the specific error when user starts typing
    const updatedKeys = Object.keys(patch);
    setErrors((prev) => {
      const newErrors = { ...prev };
      updatedKeys.forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  }, []);

  const validate = useCallback(() => {
    const e: Errors = {};

    if (!data.firstName.trim()) e.firstName = "Required";
    else if (data.firstName.length < 2) e.firstName = "Too short";

    if (!data.lastName.trim()) e.lastName = "Required";
    else if (data.lastName.length < 2) e.lastName = "Too short";

    if (!data.username.trim()) e.username = "Required";
    else if (data.username.length < 4 || data.username.length > 20)
      e.username = "Must be 4-20 characters";
    else if (!/^[a-zA-Z0-9]+$/.test(data.username))
      e.username = "Letters and numbers only";

    if (!data.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      e.email = "Invalid email address";

    if (!data.phoneNumber.trim()) e.phoneNumber = "Required";

    if (!data.gender) e.gender = "Please select a gender";

    if (!data.password) e.password = "Required";
    else if (data.password.length < 8) e.password = "At least 8 characters";

    if (!data.confirm_password) e.confirm_password = "Required";
    else if (data.password !== data.confirm_password)
      e.confirm_password = "Passwords must match";

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      // Scroll to top if there are validation errors
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Format phone number to match typical standards (+CodeNumber)
      const fullPhoneNumber = `+${data.countryCode}${data.phoneNumber}`;

      await axios.post("/api/auth/register", {
        email: data.email,
        username: data.username,
        password: data.password,
        isEmailVerified: false,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: fullPhoneNumber,
        gender: data.gender,
      });

      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const d = err.response?.data;
        setSubmitError(
          d?.error?.detail ?? d?.message ?? "Registration failed. Please try again."
        );
      } else {
        setSubmitError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl p-10 w-full max-w-md text-center shadow-xl"
          style={{ border: "1px solid rgba(191,201,195,0.2)" }}
        >
          <div className="h-16 w-16 rounded-2xl bg-[#b0f0d6]/40 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-[#003527]" />
          </div>
          <h2
            className="text-xl font-extrabold text-[#003527] mb-2"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Registration Successful!
          </h2>
          <p className="text-sm text-slate-500 mb-1">
            We sent a verification email to{" "}
            <span className="font-bold text-[#131b2e]">{data.email}</span>.
          </p>
          <p className="text-xs text-slate-400 mb-8">
            Check your inbox (and spam folder) and click the link to activate
            your account.
          </p>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)",
              boxShadow: "0 4px 16px -4px rgba(0,53,39,0.35)",
            }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center p-4">
      {/* Mesh gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(at 0% 0%, rgba(149,211,186,0.18) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(6,78,59,0.06) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(210,217,244,0.22) 0px, transparent 50%)",
        }}
      />

      <div className="relative z-10 w-full max-w-lg my-8">
        {/* Card */}
        <div
          className="bg-white rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: "1px solid rgba(191,201,195,0.2)" }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#eaedff]">
            <h1
              className="text-lg font-extrabold text-[#003527]"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Create Account
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#003527] font-bold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {/* Error banner */}
            {submitError && (
              <div className="mb-5 flex items-start gap-2 bg-red-50 text-red-600 text-xs font-medium px-4 py-3 rounded-xl border border-red-200">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            <form id="register-form" onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" required error={errors.firstName}>
                  <div className="relative">
                    <User
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      className={cn(inputCls(errors.firstName), "pl-8")}
                      placeholder="John"
                      disabled={isSubmitting}
                      value={data.firstName}
                      onChange={(e) => patchData({ firstName: e.target.value })}
                    />
                  </div>
                </Field>

                <Field label="Last Name" required error={errors.lastName}>
                  <input
                    className={inputCls(errors.lastName)}
                    placeholder="Doe"
                    disabled={isSubmitting}
                    value={data.lastName}
                    onChange={(e) => patchData({ lastName: e.target.value })}
                  />
                </Field>
              </div>

              {/* Username */}
              <Field
                label="Username"
                required
                error={errors.username}
                hint="4–20 characters, letters and numbers only"
              >
                <div className="relative">
                  <AtSign
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    className={cn(inputCls(errors.username), "pl-8")}
                    placeholder="johndoe123"
                    autoComplete="username"
                    disabled={isSubmitting}
                    value={data.username}
                    onChange={(e) => patchData({ username: e.target.value })}
                  />
                </div>
              </Field>

              {/* Email Address */}
              <Field label="Email Address" required error={errors.email}>
                <div className="relative">
                  <Mail
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="email"
                    className={cn(inputCls(errors.email), "pl-8")}
                    placeholder="name@masjid.io"
                    autoComplete="email"
                    disabled={isSubmitting}
                    value={data.email}
                    onChange={(e) => patchData({ email: e.target.value })}
                  />
                </div>
              </Field>

              {/* Phone Number (Extracted pattern from Modal Step 3) */}
              <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] gap-3">
                <Field label="Code" required>
                  <div className="relative">
                    <select
                      className={selectCls()}
                      value={data.countryCode}
                      disabled={isSubmitting}
                      onChange={(e) => patchData({ countryCode: e.target.value })}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.phone}>
                          {c.code} (+{c.phone})
                        </option>
                      ))}
                    </select>
                    <Globe
                      size={13}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </Field>

                <Field label="Phone Number" required error={errors.phoneNumber}>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-2.5 bg-[#eaedff] text-xs font-semibold text-[#003527] rounded-l-xl border-r border-[#d5d9ff] whitespace-nowrap">
                      +{data.countryCode}
                    </span>
                    <input
                      type="tel"
                      className={cn(inputCls(errors.phoneNumber), "rounded-l-none")}
                      placeholder="2125550100"
                      disabled={isSubmitting}
                      value={data.phoneNumber}
                      onChange={(e) =>
                        patchData({ phoneNumber: e.target.value.replace(/\D/g, "") })
                      }
                    />
                  </div>
                </Field>
              </div>

              {/* Gender */}
              <Field label="Gender" required error={errors.gender}>
                <div className="relative">
                  <select
                    className={selectCls(errors.gender)}
                    disabled={isSubmitting}
                    value={data.gender}
                    onChange={(e) => patchData({ gender: e.target.value })}
                  >
                    <option value="" disabled>
                      Select Gender
                    </option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                  <Users
                    size={13}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </Field>

              {/* Password + Confirm */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Password" required error={errors.password}>
                  <div className="relative">
                    <Lock
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      className={cn(inputCls(errors.password), "pl-8 pr-9")}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      value={data.password}
                      onChange={(e) => patchData({ password: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </Field>

                <Field
                  label="Confirm Password"
                  required
                  error={errors.confirm_password}
                >
                  <div className="relative">
                    <Lock
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type={showConfirm ? "text" : "password"}
                      className={cn(
                        inputCls(errors.confirm_password),
                        "pl-8 pr-9"
                      )}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      value={data.confirm_password}
                      onChange={(e) =>
                        patchData({ confirm_password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </Field>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#eaedff] bg-[#f2f3ff]/40 flex items-center justify-end">
            <button
              type="submit"
              form="register-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)",
                boxShadow: "0 4px 16px -4px rgba(0,53,39,0.35)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Registering…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Create Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}