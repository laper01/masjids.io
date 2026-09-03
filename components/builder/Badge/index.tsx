// components/builder/Badge/index.tsx
"use client";

import { COLOR_VARIANT_CLASS, SIZE_CLASS, SHAPE_CLASS } from "./constants";
import type { BadgeProps } from "./types";

/**
 * Badge — a compact label used for tags, statuses, and categories.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "Badge" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - label   → text displayed inside the badge
 *  - variant → "solid" | "soft" | "outline"
 *  - color   → "emerald" | "slate" | "amber" | "rose" | "sky" | "violet" | "orange"
 *  - size    → "sm" | "md" | "lg"
 *  - shape   → "rounded" | "pill"
 *  - className → free Tailwind override — replaces all presets when provided
 */
export default function Badge({
  label = "Badge",
  variant = "soft",
  color = "emerald",
  size = "md",
  shape = "pill",
  className = "",
}: BadgeProps) {
  const resolvedClass = className.trim()
    ? className.trim()
    : [
        "inline-flex items-center font-medium whitespace-nowrap",
        COLOR_VARIANT_CLASS[color][variant],
        SIZE_CLASS[size],
        SHAPE_CLASS[shape],
      ].join(" ");

  return <span className={resolvedClass}>{label}</span>;
}