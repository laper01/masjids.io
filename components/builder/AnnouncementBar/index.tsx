// components/builder/AnnouncementBar/index.tsx
"use client";

import { Info, CheckCircle, AlertTriangle, Megaphone } from "lucide-react";
import { VARIANT_STYLE, SIZE_CLASS } from "./constant";
import type { AnnouncementBarProps } from "./types";

const ICON_MAP = {
  "info":           Info,
  "check-circle":   CheckCircle,
  "alert-triangle": AlertTriangle,
  "megaphone":      Megaphone,
};

/**
 * AnnouncementBar — a full-width notice bar for important masjid announcements.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "AnnouncementBar" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - message  → main announcement text
 *  - label    → optional prefix pill e.g. "Notice" | "New" | "Urgent"
 *  - variant  → "info" | "success" | "warning" | "error" | "neutral"
 *  - size     → "sm" | "md" | "lg"
 *  - showIcon → show left icon
 *  - className → free Tailwind override
 */
export default function AnnouncementBar({
  message  = "Friday prayer will begin at 12:30 PM. Please arrive early.",
  label    = "",
  variant  = "info",
  size     = "md",
  showIcon = true,
  className = "",
}: AnnouncementBarProps) {
  const s  = VARIANT_STYLE[variant];
  const sz = SIZE_CLASS[size];
  const IconComponent = ICON_MAP[s.iconName];

  const wrapClass = className.trim()
    ? className.trim()
    : `w-full flex items-center ${s.wrapper} ${sz.wrapper}`;

  return (
    <div className={wrapClass} role="banner">
      {showIcon && (
        <IconComponent size={sz.icon} className={`flex-shrink-0 ${s.icon}`} />
      )}
      {label && (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md flex-shrink-0 ${s.label}`}>
          {label}
        </span>
      )}
      <p className={`flex-1 font-medium leading-snug ${sz.text} ${s.message}`}>
        {message}
      </p>
    </div>
  );
}