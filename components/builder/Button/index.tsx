// components/builder/Button/index.tsx
"use client";

import {
  BASE_CLASS,
  COLOR_VARIANT_CLASS,
  SIZE_CLASS,
  SHAPE_CLASS,
  ALIGN_CLASS,
  DISABLED_CLASS,
} from "./constants";
import type { ButtonProps } from "./types";

/**
 * Button — an interactive button with variant, color, size, and shape presets.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "Button" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - label     → text displayed inside the button
 *  - variant   → "solid" | "soft" | "outline" | "ghost"
 *  - color     → "emerald" | "slate" | "amber" | "rose" | "sky" | "violet"
 *  - size      → "sm" | "md" | "lg"
 *  - shape     → "rounded" | "pill" | "square"
 *  - disabled  → disables interaction and dims the button
 *  - fullWidth → stretches button to full container width
 *  - align     → "left" | "center" | "right" (only when fullWidth is false)
 *  - className → free Tailwind override — replaces all presets when provided
 *  - onClick   → click handler, can be wired to Reka expressions
 */
export default function Button({
  label = "Click me",
  variant = "solid",
  color = "emerald",
  size = "md",
  shape = "rounded",
  disabled = false,
  fullWidth = false,
  align = "left",
  className = "",
  onClick,
}: ButtonProps) {
  const resolvedClass = className.trim()
    ? className.trim()
    : [
        BASE_CLASS,
        COLOR_VARIANT_CLASS[color][variant],
        SIZE_CLASS[size],
        SHAPE_CLASS[shape],
        disabled ? DISABLED_CLASS : "",
        fullWidth ? "w-full" : ALIGN_CLASS[align],
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <button
      className={resolvedClass}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}