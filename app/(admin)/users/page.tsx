"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Search,
  Filter,
  UserPlus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shield,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  ChevronDown,
  AlertCircle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaff } from "@/hooks/staff/useStaff";
import { useMosque } from "@/context/MosqueContext";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import type { StaffMember, InvitationData, GetInvitationsQuery } from "@/types/api";

// ─── Constants ─────────────────────────────────────────────────────────────────

type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

const ROLE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Admin:                     { bg: "bg-emerald-50",  text: "text-emerald-800", border: "border-emerald-200" },
  Treasurer:                 { bg: "bg-blue-50",     text: "text-blue-800",    border: "border-blue-200"    },
  Moderator:                 { bg: "bg-amber-50",    text: "text-amber-800",   border: "border-amber-200"   },
  Webmaster:                 { bg: "bg-purple-50",   text: "text-purple-800",  border: "border-purple-200"  },
  "Community Outreach Lead": { bg: "bg-slate-100",   text: "text-slate-700",   border: "border-slate-200"   },
};

const DEFAULT_ROLE_STYLE = { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };

const STATUS_COLORS: Record<InvitationStatus, { dot: string; text: string; pulse: boolean }> = {
  pending:  { dot: "bg-amber-400",   text: "text-amber-700",   pulse: false },
  accepted: { dot: "bg-emerald-500", text: "text-emerald-700", pulse: true  },
  expired:  { dot: "bg-slate-400",   text: "text-slate-500",   pulse: false },
  revoked:  { dot: "bg-red-400",     text: "text-red-600",     pulse: false },
};

const PAGE_SIZE = 6;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(userId: string): string {
  const colors = ["#064e3b", "#1e40af", "#92400e", "#3730a3", "#065f46"];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Remove Staff Confirm Modal ────────────────────────────────────────────────

function RemoveStaffModal({
  member,
  onClose,
  onConfirm,
  loading,
}: {
  member: StaffMember;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      data-testid="remove-staff-modal"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3
            className="font-extrabold text-lg text-[#131b2e]"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Remove Staff Member
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Member preview */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
          <div
            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: getAvatarColor(member.user_id) }}
          >
            {getInitials(member.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[#131b2e] truncate">{member.name}</p>
            <p className="text-xs text-slate-400 truncate">{member.email}</p>
          </div>
          <span className={cn(
            "ml-auto shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border",
            (ROLE_STYLES[member.role_name] ?? DEFAULT_ROLE_STYLE).bg,
            (ROLE_STYLES[member.role_name] ?? DEFAULT_ROLE_STYLE).text,
            (ROLE_STYLES[member.role_name] ?? DEFAULT_ROLE_STYLE).border,
          )}>
            {member.role_name}
          </span>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl mb-6">
          <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 leading-relaxed">
            This will immediately revoke their access. They'll need to be re-invited to regain entry.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            data-testid="remove-staff-cancel-btn"
            className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            data-testid="remove-staff-confirm-btn"
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {loading ? "Removing…" : "Remove"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-[#131b2e] leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
          {value}
        </p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

function MemberAvatar({ member }: { member: StaffMember }) {
  const bg = getAvatarColor(member.user_id);
  const initials = getInitials(member.name);
  return (
    <div
      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
      style={{ backgroundColor: bg }}
      title={member.name}
    >
      {initials}
    </div>
  );
}

function StaffActionMenu({
  open,
  onClose,
  member,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  member: StaffMember;
  onRemove: (member: StaffMember) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-10 z-20 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 w-44"
          >
            {/* <button
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#064e3b] transition-colors"
              onClick={() => { onClose(); }}
            >
              <Mail size={14} />
              Send Email
            </button> */}
            <button
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              onClick={() => { onClose(); onRemove(member); }}
              data-testid={`staff-remove-action-${member.user_id}`}
            >
              <Trash2 size={14} />
              Remove Staff
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StaffTableRow({
  member,
  index,
  onRemove,
}: {
  member: StaffMember;
  index: number;
  onRemove: (member: StaffMember) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const roleStyle = ROLE_STYLES[member.role_name] ?? DEFAULT_ROLE_STYLE;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group hover:bg-[#f8fffe] transition-colors border-b border-slate-50 last:border-0"
      data-testid={`staff-row-${member.user_id}`}
    >
      {/* Member */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3.5">
          <MemberAvatar member={member} />
          <div className="min-w-0">
            <p className="font-semibold text-[#131b2e] text-sm truncate">{member.name}</p>
            <p className="text-xs text-slate-400 truncate">{member.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-6 py-4">
        <span className={cn(
          "inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-md border tracking-wide",
          roleStyle.bg, roleStyle.text, roleStyle.border
        )}>
          {member.role_name}
        </span>
      </td>

      {/* Scopes */}
      <td className="px-6 py-4">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
          <Shield size={11} className="text-slate-400" />
          {member.effective_scope_count} scopes
        </span>
      </td>

      {/* Joined */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span className="text-sm text-slate-400">
          {new Date(member.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <div className="relative inline-flex items-center gap-2">
          <button
            aria-label={`Actions for ${member.name}`}
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            data-testid={`staff-menu-trigger-${member.user_id}`}
          >
            <MoreVertical size={16} />
          </button>
          <StaffActionMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            member={member}
            onRemove={onRemove}
          />
        </div>
      </td>
    </motion.tr>
  );
}

function InvitationRow({
  inv,
  index,
  onRevoke,
}: {
  inv: InvitationData;
  index: number;
  onRevoke: (inviteId: string) => void;
}) {
  const statusStyle = STATUS_COLORS[inv.status] ?? STATUS_COLORS.pending;
  const isPending = inv.status === "pending";

  return (
    <motion.tr
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group hover:bg-[#f8fffe] transition-colors border-b border-slate-50 last:border-0"
      data-testid={`invitation-row-${inv.invite_id}`}
    >
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <Mail size={13} className="text-slate-400" />
          </div>
          <span className="text-sm text-[#131b2e] font-medium truncate">{inv.email}</span>
        </div>
      </td>
      <td className="px-6 py-3.5 hidden sm:table-cell">
        <span className="text-xs text-slate-500">{inv.role_name}</span>
      </td>
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "w-2 h-2 rounded-full shrink-0",
            statusStyle.dot,
            statusStyle.pulse && "animate-pulse"
          )} />
          <span className={cn("text-xs font-medium capitalize", statusStyle.text)}>{inv.status}</span>
        </div>
      </td>
      <td className="px-6 py-3.5 hidden md:table-cell">
        <span className="text-xs text-slate-400">
          Expires {new Date(inv.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </td>
      <td className="px-6 py-3.5 text-right">
        {isPending && (
          <button
            onClick={() => onRevoke(inv.invite_id)}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50"
            data-testid={`revoke-invitation-btn-${inv.invite_id}`}
          >
            Revoke
          </button>
        )}
      </td>
    </motion.tr>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700"
      data-testid="staff-error-banner"
    >
      <AlertCircle size={15} className="shrink-0 text-red-400" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
        <XCircle size={15} />
      </button>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function UserDirectoryPage() {
  // ── Mosque ID from context ──────────────────────────────────────────────────
  const { activeMosque, isHydrating } = useMosque();
  const masjidId = activeMosque?.id ?? "";

  // ── Role templates via usePermissions ──────────────────────────────────────
  const {
    roleTemplates: roleTemplatesResponse,
    loading: rolesLoading,
    getRoleTemplates,
  } = usePermissions(masjidId);

  const ROLE_TEMPLATE_MAP: Record<string, string> = Object.fromEntries(
    (roleTemplatesResponse?.data ?? []).map((t) => [t.name, t.id])
  );
  const ROLE_NAMES: string[] = (roleTemplatesResponse?.data ?? []).map((t) => t.name);

  // ── Staff & invitations ────────────────────────────────────────────────────
  const {
    staff,
    invitations,
    pendingInvitationCount,
    loading,
    error,
    getStaff,
    getInvitations,
    inviteStaff,
    revokeInvitation,
    removeStaff,
    clearError,
  } = useStaff();

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"staff" | "invitations">("staff");

  // Remove staff modal
  const [removingMember, setRemovingMember] = useState<StaffMember | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Invitation status filter
  const [invStatusFilter, setInvStatusFilter] = useState<GetInvitationsQuery["status"] | "ALL">("ALL");

  // ── Default invite role once templates are loaded ───────────────────────────
  useEffect(() => {
    if (ROLE_NAMES.length > 0 && !inviteRole) {
      setInviteRole(ROLE_NAMES[0]);
    }
  }, [ROLE_NAMES.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!masjidId) return;
    getStaff(masjidId);
    getInvitations(masjidId);
    getRoleTemplates();
  }, [masjidId, getRoleTemplates]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch staff on search / role filter change ───────────────────────────
  useEffect(() => {
    if (!masjidId) return;
    const t = setTimeout(() => {
      getStaff(masjidId, {
        search: search || undefined,
        role_template_id: roleFilter !== "ALL" ? ROLE_TEMPLATE_MAP[roleFilter] : undefined,
        page: 1,
        limit: PAGE_SIZE,
      });
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search, roleFilter, masjidId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch invitations on status filter change ────────────────────────────
  useEffect(() => {
    if (!masjidId) return;
    getInvitations(masjidId, {
      status: invStatusFilter !== "ALL" ? invStatusFilter : undefined,
    });
  }, [invStatusFilter, masjidId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ────────────────────────────────────────────────────────────
  const staffList    = staff?.data ?? [];
  const totalStaff   = staff?.metadata.total_data ?? 0;
  const totalPages   = staff?.metadata.total_page ?? 1;
  const invList      = invitations?.data ?? [];
  const pendingCount = pendingInvitationCount;
  const adminCount   = staffList.filter((m) => m.role_name === "Admin").length;

  const availableRoles = ["ALL", ...ROLE_NAMES];
  const invStatusOptions: Array<GetInvitationsQuery["status"] | "ALL"> = [
    "ALL", "pending", "accepted", "expired", "revoked",
  ];

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      getStaff(masjidId, {
        search: search || undefined,
        role_template_id: roleFilter !== "ALL" ? ROLE_TEMPLATE_MAP[roleFilter] : undefined,
        page: newPage,
        limit: PAGE_SIZE,
      });
    },
    [search, roleFilter, masjidId, getStaff] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Opens the confirm modal — no window.confirm()
  const handleRemoveClick = useCallback((member: StaffMember) => {
    setRemovingMember(member);
  }, []);

  // Called when user confirms inside the modal
  const handleRemoveConfirm = useCallback(async () => {
    if (!removingMember) return;
    setRemoveLoading(true);
    await removeStaff(masjidId, removingMember.user_id);
    setRemoveLoading(false);
    setRemovingMember(null);
  }, [removingMember, masjidId, removeStaff]);

  const handleRevokeInvitation = useCallback(
    async (inviteId: string) => {
      await revokeInvitation(masjidId, inviteId);
    },
    [masjidId, revokeInvitation]
  );

  const handleRevokeAll = useCallback(async () => {
    const pending = invList.filter((i) => i.status === "pending");
    for (const inv of pending) {
      await revokeInvitation(masjidId, inv.invite_id);
    }
  }, [invList, masjidId, revokeInvitation]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError(null);

    const result = await inviteStaff(masjidId, {
      email: inviteEmail.trim(),
      role_name: inviteRole,
      role_template_id: ROLE_TEMPLATE_MAP[inviteRole] ?? "",
      message: inviteMessage.trim() || undefined,
    });

    setInviteLoading(false);

    if (result) {
      setInviteSent(true);
      setTimeout(() => {
        setInviteOpen(false);
        setInviteSent(false);
        setInviteEmail("");
        setInviteMessage("");
      }, 1800);
    } else {
      setInviteError("Failed to send invitation. Please try again.");
    }
  }, [inviteEmail, inviteRole, inviteMessage, masjidId, inviteStaff]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCloseInviteModal = () => {
    setInviteOpen(false);
    setInviteError(null);
    setInviteEmail("");
    setInviteMessage("");
    setInviteSent(false);
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (isHydrating) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!activeMosque) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-400 text-sm">
        No mosque selected.
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-7" data-testid="staff-management-page">

      {/* Error banner */}
      <AnimatePresence>
        {error && <ErrorBanner message={error} onDismiss={clearError} />}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1
            className="text-3xl font-extrabold text-[#131b2e] tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Staff Management
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">
            Manage your mosque's staff and active invitations from one place.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#064e3b] text-white text-sm font-semibold rounded-xl shadow-md hover:bg-[#053d2f] transition-colors shrink-0"
          data-testid="invite-staff-btn"
        >
          <UserPlus size={15} />
          Invite Staff
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Staff"  value={loading && !staff ? "…" : totalStaff}  color="bg-[#064e3b]"  delay={0}    />
        <StatCard icon={Shield}       label="Admins"       value={loading && !staff ? "…" : adminCount}  color="bg-slate-600"  delay={0.06} sub="Full access roles"    />
        <StatCard icon={Clock}        label="Pending"      value={loading && !invitations ? "…" : pendingCount} color="bg-amber-400" delay={0.12} sub="Awaiting acceptance" />
        <StatCard icon={CheckCircle2} label="Invitations"  value={loading && !invitations ? "…" : (invitations?.metadata.total_data ?? 0)} color="bg-emerald-500" delay={0.18} sub="All time" />
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      >
        {/* Tab bar */}
        <div className="px-6 pt-4 pb-0 border-b border-slate-100 flex items-center gap-6">
          {(["staff", "invitations"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm font-semibold capitalize border-b-2 transition-colors",
                activeTab === tab
                  ? "border-[#064e3b] text-[#064e3b]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
              data-testid={`tab-${tab}`}
            >
              {tab === "staff" ? "Staff Members" : "Invitations"}
              {tab === "invitations" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-amber-400 text-white rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
          {loading && (
            <Loader2 size={14} className="ml-auto mb-3 text-slate-300 animate-spin" />
          )}
        </div>

        {/* ── Staff tab ── */}
        {activeTab === "staff" && (
          <>
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-slate-50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div className="relative group flex-1 max-w-xs">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#064e3b] transition-colors" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-[#f2f3ff] rounded-xl border-none focus:ring-2 focus:ring-[#064e3b]/20 focus:outline-none placeholder:text-slate-400 transition-all"
                  aria-label="Search staff"
                  data-testid="staff-search-input"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white transition-colors"
                    data-testid="role-filter-btn"
                  >
                    <Filter size={13} />
                    {roleFilter === "ALL" ? "All Roles" : roleFilter}
                    <ChevronDown size={13} />
                  </button>
                  <AnimatePresence>
                    {filterOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-10 z-20 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 w-48"
                          data-testid="role-filter-dropdown"
                        >
                          {availableRoles.map((r) => (
                            <button
                              key={r}
                              onClick={() => { setRoleFilter(r); setFilterOpen(false); }}
                              className={cn(
                                "flex w-full items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                                roleFilter === r
                                  ? "text-[#064e3b] bg-emerald-50"
                                  : "text-slate-600 hover:bg-slate-50"
                              )}
                              data-testid={`role-filter-option-${r}`}
                            >
                              {roleFilter === r && <CheckCircle2 size={12} className="text-[#064e3b]" />}
                              {r === "ALL" ? "All Roles" : r}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => { setSearch(""); setRoleFilter("ALL"); }}
                  aria-label="Reset filters"
                  className="p-2 text-slate-400 hover:text-[#064e3b] hover:bg-slate-50 rounded-xl transition-colors"
                  data-testid="reset-filters-btn"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left" role="table" data-testid="staff-table">
                <thead>
                  <tr className="bg-slate-50/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-3.5" scope="col">Member</th>
                    <th className="px-6 py-3.5" scope="col">Role</th>
                    <th className="px-6 py-3.5" scope="col">Permissions</th>
                    <th className="px-6 py-3.5 hidden md:table-cell" scope="col">Joined</th>
                    <th className="px-6 py-3.5 text-right" scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="wait">
                    {staffList.length > 0 ? (
                      staffList.map((member, i) => (
                        <StaffTableRow
                          key={member.user_id}
                          member={member}
                          index={i}
                          onRemove={handleRemoveClick}
                        />
                      ))
                    ) : !loading ? (
                      <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm" data-testid="staff-empty-state">
                          No staff members found.
                        </td>
                      </motion.tr>
                    ) : (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="border-b border-slate-50 animate-pulse">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-full bg-slate-100" />
                              <div className="space-y-1.5">
                                <div className="w-28 h-3 bg-slate-100 rounded" />
                                <div className="w-36 h-2.5 bg-slate-50 rounded" />
                              </div>
                            </div>
                          </td>
                          {[1, 2, 3, 4].map((c) => (
                            <td key={c} className="px-6 py-4">
                              <div className="w-16 h-3 bg-slate-100 rounded" />
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between gap-4" data-testid="pagination">
                <p className="text-xs text-slate-400">
                  Page <span className="font-semibold text-slate-600">{page}</span> of{" "}
                  <span className="font-semibold text-slate-600">{totalPages}</span>
                  {" "}·{" "}
                  <span className="font-semibold text-slate-600">{totalStaff}</span> members
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                    data-testid="pagination-prev-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => handlePageChange(n)}
                      className={cn(
                        "w-7 h-7 text-xs font-semibold rounded-lg transition-all",
                        n === page
                          ? "bg-[#064e3b] text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100"
                      )}
                      data-testid={`page-btn-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                    data-testid="pagination-next-btn"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Invitations tab ── */}
        {activeTab === "invitations" && (
          <>
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {invStatusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInvStatusFilter(s)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                      invStatusFilter === s
                        ? "bg-[#064e3b] text-white"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    )}
                    data-testid={`inv-status-filter-${s}`}
                  >
                    {s === "ALL" ? "All" : s}
                  </button>
                ))}
              </div>

              {pendingCount > 0 && (
                <button
                  onClick={handleRevokeAll}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                  data-testid="revoke-all-btn"
                >
                  <XCircle size={13} />
                  Revoke All Pending
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left" role="table" data-testid="invitations-table">
                <thead>
                  <tr className="bg-slate-50/60 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-3.5" scope="col">Email</th>
                    <th className="px-6 py-3.5 hidden sm:table-cell" scope="col">Role</th>
                    <th className="px-6 py-3.5" scope="col">Status</th>
                    <th className="px-6 py-3.5 hidden md:table-cell" scope="col">Expiry</th>
                    <th className="px-6 py-3.5 text-right" scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="wait">
                    {invList.length > 0 ? (
                      invList.map((inv, i) => (
                        <InvitationRow
                          key={inv.invite_id}
                          inv={inv}
                          index={i}
                          onRevoke={handleRevokeInvitation}
                        />
                      ))
                    ) : !loading ? (
                      <motion.tr key="empty-inv" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm" data-testid="invitations-empty-state">
                          No invitations found.
                        </td>
                      </motion.tr>
                    ) : (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={`inv-skeleton-${i}`} className="border-b border-slate-50 animate-pulse">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100" />
                              <div className="w-40 h-3 bg-slate-100 rounded" />
                            </div>
                          </td>
                          {[1, 2, 3, 4].map((c) => (
                            <td key={c} className="px-6 py-3.5">
                              <div className="w-16 h-3 bg-slate-100 rounded" />
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

      {/* Insight bento */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-[#064e3b] p-8 flex flex-col justify-between min-h-[160px]">
          <div className="relative z-10">
            <h3
              className="text-xl font-extrabold text-white mb-1"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Staff Overview
            </h3>
            <p className="text-emerald-200/80 text-sm max-w-sm">
              Real-time staff data from your masjid management API.
            </p>
            <div className="flex gap-10 mt-5">
              {[
                { v: totalStaff,   l: "Total Staff"     },
                { v: adminCount,   l: "Admin Roles"     },
                { v: pendingCount, l: "Pending Invites" },
              ].map(({ v, l }) => (
                <div key={l}>
                  <p className="text-3xl font-extrabold text-white" style={{ fontFamily: "Manrope, sans-serif" }}>
                    {loading && !staff ? "…" : v}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-300/70 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-56 h-56 rounded-full bg-emerald-800/50 blur-3xl pointer-events-none" />
          <div className="absolute right-10 top-6 w-24 h-24 rounded-full bg-emerald-700/30 blur-xl pointer-events-none" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center mb-4">
              <Clock size={18} className="text-amber-500" />
            </div>
            <h3 className="font-bold text-[#131b2e] text-base" style={{ fontFamily: "Manrope, sans-serif" }}>
              Pending Invitations
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {pendingCount} staff member{pendingCount !== 1 ? "s" : ""} haven't accepted yet.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRevokeAll}
            disabled={pendingCount === 0 || loading}
            className="mt-6 w-full py-2 text-sm font-semibold text-[#064e3b] border border-[#064e3b]/20 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="revoke-all-btn-secondary"
          >
            Revoke All Pending
          </motion.button>
        </div>
      </motion.div>

      {/* ── Remove Staff Modal ── */}
      <AnimatePresence>
        {removingMember && (
          <RemoveStaffModal
            member={removingMember}
            onClose={() => setRemovingMember(null)}
            onConfirm={handleRemoveConfirm}
            loading={removeLoading}
          />
        )}
      </AnimatePresence>

      {/* ── Invite Modal ── */}
      <AnimatePresence>
        {inviteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={handleCloseInviteModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Invite staff member"
              data-testid="invite-modal"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
                onClick={(e) => e.stopPropagation()}
              >
                {inviteSent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-4 text-center"
                    data-testid="invite-success-state"
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                      Invitation Sent!
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{inviteEmail}</p>
                    <p className="text-xs text-slate-300 mt-0.5">They have 72 hours to accept.</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-extrabold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>
                        Invite Staff Member
                      </h2>
                      <button
                        onClick={handleCloseInviteModal}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                        aria-label="Close"
                        data-testid="invite-modal-close-btn"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {inviteError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600"
                          data-testid="invite-error-banner"
                        >
                          <AlertCircle size={13} className="shrink-0" />
                          {inviteError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="invite-email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input
                            id="invite-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                            placeholder="staff@example.com"
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#f2f3ff] rounded-xl border-none focus:ring-2 focus:ring-[#064e3b]/20 focus:outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="invite-role" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Assign Role
                        </label>
                        <select
                          id="invite-role"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          disabled={rolesLoading}
                          className="w-full px-4 py-2.5 text-sm bg-[#f2f3ff] rounded-xl border-none focus:ring-2 focus:ring-[#064e3b]/20 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {rolesLoading ? (
                            <option value="">Loading roles…</option>
                          ) : ROLE_NAMES.length > 0 ? (
                            ROLE_NAMES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))
                          ) : (
                            <option value="">No roles available</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="invite-message" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Personal Message{" "}
                          <span className="normal-case font-normal text-slate-400">(optional)</span>
                        </label>
                        <textarea
                          id="invite-message"
                          value={inviteMessage}
                          onChange={(e) => setInviteMessage(e.target.value)}
                          maxLength={500}
                          rows={3}
                          placeholder="Add a personal note to the invitation email…"
                          className="w-full px-4 py-2.5 text-sm bg-[#f2f3ff] rounded-xl border-none focus:ring-2 focus:ring-[#064e3b]/20 focus:outline-none placeholder:text-slate-400 resize-none"
                        />
                        <p className="text-[10px] text-slate-300 text-right mt-0.5">{inviteMessage.length}/500</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleCloseInviteModal}
                        className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                        data-testid="invite-cancel-btn"
                      >
                        Cancel
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleInvite}
                        disabled={!inviteEmail.trim() || inviteLoading || !inviteRole}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#064e3b] rounded-xl shadow-md hover:bg-[#053d2f] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        data-testid="send-invite-btn"
                      >
                        {inviteLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Mail size={14} />
                        )}
                        {inviteLoading ? "Sending…" : "Send Invite"}
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}