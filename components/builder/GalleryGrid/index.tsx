// components/builder/GalleryGrid/index.tsx
"use client";

import React, { useEffect } from "react";
import { Images, Loader2 } from "lucide-react";
import { useMosque } from "@/context/MosqueContext";
import { useMasjidMedia } from "@/hooks/masjid/useMasjidMedia";
import { COLUMNS_CLASS, GAP_CLASS, RADIUS_CLASS, ASPECT_STYLE } from "./constants";
import type { GalleryGridProps } from "./types";

/**
 * GalleryGrid — displays the masjid's photo gallery in a responsive grid.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "GalleryGrid" }
 *
 * Leaf node — no slot, no children.
 *
 * Data source:
 *   Reads masjidId from MosqueContext (useMosque) — no prop required.
 *   Calls getGallery(masjidId, { limit }) on mount via useMasjidMedia.
 *
 * Props:
 *  - columns     → 2 | 3 | 4 columns
 *  - gap         → "sm" | "md" | "lg"
 *  - limit       → max photos to show (1–10, default 6)
 *  - aspect      → "square" | "video" | "auto"
 *  - radius      → "none" | "sm" | "md" | "lg"
 *  - showCaption → show caption text below each photo
 *  - className   → free Tailwind override
 */
export default function GalleryGrid({
  columns     = 3,
  gap         = "md",
  limit       = 6,
  aspect      = "square",
  radius      = "md",
  showCaption = false,
  className   = "",
}: GalleryGridProps) {
  const { activeMosque } = useMosque();
  const { gallery, loading, error, getGallery } = useMasjidMedia();

  useEffect(() => {
    if (activeMosque?.id) {
      getGallery(activeMosque.id, { limit });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMosque?.id, limit]);

  const gridClass = className.trim()
    ? className.trim()
    : `grid ${COLUMNS_CLASS[columns]} ${GAP_CLASS[gap]}`;

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`grid ${COLUMNS_CLASS[columns]} ${GAP_CLASS[gap]}`}>
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-100 animate-pulse rounded-xl flex items-center justify-center"
            style={ASPECT_STYLE[aspect]}
          >
            <Loader2 size={16} className="text-slate-300 animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-rose-400">
        <Images size={28} />
        <p className="text-xs font-medium">Failed to load gallery</p>
      </div>
    );
  }

  const photos = gallery?.data?.slice(0, limit) ?? [];

  // ── Empty state ──────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
        <Images size={28} />
        <p className="text-xs font-medium">No gallery photos yet</p>
      </div>
    );
  }

  // ── Grid ─────────────────────────────────────────────────
  return (
    <div className={gridClass}>
      {photos.map((photo) => (
        <div key={photo.id} className="flex flex-col gap-1">
          <div
            className={`overflow-hidden ${RADIUS_CLASS[radius]}`}
            style={ASPECT_STYLE[aspect]}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.photo_url}
              alt={photo.caption ?? "Gallery photo"}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
          {showCaption && photo.caption && (
            <p className="text-xs text-slate-500 text-center leading-snug px-1">
              {photo.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}