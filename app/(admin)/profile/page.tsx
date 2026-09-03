/**
 * Profile Management Page
 *
 * File location: app/(dashboard)/profile/page.tsx
 *
 * Matches the design system from app/(public)/discover/page.tsx:
 * – Manrope headings, DM Sans body, #003527 green palette
 * – Framer Motion animations, same card/button patterns
 */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, ShieldCheck, BarChart2, AlertTriangle,
  BadgeCheck, Edit3, Save, X, Eye, EyeOff, Loader2,
  ChevronRight, RefreshCw,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import type { UpdateProfilePayload } from "@/types/profile";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function initials(first?: string | null, last?: string | null) {
  return `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}` || "?";
}

// ─── Tab nav items ────────────────────────────────────────────────────────────

type Section = "personal" | "contact" | "security" | "activity" | "danger";

const TABS: { id: Section; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { id: "personal", label: "Personal",  icon: User },
  { id: "contact",  label: "Contact",   icon: Mail },
  { id: "security", label: "Security",  icon: ShieldCheck },
  { id: "activity", label: "Activity",  icon: BarChart2 },
  { id: "danger",   label: "Danger",    icon: AlertTriangle, danger: true },
];

// ─── Reusable field components ────────────────────────────────────────────────

// ✅ FIX: now accepts htmlFor so it can be paired with a matching input id —
// previously a bare <label> with no association, so getByLabel() couldn't
// find any field on this page.
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-400 block mb-1">
      {children}
    </label>
  );
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-[#003527]">{children ?? "—"}</p>;
}

function FieldInput({
  id, value, onChange, placeholder, type = "text", className,
}: {
  id?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full bg-[#f2f3ff] border border-transparent rounded-xl px-4 py-2.5",
        "text-sm font-medium text-[#003527] placeholder:text-slate-300",
        "focus:ring-2 focus:ring-[#003527]/20 focus:border-[#003527]/30 focus:outline-none transition-all",
        className,
      )}
    />
  );
}

function SectionCard({
  title, description, action, children, className,
}: {
  title: string; description?: string; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-100 p-6", className)}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-bold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
            {title}
          </h2>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-[#f2f3ff] text-[#003527] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#003527] hover:text-white transition-all shrink-0"
    >
      <Edit3 size={12} /> Edit
    </button>
  );
}

function FormActions({
  onCancel, onSave, saving,
}: {
  onCancel: () => void; onSave: () => void; saving?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-slate-50">
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-[#003527] transition-colors"
      >
        <X size={14} /> Cancel
      </button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 bg-[#003527] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#064e3b] transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? "Saving…" : "Save changes"}
      </motion.button>
    </div>
  );
}

// ─── Section: Personal Info ───────────────────────────────────────────────────

function PersonalSection() {
  const { profile, updateProfile, isUpdating, updateError } = useProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: profile?.first_name ?? "",
    last_name:  profile?.last_name  ?? "",
    username:   profile?.username   ?? "",
    gender:     profile?.gender     ?? "",
  });

  const f = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const payload: UpdateProfilePayload = {
      email:      profile?.email ?? "",   // required by backend
      first_name: form.first_name,
      last_name:  form.last_name,
      username:   form.username,
      gender:     form.gender,
    };
    const ok = await updateProfile(payload);
    if (ok) setEditing(false);
  };

  return (
    <SectionCard
      title="Personal Information"
      description="Your display name, username, and gender"
      action={!editing ? <EditButton onClick={() => setEditing(true)} /> : undefined}
    >
      {!editing ? (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {[
            { label: "First name",  value: profile?.first_name },
            { label: "Last name",   value: profile?.last_name  },
            { label: "Username",    value: profile?.username ? `@${profile.username}` : null },
            { label: "Gender",      value: profile?.gender },
          ].map(({ label, value }) => (
            <div key={label}>
              <FieldLabel>{label}</FieldLabel>
              <FieldValue>{value}</FieldValue>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="personal-first-name">First name</FieldLabel>
              <FieldInput id="personal-first-name" value={form.first_name} onChange={f("first_name")} placeholder="First name" />
            </div>
            <div>
              <FieldLabel htmlFor="personal-last-name">Last name</FieldLabel>
              <FieldInput id="personal-last-name" value={form.last_name} onChange={f("last_name")} placeholder="Last name" />
            </div>
            <div>
              <FieldLabel htmlFor="personal-username">Username</FieldLabel>
              <FieldInput id="personal-username" value={form.username} onChange={f("username")} placeholder="username" />
            </div>
            <div>
              <FieldLabel htmlFor="personal-gender">Gender</FieldLabel>
              <select
                id="personal-gender"
                value={form.gender}
                onChange={(e) => f("gender")(e.target.value)}
                className="w-full bg-[#f2f3ff] border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium text-[#003527] focus:ring-2 focus:ring-[#003527]/20 focus:outline-none"
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Prefer not to say</option>
              </select>
            </div>
          </div>
          {updateError && (
            <p className="text-xs text-red-500 mt-3">{updateError}</p>
          )}
          <FormActions
            onCancel={() => setEditing(false)}
            onSave={handleSave}
            saving={isUpdating}
          />
        </>
      )}
    </SectionCard>
  );
}

// ─── Section: Contact & Location ─────────────────────────────────────────────

function ContactSection() {
  const { profile, updateProfile, isUpdating, updateError } = useProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    phone_country: profile?.phone_number?.country_code ?? "1",
    phone_number:  profile?.phone_number?.number       ?? "",
  });

  const handleSave = async () => {
    const ok = await updateProfile({
      email:        profile?.email ?? "",   // required by backend
      phone_number: {
        country_code: form.phone_country,
        number:       form.phone_number,
      },
    });
    if (ok) setEditing(false);
  };

  return (
    <SectionCard
      title="Contact & Location"
      description="Email address and phone number"
      action={!editing ? <EditButton onClick={() => setEditing(true)} /> : undefined}
    >
      {!editing ? (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <FieldLabel>Email</FieldLabel>
            <FieldValue>{profile?.email}</FieldValue>
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <FieldValue>
              {profile?.phone_number
                ? `+${profile.phone_number.country_code} ${profile.phone_number.number}`
                : null}
            </FieldValue>
          </div>
        </div>
      ) : (
        <>
          {/* Email is read-only — shown as info */}
          <div className="mb-4 bg-[#f8fffe] border border-emerald-50 rounded-xl px-4 py-3">
            <FieldLabel>Email (cannot be changed here)</FieldLabel>
            <p className="text-sm font-medium text-slate-400">{profile?.email}</p>
          </div>

          <div>
            <FieldLabel htmlFor="contact-phone-number">Phone number</FieldLabel>
            <div className="flex gap-2">
              <FieldInput
                id="contact-phone-country"
                value={form.phone_country}
                onChange={(v) => setForm((p) => ({ ...p, phone_country: v }))}
                placeholder="1"
                className="w-20 shrink-0"
              />
              <FieldInput
                id="contact-phone-number"
                value={form.phone_number}
                onChange={(v) => setForm((p) => ({ ...p, phone_number: v }))}
                placeholder="Phone number"
              />
            </div>
          </div>

          {updateError && (
            <p className="text-xs text-red-500 mt-3">{updateError}</p>
          )}
          <FormActions
            onCancel={() => setEditing(false)}
            onSave={handleSave}
            saving={isUpdating}
          />
        </>
      )}
    </SectionCard>
  );
}

// ─── Section: Security ────────────────────────────────────────────────────────

function SecuritySection() {
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState({ cur: false, next: false, conf: false });
  const [form, setForm] = useState({ cur: "", next: "", conf: "" });
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: keyof typeof show) =>
    setShow((p) => ({ ...p, [k]: !p[k] }));

  const handleSave = () => {
    if (!form.cur || !form.next || !form.conf) {
      setError("All fields are required.");
      return;
    }
    if (form.next !== form.conf) {
      setError("New passwords do not match.");
      return;
    }
    if (form.next.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    // TODO: call PATCH /api/profile with new password
    setEditing(false);
    setForm({ cur: "", next: "", conf: "" });
    setError(null);
  };

  // ✅ FIX: each PwField now has a unique id (security-{field}-password)
  // wired to its FieldLabel via htmlFor, plus a matching data-testid on
  // the show/hide toggle button — previously all three inputs shared the
  // same placeholder "••••••••" with no way to target one specifically
  // except by DOM order.
  const PwField = ({
    label, field,
  }: {
    label: string;
    field: "cur" | "next" | "conf";
  }) => {
    const id = `security-${field}-password`;
    return (
      <div>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className="relative">
          <FieldInput
            id={id}
            type={show[field] ? "text" : "password"}
            value={form[field]}
            onChange={(v) => setForm((p) => ({ ...p, [field]: v }))}
            placeholder="••••••••"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => toggle(field)}
            data-testid={`toggle-${field}-password-visibility`}
            aria-label={show[field] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#003527] transition-colors"
          >
            {show[field] ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <SectionCard
      title="Security"
      description="Update your password"
      action={!editing ? <EditButton onClick={() => setEditing(true)} /> : undefined}
    >
      {!editing ? (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <FieldLabel>Password</FieldLabel>
            <FieldValue>••••••••••••</FieldValue>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <PwField label="Current password" field="cur" />
            <PwField label="New password"     field="next" />
            <PwField label="Confirm new password" field="conf" />
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <FormActions
            onCancel={() => { setEditing(false); setError(null); }}
            onSave={handleSave}
          />
        </>
      )}
    </SectionCard>
  );
}

// ─── Section: Activity ────────────────────────────────────────────────────────

function ActivitySection() {
  return (
    <SectionCard title="Your Activity" description="Masjids you follow and manage">
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Following",     value: "—" },
          { label: "My Masjids",    value: "—" },
          { label: "Contributions", value: "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#f8fffe] rounded-xl border border-emerald-50 p-4 text-center">
            <p className="text-2xl font-extrabold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
              {value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <motion.a
        href="/dashboard/my-masjids"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#f2f3ff] text-[#003527] font-bold text-sm rounded-xl hover:bg-[#003527] hover:text-white transition-all group"
      >
        View my masjids
        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </motion.a>
    </SectionCard>
  );
}

// ─── Section: Danger Zone ─────────────────────────────────────────────────────

function DangerSection() {
  const [confirming, setConfirming] = useState(false);

  return (
    <SectionCard title="Danger Zone" description="Irreversible account actions">
      <div className="border border-red-100 rounded-2xl p-5">
        <p className="font-bold text-sm text-red-700 mb-1">Delete account</p>
        <p className="text-xs text-slate-400 mb-4">
          Once deleted, your account and all associated data are permanently removed.
          This cannot be undone.
        </p>

        <AnimatePresence mode="wait">
          {!confirming ? (
            <motion.button
              key="open"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
            >
              <AlertTriangle size={12} /> Delete my account
            </motion.button>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <p className="text-xs font-semibold text-red-600">Are you sure?</p>
              <button
                onClick={() => { /* TODO: call delete account API */ }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-[#003527] transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SectionCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, isLoading, error, refetch } = useProfile();
  const [activeSection, setActiveSection] = useState<Section>("personal");

  const sectionComponents: Record<Section, React.ReactNode> = {
    personal: <PersonalSection />,
    contact:  <ContactSection />,
    security: <SecuritySection />,
    activity: <ActivitySection />,
    danger:   <DangerSection />,
  };

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto" style={{ fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-4 mb-6"
      >
        {/* Avatar */}
        <div className="shrink-0">
          {isLoading ? (
            <div className="w-12 h-12 rounded-full bg-slate-100 animate-pulse" />
          ) : profile?.profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profile_picture_url} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div
              className="w-12 h-12 rounded-full bg-[#003527] text-[#b0f0d6] flex items-center justify-center font-extrabold"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {initials(profile?.first_name, profile?.last_name)}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-0.5">Account</p>
          <h1 className="text-xl font-extrabold text-[#003527] leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            {isLoading
              ? "Loading…"
              : `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Profile Settings"}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {profile?.username && <span className="text-xs text-slate-400">@{profile.username}</span>}
            {profile?.is_verified && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <BadgeCheck size={10} /> Verified
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Tab nav ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-1 mb-5 bg-white border border-slate-100 rounded-2xl p-1.5 overflow-x-auto"
      >
        {TABS.map(({ id, label, icon: Icon, danger }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
              activeSection === id
                ? danger
                  ? "bg-red-50 text-red-700"
                  : "bg-[#003527] text-white shadow-sm"
                : danger
                  ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                  : "text-slate-400 hover:bg-slate-50 hover:text-[#003527]"
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </motion.div>

      {/* ── Section content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={26} className="text-[#003527] animate-spin" />
        </div>
      ) : error && error !== "unauthenticated" ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <RefreshCw size={20} className="text-red-300" />
          </div>
          <h3 className="font-bold text-[#003527] mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
            Failed to load profile
          </h3>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button onClick={refetch} className="text-sm font-semibold text-[#003527] underline underline-offset-2">
            Try again
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {sectionComponents[activeSection]}
          </motion.div>
        </AnimatePresence>
      )}

    </div>
  );
}