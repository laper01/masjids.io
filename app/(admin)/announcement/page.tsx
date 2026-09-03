"use client";

import { useState, useEffect, useCallback } from "react";
import { useAnnouncements } from "@/hooks/announcements/useAnnouncements";
import { useMosque } from "@/context/MosqueContext";
import type { CreateAnnouncementRequest, UpdateAnnouncementRequest } from "@/types/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "All" | "Event" | "General" | "Urgent" | "Jumuah" | "Fundraising";
type Status = "sent" | "queued" | "failed";

interface Announcement {
  id: string;
  category: Exclude<Category, "All">;
  time: string;
  title: string;
  body: string;
  status: Status;
  statusLabel: string;
  audience: string;
  actionIcon?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS: Category[] = ["All", "Event", "General", "Urgent", "Jumuah", "Fundraising"];
const CATEGORIES: Exclude<Category, "All">[] = ["General", "Event", "Urgent", "Jumuah", "Fundraising"];

const CATEGORY_STYLES: Record<string, string> = {
  Urgent:      "bg-red-100 text-red-800",
  Jumuah:      "bg-[#064e3b] text-emerald-100",
  Fundraising: "bg-amber-100 text-amber-900",
  Event:       "bg-blue-100 text-blue-900",
  General:     "bg-emerald-100 text-emerald-900",
};

const STATUS_STYLES: Record<Status, string> = {
  sent:   "text-emerald-700",
  queued: "text-amber-700",
  failed: "text-red-600",
};

const STATUS_ICONS: Record<Status, string> = {
  sent:   "check_circle",
  queued: "pending",
  failed: "error",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

import type { AnnouncementCategory } from "@/types/api";

function mapCategoryToApi(cat: Exclude<Category, "All">): AnnouncementCategory {
  const map: Record<Exclude<Category, "All">, AnnouncementCategory> = {
    Event:       "event",
    General:     "general",
    Urgent:      "urgent",
    Jumuah:      "jumuah",
    Fundraising: "fundraising",
  };
  return map[cat];
}

function mapApiCategory(cat: AnnouncementCategory): Exclude<Category, "All"> {
  const map: Record<AnnouncementCategory, Exclude<Category, "All">> = {
    event:       "Event",
    general:     "General",
    urgent:      "Urgent",
    jumuah:      "Jumuah",
    fundraising: "Fundraising",
  };
  return map[cat] ?? "General";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiToAnnouncement(item: any): Announcement {
  return {
    id: item.id,
    category: mapApiCategory(item.category),
    time: item.published_at
      ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
          Math.round(
            (new Date(item.published_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
          "day"
        )
      : "Recently",
    title:       item.title ?? "Untitled",
    body:        item.body ?? "",
    status:      "sent",
    statusLabel: "Sent ✓",
    audience:    "Sent to followers",
    actionIcon:  "edit",
  };
}

// ─── Composer Panel (Create) ───────────────────────────────────────────────────

function ComposerPanel({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (payload: CreateAnnouncementRequest) => Promise<void>;
}) {
  const [title,       setTitle]       = useState("");
  const [body,        setBody]        = useState("");
  const [mediaUrl,    setMediaUrl]    = useState("");
  const [selectedCat, setSelectedCat] = useState<Exclude<Category, "All">>("General");
  const [publishing,  setPublishing]  = useState(false);

  const handlePublish = async () => {
    if (!title.trim()) return;
    setPublishing(true);
    try {
      await onPublish({
        title:     title.trim(),
        body:      body.trim(),
        category:  mapCategoryToApi(selectedCat),
        media_url: mediaUrl.trim() || undefined,
      });
      onClose();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div
        data-testid="composer-panel"
        className="fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col border-l border-slate-100 shadow-2xl"
        style={{ background: "rgba(250,248,255,0.92)", backdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div className="h-18 px-8 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="font-bold text-xl text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
              Create Announcement
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Draft Mode</p>
          </div>
          <button
            onClick={onClose}
            data-testid="composer-close-btn"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-8 space-y-7">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label htmlFor="composer-title" className="font-bold text-sm text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>
                Broadcast Title
              </label>
              <span className="text-[10px] font-mono text-slate-400 uppercase">{title.length} / 120 chars</span>
            </div>
            <input
              id="composer-title"
              data-testid="composer-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="e.g., Ramadan 2024 Prayer Schedule"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003527]/20 placeholder:text-slate-300"
            />
            {!title.trim() && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1" data-testid="composer-title-error">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                Title is required for publishing.
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-3">
            <label className="font-bold text-sm text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  data-testid={`composer-category-${cat.toLowerCase()}`}
                  aria-pressed={selectedCat === cat}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedCat === cat
                      ? "bg-[#064e3b] text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <label htmlFor="composer-body" className="font-bold text-sm text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>Message Content</label>
            <textarea
              id="composer-body"
              data-testid="composer-body-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Share the details with your community..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003527]/20 placeholder:text-slate-300 resize-none"
            />
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <label htmlFor="composer-media-url" className="font-bold text-sm text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>
              Attachment URL <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <div className="flex gap-3">
              <input
                id="composer-media-url"
                data-testid="composer-media-url-input"
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://image-url.com/poster.jpg"
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003527]/20 placeholder:text-slate-300"
              />
              <div className="w-14 h-12 bg-slate-100 rounded-xl flex items-center justify-center border border-dashed border-slate-300">
                <span className="material-symbols-outlined text-slate-300">image</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-white/60 border-t border-slate-100">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              data-testid="composer-cancel-btn"
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={!title.trim() || publishing}
              data-testid="composer-publish-btn"
              className="flex-[2] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}
            >
              {publishing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Publishing...
                </>
              ) : (
                <>
                  Publish & Broadcast
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Broadcast will be sent to community members
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Editor Panel (Edit) ──────────────────────────────────────────────────────

function EditorPanel({
  announcement,
  onClose,
  onSave,
}: {
  announcement: Announcement;
  onClose: () => void;
  onSave: (id: string, payload: UpdateAnnouncementRequest) => Promise<void>;
}) {
  const [title,       setTitle]       = useState(announcement.title);
  const [body,        setBody]        = useState(announcement.body);
  const [selectedCat, setSelectedCat] = useState<Exclude<Category, "All">>(announcement.category);
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(announcement.id, {
        title:    title.trim(),
        body:     body.trim(),
        category: mapCategoryToApi(selectedCat),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div
        data-testid="editor-panel"
        className="fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col border-l border-slate-100 shadow-2xl"
        style={{ background: "rgba(250,248,255,0.92)", backdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div className="h-18 px-8 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="font-bold text-xl text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>
              Edit Announcement
            </h2>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Edit Mode</p>
          </div>
          <button
            onClick={onClose}
            data-testid="editor-close-btn"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-8 space-y-7">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label htmlFor="editor-title" className="font-bold text-sm text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>
                Broadcast Title
              </label>
              <span className="text-[10px] font-mono text-slate-400 uppercase">{title.length} / 120 chars</span>
            </div>
            <input
              id="editor-title"
              data-testid="editor-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="e.g., Ramadan 2024 Prayer Schedule"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003527]/20 placeholder:text-slate-300"
            />
            {!title.trim() && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1" data-testid="editor-title-error">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                Title is required.
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-3">
            <label className="font-bold text-sm text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  data-testid={`editor-category-${cat.toLowerCase()}`}
                  aria-pressed={selectedCat === cat}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedCat === cat
                      ? "bg-[#064e3b] text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <label htmlFor="editor-body" className="font-bold text-sm text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>Message Content</label>
            <textarea
              id="editor-body"
              data-testid="editor-body-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Share the details with your community..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003527]/20 placeholder:text-slate-300 resize-none"
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-amber-500 text-base mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              Editing will update this announcement immediately. Community members who have already received it will not be re-notified.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-white/60 border-t border-slate-100">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              data-testid="editor-cancel-btn"
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              data-testid="editor-save-btn"
              className="flex-[2] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  Save Changes
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Changes will be reflected immediately
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = () => {
    setDeleting(true);
    setTimeout(() => { onConfirm(); }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="delete-modal">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-red-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              delete_forever
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
            Delete Announcement?
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-1">
            <span className="font-semibold text-slate-700">"{title}"</span> will be permanently deleted. This action cannot be reversed.
          </p>
          <div className="flex items-center gap-3 mt-7">
            <button
              onClick={onCancel}
              data-testid="delete-modal-cancel-btn"
              className="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              data-testid="delete-modal-confirm-btn"
              className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
            >
              {deleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
        <div className="h-1.5 w-full bg-red-50">
          {deleting && <div className="h-full bg-red-400" style={{ animation: "width 1.4s ease-in-out forwards" }} />}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse" data-testid="skeleton-card">
      <div className="flex gap-5">
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
            <div className="h-5 w-16 bg-slate-100 rounded-full" />
          </div>
          <div className="h-5 w-3/4 bg-slate-100 rounded-lg" />
          <div className="h-4 w-full bg-slate-100 rounded-lg" />
          <div className="h-4 w-2/3 bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({
  item,
  onDelete,
  onEdit,
}: {
  item: Announcement;
  onDelete: (id: string) => void;
  onEdit: (item: Announcement) => void;
}) {
  return (
    <div
      data-testid={`announcement-card-${item.id}`}
      className="bg-white p-6 rounded-2xl flex gap-5 items-start hover:shadow-md transition-all group border border-slate-100"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${CATEGORY_STYLES[item.category] ?? "bg-slate-100 text-slate-600"}`}>
            {item.category}
          </span>
          <span className="text-xs text-slate-400">{item.time}</span>
        </div>
        <h4
          className="font-bold text-slate-800 text-lg leading-snug mb-1 group-hover:text-[#003527] transition-colors"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          {item.title}
        </h4>
        <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">{item.body}</p>

        <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <span
              className={`material-symbols-outlined text-sm ${STATUS_STYLES[item.status]}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {STATUS_ICONS[item.status]}
            </span>
            <span className={`text-xs font-bold ${STATUS_STYLES[item.status]}`}>{item.statusLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="material-symbols-outlined text-sm">group</span>
            <span className="text-xs">{item.audience}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onEdit(item)}
          data-testid={`card-edit-btn-${item.id}`}
          className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
          title="Edit announcement"
        >
          <span className="material-symbols-outlined text-xl">{item.actionIcon ?? "edit"}</span>
        </button>
        <button
          onClick={() => onDelete(item.id)}
          data-testid={`card-delete-btn-${item.id}`}
          className="p-2 rounded-xl hover:bg-red-50 text-red-300 hover:text-red-500 transition-all"
          title="Delete announcement"
        >
          <span className="material-symbols-outlined text-xl">delete</span>
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  // ✅ Mosque context
  const { activeMosque, isHydrating } = useMosque();

  // ✅ Announcements hook — now includes updateAnnouncement
  const {
    announcements,
    loading,
    error,
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    clearError,
  } = useAnnouncements();

  const [activeFilter, setActiveFilter] = useState<Category>("All");
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [editTarget,   setEditTarget]   = useState<Announcement | null>(null); // ✅ NEW
  const [composerOpen, setComposerOpen] = useState(false);
  const [page,         setPage]         = useState(1);

  // ✅ Fetch when masjidId / page changes
  useEffect(() => {
    if (isHydrating || !activeMosque?.id) return;
    getAnnouncements(activeMosque.id, { page, limit: 10 });
  }, [activeMosque?.id, isHydrating, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map API data → local shape ─────────────────────────────────────────────
  const apiItems: Announcement[] =
    announcements?.data && announcements.data.length > 0
      ? announcements.data.map(mapApiToAnnouncement)
      : [];

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered =
    activeFilter === "All"
      ? apiItems
      : apiItems.filter((i) => i.category === activeFilter);

  // ── Pagination meta ────────────────────────────────────────────────────────
  const totalPages   = announcements?.metadata?.total_page ?? 1;
  const totalResults = announcements?.metadata?.total_data ?? filtered.length;

  // ── Create ─────────────────────────────────────────────────────────────────
  const handlePublished = useCallback(async (payload: CreateAnnouncementRequest) => {
    if (!activeMosque?.id) return;
    await createAnnouncement(activeMosque.id, payload);
    getAnnouncements(activeMosque.id, { page: 1, limit: 10 });
    setPage(1);
  }, [activeMosque?.id, createAnnouncement, getAnnouncements]);

  // ── Edit ───────────────────────────────────────────────────────────────────
  // ✅ NEW: calls updateAnnouncement from the hook, then refreshes the list
  const handleEdited = useCallback(
    async (id: string, payload: UpdateAnnouncementRequest) => {
      if (!activeMosque?.id) return;
      await updateAnnouncement(activeMosque.id, id, payload);
      // Refresh list so server state is in sync with optimistic update
      getAnnouncements(activeMosque.id, { page, limit: 10 });
    },
    [activeMosque?.id, updateAnnouncement, getAnnouncements, page]
  );

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!activeMosque?.id) return;
    await deleteAnnouncement(activeMosque.id, id);
    setDeleteTarget(null);
  }, [activeMosque?.id, deleteAnnouncement]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }
      `}</style>

      <div className="min-h-screen bg-[#faf8ff]" style={{ fontFamily: "DM Sans, sans-serif" }}>
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <h1
                className="text-3xl font-extrabold text-slate-800 tracking-tight"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Broadcast History
              </h1>
              <p className="text-slate-400 mt-1">
                {activeMosque?.name
                  ? `${activeMosque.name} · Manage and track community-wide communications.`
                  : "Manage and track community-wide communications."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setComposerOpen(true)}
                disabled={!activeMosque?.id}
                data-testid="new-announcement-btn"
                className="flex items-center gap-2 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #003527, #064e3b)" }}
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                New Announcement
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-3" data-testid="announcements-error-banner" role="alert">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                {error}
              </div>
              <button
                onClick={() => {
                  clearError();
                  if (activeMosque?.id) getAnnouncements(activeMosque.id, { page, limit: 10 });
                }}
                data-testid="announcements-error-retry-btn"
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-2 bg-slate-100/60 p-2 rounded-2xl" data-testid="filter-bar">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                data-testid={`filter-btn-${f.toLowerCase()}`}
                aria-pressed={activeFilter === f}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeFilter === f
                    ? "bg-emerald-100 text-[#003527] font-bold shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="space-y-4" data-testid="announcements-list">
            {loading || isHydrating ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : filtered.length > 0 ? (
              filtered.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  onDelete={(id) => setDeleteTarget(filtered.find((i) => i.id === id) ?? null)}
                  onEdit={(item) => setEditTarget(item)} // ✅ NEW
                />
              ))
            ) : (
              <div className="py-20 flex flex-col items-center text-center text-slate-300" data-testid="announcements-empty-state">
                <span className="material-symbols-outlined text-5xl mb-3">campaign</span>
                <p className="font-bold text-slate-400 text-lg">No announcements found</p>
                <p className="text-sm text-slate-300 mt-1">Try a different filter or create a new one.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > 0 && !loading && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-5 border-t border-slate-100" data-testid="pagination">
              <p className="text-sm text-slate-400">
                Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, totalResults)} of {totalResults} results
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  data-testid="pagination-prev-btn"
                  className="p-2 rounded-xl text-slate-400 hover:bg-white disabled:opacity-30 transition-all"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    data-testid={`pagination-page-btn-${p}`}
                    aria-current={page === p ? "page" : undefined}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                      page === p
                        ? "bg-[#003527] text-white shadow-sm"
                        : "text-slate-400 hover:bg-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {totalPages > 4 && (
                  <>
                    <span className="px-2 text-slate-300">...</span>
                    <button
                      onClick={() => setPage(totalPages)}
                      data-testid={`pagination-page-btn-${totalPages}`}
                      className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                        page === totalPages ? "bg-[#003527] text-white" : "text-slate-400 hover:bg-white"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  data-testid="pagination-next-btn"
                  className="p-2 rounded-xl text-slate-400 hover:bg-white disabled:opacity-30 transition-all"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
            <div
              className="md:col-span-2 rounded-2xl p-8 flex items-center justify-between relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #064e3b, #003527)" }}
            >
              <div className="relative z-10">
                <h5 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Automate Your Outreach
                </h5>
                <p className="text-emerald-200/80 text-sm max-w-sm mb-5 leading-relaxed">
                  Schedule Jumuah reminders and event updates ahead of time to maintain constant engagement with your community.
                </p>
                <button className="bg-white text-[#003527] px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-md transition-all">
                  Explore Schedule
                </button>
              </div>
              <div className="absolute right-[-20px] top-[-20px] opacity-10 scale-150 rotate-12 pointer-events-none">
                <span className="material-symbols-outlined" style={{ fontSize: 200 }}>broadcast_on_home</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-slate-100">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#064e3b] text-3xl">insights</span>
              </div>
              <h5 className="font-bold text-slate-800 mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Impact Analytics</h5>
              <p className="text-slate-400 text-xs mb-4">
                Your messages reached the community this month.
              </p>
              <a href="#" className="text-[#064e3b] text-xs font-bold hover:underline">View Report</a>
            </div>
          </div>

        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          title={deleteTarget.title}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Composer Slide-over (Create) */}
      {composerOpen && (
        <ComposerPanel
          onClose={() => setComposerOpen(false)}
          onPublish={handlePublished}
        />
      )}

      {/* ✅ Editor Slide-over (Edit) — new */}
      {editTarget && (
        <EditorPanel
          announcement={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdited}
        />
      )}
    </>
  );
}