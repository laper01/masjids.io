// components/builder/CoverPhoto/index.tsx
"use client";

import React, { useEffect } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { useMosque } from "@/context/MosqueContext";
import { useMasjidMedia } from "@/hooks/masjid/useMasjidMedia";
import { ASPECT_STYLE, RADIUS_CLASS, OVERLAY_CLASS } from "./constants";
import type { CoverPhotoProps } from "./types";

/**
 * CoverPhoto — displays the masjid's cover photo fetched from the API.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "CoverPhoto" }
 *
 * Leaf node — no slot, no children.
 *
 * Data source:
 *   Reads masjidId from MosqueContext (useMosque) — no prop required.
 *   Calls getCoverPhoto(masjidId) on mount via useMasjidMedia.
 *
 * Props:
 *  - aspect       → "video" | "wide" | "square" | "portrait"
 *  - radius       → "none" | "sm" | "md" | "lg" | "xl"
 *  - overlay      → "none" | "light" | "dark" | "gradient"
 *  - showFallback → show a placeholder when no cover photo exists
 *  - className    → free Tailwind override
 */
export default function CoverPhoto({
  aspect       = "video",
  radius       = "lg",
  overlay      = "none",
  showFallback = true,
  className    = "",
}: CoverPhotoProps) {
  const { activeMosque } = useMosque();
  const { coverPhoto, loading, error, getCoverPhoto } = useMasjidMedia();

  // Fetch on mount whenever activeMosque is available
  useEffect(() => {
    if (activeMosque?.id) {
      getCoverPhoto(activeMosque.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMosque?.id]);

  const wrapClass = className.trim()
    ? className.trim()
    : `relative w-full overflow-hidden ${RADIUS_CLASS[radius]}`;

  // ── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div
        className={`${wrapClass} bg-slate-100 flex items-center justify-center`}
        style={ASPECT_STYLE[aspect]}
      >
        <Loader2 size={28} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div
        className={`${wrapClass} bg-rose-50 border border-rose-200 flex flex-col items-center justify-center gap-2 text-rose-400`}
        style={ASPECT_STYLE[aspect]}
      >
        <ImageIcon size={24} />
        <p className="text-xs font-medium">Failed to load cover photo</p>
      </div>
    );
  }

  // API returns `cover_photo_url` (not `photo_url`)
  const photoUrl = coverPhoto?.data?.cover_photo_url;

  // ── Fallback — no photo yet ──────────────────────────────
  if (!photoUrl) {
    if (!showFallback) return null;
    return (
      <div
        className={`${wrapClass} bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400`}
        style={ASPECT_STYLE[aspect]}
      >
        <ImageIcon size={28} />
        <p className="text-xs font-medium">No cover photo — upload one from the dashboard</p>
      </div>
    );
  }

  // ── Photo ────────────────────────────────────────────────
  return (
    <div className={wrapClass} style={ASPECT_STYLE[aspect]}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={activeMosque?.name ?? "Masjid cover photo"}
        className="w-full h-full object-cover"
      />
      {overlay !== "none" && (
        <div className={`absolute inset-0 ${OVERLAY_CLASS[overlay]}`} />
      )}
    </div>
  );
}