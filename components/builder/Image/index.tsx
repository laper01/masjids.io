// components/builder/Image/index.tsx
"use client";

import React from "react";
import { ImageIcon } from "lucide-react";
import { ASPECT_STYLE, FIT_CLASS, RADIUS_CLASS } from "./constants";
import type { ImageProps } from "./types";

/**
 * Image — a responsive image block with aspect ratio, fit, and radius controls.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "Image" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - src          → image URL
 *  - alt          → accessibility alt text
 *  - aspect       → "auto" | "square" | "video" | "wide" | "portrait"
 *  - fit          → "cover" | "contain" | "fill"
 *  - radius       → "none" | "sm" | "md" | "lg" | "xl" | "full"
 *  - widthPercent → 0–100, width as % of parent
 *  - className    → free Tailwind override
 */
export default function Image({
  src = "",
  alt = "",
  aspect = "video",
  fit = "cover",
  radius = "lg",
  widthPercent = 100,
  className = "",
}: ImageProps) {
  const wrapClass = className.trim()
    ? className.trim()
    : `overflow-hidden ${RADIUS_CLASS[radius]}`;

  const wrapStyle: React.CSSProperties = {
    width: `${widthPercent}%`,
    ...ASPECT_STYLE[aspect],
  };

  // Empty state — shown when no src is provided
  if (!src) {
    return (
      <div
        className={`${wrapClass} bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400`}
        style={{ ...wrapStyle, minHeight: 120 }}
      >
        <ImageIcon size={28} />
        <span className="text-xs font-medium">No image — set a source URL</span>
      </div>
    );
  }

  return (
    <div className={wrapClass} style={wrapStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full ${FIT_CLASS[fit]}`}
      />
    </div>
  );
}