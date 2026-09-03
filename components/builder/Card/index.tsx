// components/builder/Card/index.tsx
"use client";

import React from "react";
import {
  VARIANT_CLASS,
  COLOR_CLASS,
  SHADOW_CLASS,
  PADDING_CLASS,
  TITLE_CLASS,
} from "./constants";
import type { CardProps } from "./types";

/**
 * Card — a content container with optional title, variant, color, shadow, and padding.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "Card" }
 *
 * Slot container — accepts child components via Reka's children slot.
 *
 * Props:
 *  - title    → optional heading displayed at the top of the card
 *  - variant  → "default" | "outline" | "filled"
 *  - color    → "white" | "emerald" | "slate" | "amber" | "rose"
 *  - shadow   → "none" | "sm" | "md" | "lg"
 *  - padding  → "sm" | "md" | "lg"
 *  - className → free Tailwind override — replaces all presets when provided
 */
export default function Card({
  title,
  variant = "default",
  color = "white",
  shadow = "sm",
  padding = "md",
  className = "",
  children,
}: CardProps) {
  // When className is provided, skip all presets
  const resolvedClass = className.trim()
    ? className.trim()
    : [
        "rounded-2xl",
        VARIANT_CLASS[variant],
        variant === "filled" ? COLOR_CLASS[color] : "",
        SHADOW_CLASS[shadow],
        PADDING_CLASS[padding],
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <div className={resolvedClass}>
      {title && <p className={TITLE_CLASS}>{title}</p>}
      {children ?? (
        <p className="text-xs text-slate-300 italic">Empty card</p>
      )}
    </div>
  );
}
