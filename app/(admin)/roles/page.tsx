"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Plus, History, CheckCircle2, X, ArrowRight,
  Loader2, AlertCircle, RefreshCw, ChevronDown, UserPlus,
  Trash2, Lock, Unlock, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMosque } from "@/context/MosqueContext";
import { useStaff } from "@/hooks/staff/useStaff";
import type {
  RoleTemplate, AuditLogEntry, AuditAction,
  PermissionScope,
  GetRoleTemplatesResponse,
  CreateRoleTemplateResponse,
  UpdateRoleTemplateResponse,
  GrantPermissionResponse,
  RevokePermissionResponse,
  AssignRoleTemplateResponse,
  GetAuditLogResponse,
} from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCOPE_GROUPS: Record<string, PermissionScope[]> = {
  "Masjid": ["masjid:profile:edit", "masjid:settings:manage"],
  "Members": ["members:view", "members:manage", "members:verify", "members:export"],
  "Notifications": ["notifications:send", "notifications:manage"],
  "Announcements": ["announcements:create", "announcements:delete"],
  "Donations": ["donations:view", "donations:manage", "donations:report", "donations:refund"],
  "Payouts": ["payouts:manage"],
  "Website": ["website:edit", "website:publish", "website:domains"],
  "Events": ["events:create", "events:manage"],
  "Facilities": ["facilities:book"],
  "Elections": ["elections:create", "elections:manage", "elections:view_results"],
  "Community": ["nikkah:moderate", "reverts:manage", "matchmaking:access"],
  "Admin": ["permissions:manage", "audit:view"],
};

const ROLE_COLORS: Record<string, string> = {
  "President/Admin": "bg-emerald-500",
  "Imam": "bg-violet-500",
  "Treasurer": "bg-amber-500",
  "Comms Officer": "bg-sky-500",
  "Webmaster": "bg-indigo-500",
  "Volunteer": "bg-slate-400",
  "Member": "bg-slate-300",
};

const ACTION_META: Record<AuditAction, { label: string; dot: string }> = {
  role_assigned: { label: "Role Assigned", dot: "bg-emerald-500" },
  scope_granted:  { label: "Scope Granted",  dot: "bg-sky-500"     },
  scope_revoked:  { label: "Scope Revoked",  dot: "bg-red-400"     },
};

// ─── Small helpers ─────────────────────────────────────────────────────────────

function roleColor(name: string) {
  return ROLE_COLORS[name] ?? "bg-[#003527]";
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

function displayName(s: { name: string; email?: string }) {
  return s.name?.trim() || s.email || "Unknown";
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  sub?: string;
  type?: "success" | "error";
  onClose: () => void;
}
function Toast({ message, sub, type = "success", onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 rounded-xl z-[60]",
        type === "success" ? "bg-emerald-900" : "bg-red-900"
      )}
      style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.3)" }}
      role="status"
      aria-live="polite"
    >
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        {type === "success"
          ? <CheckCircle2 size={16} className="text-white" />
          : <AlertCircle size={16} className="text-white" />}
      </div>
      <div>
        <p className="text-sm font-bold text-white">{message}</p>
        {sub && <p className="text-[11px] opacity-60 mt-0.5 text-white">{sub}</p>}
      </div>
      <button onClick={onClose} aria-label="Dismiss" className="ml-2 opacity-50 hover:opacity-100 transition-opacity text-white">
        <X size={16} />
      </button>
    </motion.div>
  );
}

// ─── Scope Badge ──────────────────────────────────────────────────────────────

function ScopeBadge({
  scope, onRemove, onGrant, onRevoke, mode,
}: {
  scope: PermissionScope;
  onRemove?: () => void;
  onGrant?: () => void;
  onRevoke?: () => void;
  mode: "edit" | "view" | "override";
}) {
  return (
    <span className="px-2 py-1 bg-[#e2e7ff] rounded text-[11px] font-mono text-[#064e3b] flex items-center gap-1.5 group">
      {scope}
      {mode === "edit" && onRemove && (
        <button onClick={onRemove} aria-label={`Remove ${scope}`}
          className="opacity-30 hover:opacity-100 transition-opacity">
          <X size={10} />
        </button>
      )}
      {mode === "override" && (
        <>
          <button onClick={onGrant} aria-label={`Grant ${scope}`}
            className="opacity-30 hover:opacity-100 transition-opacity text-emerald-700">
            <Unlock size={10} />
          </button>
          <button onClick={onRevoke} aria-label={`Revoke ${scope}`}
            className="opacity-30 hover:opacity-100 transition-opacity text-red-600">
            <Lock size={10} />
          </button>
        </>
      )}
    </span>
  );
}

// ─── Scope Picker ─────────────────────────────────────────────────────────────

function ScopePicker({
  selected, onChange,
}: {
  selected: PermissionScope[];
  onChange: (s: PermissionScope[]) => void;
}) {
  const [search, setSearch] = useState("");
  const toggle = (s: PermissionScope) =>
    onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
        <Search size={13} className="text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search scopes…"
          className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
        />
      </div>
      <div className="max-h-56 overflow-y-auto p-3 space-y-3">
        {Object.entries(SCOPE_GROUPS).map(([group, scopes]) => {
          const filtered = scopes.filter(s => s.toLowerCase().includes(search.toLowerCase()));
          if (!filtered.length) return null;
          return (
            <div key={group}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {filtered.map(s => (
                  <button
                    key={s}
                    onClick={() => toggle(s)}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-mono transition-all",
                      selected.includes(s)
                        ? "bg-[#003527] text-white"
                        : "bg-[#e2e7ff] text-[#064e3b] hover:bg-[#cdd4ff]"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Create Role Modal ────────────────────────────────────────────────────────

function CreateRoleModal({
  apiBase, onClose, onCreated,
}: {
  apiBase: string;
  onClose: () => void;
  onCreated: (t: RoleTemplate) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionScope[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !description.trim() || permissions.length === 0) {
      setError("Name, description and at least one scope are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/role-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, permissions }),
      });
      const json: CreateRoleTemplateResponse = await res.json();
      if (!json.success) throw new Error(json.message);
      onCreated(json.data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create role.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Create New Role" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Role Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Social Media Manager"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003527] transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} placeholder="What does this role do?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003527] transition-colors resize-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
            Permission Scopes <span className="text-[#003527]">({permissions.length} selected)</span>
          </label>
          <ScopePicker selected={permissions} onChange={setPermissions} />
        </div>
        {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      </div>
      <ModalFooter onClose={onClose} onConfirm={handleSubmit} loading={loading} confirmLabel="Create Role" />
    </ModalShell>
  );
}

// ─── Edit Role Modal ──────────────────────────────────────────────────────────

function EditRoleModal({
  role, apiBase, masjidId, onClose, onSaved, onToast,
}: {
  role: RoleTemplate;
  apiBase: string;
  masjidId: string;
  onClose: () => void;
  onSaved: (t: RoleTemplate) => void;
  onToast: (msg: string, sub?: string, type?: "success" | "error") => void;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [permissions, setPermissions] = useState<PermissionScope[]>([...role.permissions]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overrideUserId, setOverrideUserId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const { staff, loading: staffLoading, getStaff } = useStaff();
  useEffect(() => { if (masjidId) getStaff(masjidId); }, [masjidId]); // eslint-disable-line react-hooks/exhaustive-deps
  const staffList = staff?.data ?? [];

  const isSystem = role.is_system;

  async function handleSave() {
    if (!name.trim() || !description.trim() || permissions.length === 0) {
      setError("Name, description and at least one scope are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/role-templates/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, permissions }),
      });
      const json: UpdateRoleTemplateResponse = await res.json();
      if (!json.success) throw new Error(json.message);
      onSaved(json.data);
      onToast("Role Updated", `${json.data.affected_member_count} member(s) re-evaluated.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role.");
    } finally {
      setLoading(false);
    }
  }

  async function handleScopeOverride(scope: PermissionScope, action: "grant" | "revoke") {
    if (!overrideUserId) { onToast("Select a user first.", undefined, "error"); return; }
    if (!overrideReason.trim()) { onToast("A reason is required.", undefined, "error"); return; }
    setOverrideLoading(true);
    try {
      const endpoint = action === "grant" ? "grant" : "revoke";
      const res = await fetch(`${apiBase}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: overrideUserId, scope, reason: overrideReason }),
      });
      const json: GrantPermissionResponse | RevokePermissionResponse = await res.json();
      if (!json.success) throw new Error(json.message);
      const member = staffList.find(s => s.user_id === overrideUserId);
      onToast(
        action === "grant" ? "Scope Granted" : "Scope Revoked",
        `${scope} → ${member ? displayName(member) : overrideUserId}`
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Override failed.", undefined, "error");
    } finally {
      setOverrideLoading(false);
    }
  }

  return (
    <ModalShell title={`Edit Role: ${role.name}`} onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left — template fields */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template</p>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} disabled={isSystem}
              className={cn("w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none transition-colors",
                isSystem ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "focus:border-[#003527]")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              disabled={isSystem}
              className={cn("w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none resize-none transition-colors",
                isSystem ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "focus:border-[#003527]")} />
          </div>
          {isSystem && (
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <Lock size={11} /> System roles cannot be renamed or edited.
            </p>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
              Scopes <span className="text-[#003527]">({permissions.length})</span>
            </label>
            {isSystem ? (
              <div className="flex flex-wrap gap-1.5">
                {permissions.map(s => <ScopeBadge key={s} scope={s} mode="view" />)}
              </div>
            ) : (
              <ScopePicker selected={permissions} onChange={setPermissions} />
            )}
          </div>
          {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        </div>

        {/* Right — individual overrides */}
        <div className="space-y-4 border-l border-slate-100 pl-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Individual Overrides</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Grant or revoke a specific scope for one member on top of this template.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Target Member</label>
            <select value={overrideUserId} onChange={e => setOverrideUserId(e.target.value)}
              disabled={staffLoading}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003527] bg-white disabled:opacity-60">
              <option value="">{staffLoading ? "Loading members…" : "Select member…"}</option>
              {staffList.map(s => (
                <option key={s.user_id} value={s.user_id}>{displayName(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Reason (audit)</label>
            <input value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
              placeholder="e.g. Covering for Treasurer on leave"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003527]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Scope</label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {permissions.map(s => (
                <ScopeBadge
                  key={s} scope={s} mode="override"
                  onGrant={() => handleScopeOverride(s, "grant")}
                  onRevoke={() => handleScopeOverride(s, "revoke")}
                />
              ))}
            </div>
            {overrideLoading && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                <Loader2 size={11} className="animate-spin" /> Applying override…
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSystem && (
        <ModalFooter onClose={onClose} onConfirm={handleSave} loading={loading} confirmLabel="Save Changes" />
      )}
      {isSystem && (
        <div className="flex justify-end mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Close
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Promote Modal ────────────────────────────────────────────────────────────

function PromoteModal({
  templates, apiBase, masjidId, onClose, onPromoted,
}: {
  templates: RoleTemplate[];
  apiBase: string;
  masjidId: string;
  onClose: () => void;
  onPromoted: (data: AssignRoleTemplateResponse["data"]) => void;
}) {
  const [userId, setUserId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { staff, loading: staffLoading, getStaff } = useStaff();
  useEffect(() => { if (masjidId) getStaff(masjidId); }, [masjidId]); // eslint-disable-line react-hooks/exhaustive-deps
  const staffList = staff?.data ?? [];

  useEffect(() => {
    if (staffList.length > 0 && !userId) setUserId(staffList[0].user_id);
  }, [staffList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePromote() {
    if (!userId || !templateId || !reason.trim()) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/assign-role-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role_template_id: templateId, reason }),
      });
      const json: AssignRoleTemplateResponse = await res.json();
      if (!json.success) throw new Error(json.message);
      onPromoted(json.data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign role.");
    } finally {
      setLoading(false);
    }
  }

  const selected = templates.find(t => t.id === templateId);

  return (
    <ModalShell title="Promote Election Winner" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Member</label>
          <select value={userId} onChange={e => setUserId(e.target.value)}
            disabled={staffLoading}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003527] bg-white disabled:opacity-60">
            {staffLoading
              ? <option value="">Loading members…</option>
              : staffList.map(s => (
                  <option key={s.user_id} value={s.user_id}>{displayName(s)}</option>
                ))
            }
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Assign Role</label>
          <select value={templateId} onChange={e => setTemplateId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003527] bg-white">
            <option value="">Select a role template…</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.is_system ? "(system)" : "(custom)"}</option>
            ))}
          </select>
        </div>
        {selected && (
          <div className="p-3 bg-[#f2f3ff] rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Effective Scopes ({selected.permissions.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {selected.permissions.map(s => (
                <span key={s} className="px-2 py-0.5 bg-[#e2e7ff] rounded text-[10px] font-mono text-[#064e3b]">{s}</span>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Reason (audit log)</label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Appointed following Shura Council election"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003527]" />
        </div>
        {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      </div>
      <ModalFooter onClose={onClose} onConfirm={handlePromote} loading={loading} confirmLabel="Promote to Role" />
    </ModalShell>
  );
}

// ─── Remove Staff Modal ───────────────────────────────────────────────────────

function RemoveStaffModal({
  memberName, onClose, onConfirm, loading,
}: {
  memberName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <ModalShell title="Remove Staff Member" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Are you sure you want to remove{" "}
          <span className="font-bold text-[#003527]">{memberName}</span> from
          this masjid? Their access will be revoked immediately.
        </p>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-700 leading-relaxed">
            This action cannot be undone. The member will need to be re-invited to regain access.
          </p>
        </div>
      </div>
      <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-slate-100">
        <button onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="px-5 py-2 text-sm font-bold text-white rounded-lg transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-red-600 hover:bg-red-700">
          {loading && <Loader2 size={13} className="animate-spin" />}
          Remove Member
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Shared Modal Shell & Footer ──────────────────────────────────────────────

function ModalShell({ title, children, onClose, wide }: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog" aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("bg-white rounded-2xl p-8 shadow-2xl w-full", wide ? "max-w-2xl" : "max-w-md")}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-extrabold text-xl text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
            {title}
          </h3>
          <button onClick={onClose} aria-label="Close">
            <X size={18} className="text-slate-400 hover:text-slate-700 transition-colors" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalFooter({ onClose, onConfirm, loading, confirmLabel }: {
  onClose: () => void; onConfirm: () => void; loading: boolean; confirmLabel: string;
}) {
  return (
    <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-slate-100">
      <button onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
        Cancel
      </button>
      <button onClick={onConfirm} disabled={loading}
        className="px-5 py-2 text-sm font-bold text-white rounded-lg transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        style={{ background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)" }}>
        {loading && <Loader2 size={13} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  );
}

// ─── Role Table ───────────────────────────────────────────────────────────────

function RoleTable({
  templates, loading, error, onEdit, onRemove, onRefresh,
}: {
  templates: RoleTemplate[];
  loading: boolean;
  error: string | null;
  onEdit: (r: RoleTemplate) => void;
  onRemove: (r: RoleTemplate) => void;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "system" | "custom">("all");

  const filtered = templates.filter(t =>
    filter === "all" ? true : filter === "system" ? t.is_system : !t.is_system
  );

  return (
    <div className="bg-white rounded-xl overflow-hidden"
      style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.06)" }}>
      <div className="px-8 py-5 flex flex-wrap justify-between items-center gap-3 bg-slate-50/60 border-b border-slate-100">
        <h3 className="font-extrabold text-xl text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
          Role Permissions
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#f2f3ff] rounded-lg p-1 gap-1">
            {(["all", "system", "custom"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-3 py-1 text-[11px] font-bold rounded-md transition-all capitalize",
                  filter === f ? "bg-white text-[#003527] shadow-sm" : "text-slate-400 hover:text-slate-600")}>
                {f}
              </button>
            ))}
          </div>
          <span className="px-3 py-1 bg-[#b0f0d6] text-[#002117] text-[10px] font-bold uppercase tracking-wider rounded-full">
            {templates.length} Roles
          </span>
          <button onClick={onRefresh} className="text-slate-400 hover:text-[#003527] transition-colors" aria-label="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && templates.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
          <p className="text-sm">Loading roles…</p>
        </div>
      ) : error ? (
        <div className="py-16 flex flex-col items-center gap-3 text-red-500">
          <AlertCircle size={24} />
          <p className="text-sm">{error}</p>
          <button onClick={onRefresh} className="text-xs underline">Try again</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Role permissions table">
            <thead>
              <tr className="bg-[#f2f3ff]">
                {["Role Name", "Type", "Members", "Access Scopes", "Actions"].map((h, i) => (
                  <th key={h} className={cn(
                    "px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider",
                    i === 4 && "text-right"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((role, i) => (
                  <motion.tr key={role.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                    className="border-t border-slate-50 hover:bg-[#f2f3ff]/60 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", roleColor(role.name))} />
                        <div>
                          <p className="font-semibold text-[#003527] text-sm">{role.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 max-w-[180px] truncate">{role.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        role.is_system ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700")}>
                        {role.is_system ? "System" : "Custom"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                      {role.member_count}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-[#e2e7ff] rounded text-[10px] font-mono text-[#064e3b]">{s}</span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-400">
                            +{role.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onEdit(role)}
                          className="px-4 py-1.5 rounded-lg border border-slate-200 text-[#003527] font-medium text-sm hover:bg-[#003527] hover:text-white hover:border-[#003527] transition-all duration-200">
                          {role.is_system ? "View / Override" : "Edit"}
                        </button>
                        {!role.is_system && (
                          <button
                            onClick={() => onRemove(role)}
                            aria-label={`Remove ${role.name}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Election Banner ──────────────────────────────────────────────────────────

function ElectionBanner({ onPromote }: { onPromote: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.45 }}
      className="bg-white rounded-xl p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-l-4 border-[#003527]"
      style={{ boxShadow: "0px 20px 40px -10px rgba(15,23,42,0.06)" }}
    >
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-[#b0f0d6] flex items-center justify-center shrink-0">
          <CheckCircle2 size={28} className="text-[#003527]" />
        </div>
        <div>
          <h3 className="font-extrabold text-2xl text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
            Active Election
          </h3>
          <p className="text-slate-500 text-sm mt-0.5">Shura Council 2024 · Phase: Final Count</p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex -space-x-3" aria-label="Candidates">
          {[
            { init: "JK", bg: "#064e3b", color: "white" },
            { init: "FA", bg: "#515f74", color: "white" },
            { init: "+12", bg: "#e2e7ff", color: "#515f74" },
          ].map(({ init, bg, color }, i) => (
            <div key={init}
              className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold"
              style={{ background: bg, color, zIndex: 3 - i }}>
              {init}
            </div>
          ))}
        </div>
        <div className="w-px h-10 bg-slate-200" />
        <div className="text-right">
          <p className="text-xs font-bold text-emerald-950">Leader: Omar Kassir</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-[#b0f0d6]/60 text-[#003527] text-[10px] font-semibold rounded-full">
            92% Consensus
          </span>
        </div>
        <button onClick={onPromote}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:-translate-y-0.5 active:scale-95 group"
          style={{
            background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)",
            boxShadow: "0 6px 20px -6px rgba(0,53,39,0.4)",
          }}>
          Promote to Role
          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

function AuditTrail({
  entries = [], loading, error, onRefresh,
}: {
  entries?: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.45 }}
      className="bg-[#f2f3ff] rounded-xl p-7 flex flex-col h-full"
      aria-labelledby="audit-heading"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 id="audit-heading"
          className="font-extrabold text-lg text-[#003527] flex items-center gap-2"
          style={{ fontFamily: "Manrope, sans-serif" }}>
          <History size={18} className="text-slate-500" />
          Audit Trail
        </h3>
        <button onClick={onRefresh} className="text-xs font-semibold text-[#003527] hover:underline flex items-center gap-1">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: "520px" }}>
        {loading && entries.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
            <Loader2 size={13} className="animate-spin" /> Loading audit log…
          </div>
        ) : error ? (
          <div className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />{error}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No audit entries yet.</p>
        ) : (
          <div className="space-y-5">
            {entries.map(({ id, action, actor, target_user, scope, reason, timestamp }, i) => {
              const meta = ACTION_META[action] ?? { label: action, dot: "bg-slate-400" };
              return (
                <motion.div key={id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.07 * i }}
                  className="relative pl-6 border-l-2 border-[#003527]/20 pb-4 last:pb-0">
                  <div className={cn("absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full", meta.dot)} />
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                      action === "role_assigned" ? "bg-emerald-100 text-emerald-700"
                      : action === "scope_granted" ? "bg-sky-100 text-sky-700"
                      : "bg-red-100 text-red-600")}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#131b2e]">
                    {actor?.name || actor?.email || "System"} → {target_user.name || target_user.email}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono leading-relaxed">{scope}</p>
                  {reason && <p className="text-[10px] text-slate-400 mt-0.5 italic">&ldquo;{reason}&rdquo;</p>}
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">{relativeTime(timestamp)}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-slate-200">
        <div className="p-4 bg-[#064e3b] text-white rounded-xl flex items-center gap-3">
          <ShieldCheck size={20} className="text-[#95d3ba] shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Encryption Active</p>
            <p className="opacity-70 mt-0.5">Logs are tamper-proof and immutable.</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ToastState = { message: string; sub?: string; type?: "success" | "error" } | null;
type ModalState = "create" | "edit" | "promote" | null;

export default function RolesPage() {
  const { activeMosque } = useMosque();
  const apiBase = activeMosque?.id
    ? `/api/masjids/${activeMosque.id}/permissions`
    : null;

  const { removeStaff, loading: removeLoading } = useStaff();

  const [templates, setTemplates]   = useState<RoleTemplate[]>([]);
  const [auditLog, setAuditLog]     = useState<AuditLogEntry[]>([]);
  const [rolesLoading, setRolesLoading]   = useState(true);
  const [auditLoading, setAuditLoading]   = useState(true);
  const [rolesError, setRolesError]       = useState<string | null>(null);
  const [auditError, setAuditError]       = useState<string | null>(null);

  const [modal, setModal]               = useState<ModalState>(null);
  const [editingRole, setEditingRole]   = useState<RoleTemplate | null>(null);
  const [removingRole, setRemovingRole] = useState<RoleTemplate | null>(null);
  const [toast, setToast]               = useState<ToastState>(null);

  const fetchTemplates = useCallback(async () => {
    if (!apiBase) return;
    setRolesLoading(true);
    setRolesError(null);
    try {
      const res = await fetch(`${apiBase}/role-templates`);
      const json: GetRoleTemplatesResponse = await res.json();
      if (!json.success) throw new Error(json.message);
      setTemplates(json.data);
    } catch (e) {
      setRolesError(e instanceof Error ? e.message : "Failed to load roles.");
    } finally {
      setRolesLoading(false);
    }
  }, [apiBase]);

  const fetchAudit = useCallback(async () => {
    if (!apiBase) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch(`${apiBase}/audit-log`);
      const json: GetAuditLogResponse = await res.json();
      if (!json.success) throw new Error(json.message);
      setAuditLog(json.data ?? []);
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : "Failed to load audit log.");
    } finally {
      setAuditLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { fetchTemplates(); fetchAudit(); }, [fetchTemplates, fetchAudit]);

  useEffect(() => {
    const id = setInterval(fetchAudit, 30_000);
    return () => clearInterval(id);
  }, [fetchAudit]);

  function showToast(message: string, sub?: string, type?: "success" | "error") {
    setToast({ message, sub, type });
  }

  function handleCreated(t: RoleTemplate) {
    setTemplates(prev => [t, ...prev]);
    showToast("Role Created", t.name);
    fetchAudit();
  }

  function handleSaved(t: RoleTemplate) {
    setTemplates(prev => prev.map(r => r.id === t.id ? t : r));
    fetchAudit();
  }

  function handlePromoted(data: AssignRoleTemplateResponse["data"]) {
    showToast("Role Assigned", data.role_name);
    fetchAudit();
  }

  function openEdit(role: RoleTemplate) {
    setEditingRole(role);
    setModal("edit");
  }

  function openRemove(role: RoleTemplate) {
    setRemovingRole(role);
  }

  async function handleRemove() {
    if (!removingRole || !activeMosque?.id) return;
    const result = await removeStaff(activeMosque.id, removingRole.id);
    if (result) {
      setTemplates(prev => prev.filter(r => r.id !== removingRole.id));
      showToast("Member Removed", removingRole.name, "success");
      fetchAudit();
    } else {
      showToast("Failed to remove member.", undefined, "error");
    }
    setRemovingRole(null);
  }

  function closeModal() {
    setModal(null);
    setEditingRole(null);
  }

  if (!activeMosque) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading mosque…</span>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 mb-8"
      >
        <div>
          <h2 className="text-4xl font-extrabold text-[#003527] tracking-tighter"
            style={{ fontFamily: "Manrope, sans-serif" }}>
            Access Control
          </h2>
          <p className="text-slate-500 mt-2 max-w-md text-sm leading-relaxed">
            Manage organizational governance and granular permissions for community leaders and volunteers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModal("create")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-95"
            style={{ background: "#064e3b", boxShadow: "0 4px 14px -4px rgba(6,78,59,0.4)" }}>
            <Plus size={15} />
            Create Role
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 lg:col-span-8 space-y-6">
          <RoleTable
            templates={templates}
            loading={rolesLoading}
            error={rolesError}
            onEdit={openEdit}
            onRemove={openRemove}
            onRefresh={fetchTemplates}
          />
          <ElectionBanner onPromote={() => setModal("promote")} />
        </section>
        <div className="col-span-12 lg:col-span-4">
          <AuditTrail
            entries={auditLog}
            loading={auditLoading}
            error={auditError}
            onRefresh={fetchAudit}
          />
        </div>
      </div>

      <AnimatePresence>
        {modal === "create" && apiBase && (
          <CreateRoleModal apiBase={apiBase} onClose={closeModal} onCreated={handleCreated} />
        )}
        {modal === "edit" && editingRole && apiBase && (
          <EditRoleModal
            role={editingRole}
            apiBase={apiBase}
            masjidId={activeMosque.id}
            onClose={closeModal}
            onSaved={handleSaved}
            onToast={showToast}
          />
        )}
        {modal === "promote" && apiBase && (
          <PromoteModal
            templates={templates}
            apiBase={apiBase}
            masjidId={activeMosque.id}
            onClose={closeModal}
            onPromoted={handlePromoted}
          />
        )}
        {removingRole && (
          <RemoveStaffModal
            memberName={displayName(removingRole)}
            onClose={() => setRemovingRole(null)}
            onConfirm={handleRemove}
            loading={removeLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            sub={toast.sub}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}