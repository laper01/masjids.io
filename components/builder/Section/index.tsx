// components/builder/Section/index.tsx
"use client";

import React from "react";
import { PADDING_CLASS, MAX_WIDTH_CLASS, ALIGN_CLASS } from "./constants";
import type { SectionProps } from "./types";

/**
 * Section — a full-width page-level wrapper with background, padding,
 * max-width, and content alignment controls.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "Section" }
 *
 * Slot container — accepts child components via Reka's children slot.
 * Use this as the outermost wrapper for each page section (hero, about, etc.)
 *
 * Props:
 *  - background → CSS color string for the section background
 *  - padding    → "none" | "sm" | "md" | "lg" | "xl"
 *  - maxWidth   → "sm" | "md" | "lg" | "xl" | "full" — constrains inner content
 *  - align      → "left" | "center" | "right"
 *  - minHeight  → number in px — useful for hero sections
 *  - className  → free Tailwind override
 */
export default function Section({
  background = "#ffffff",
  padding = "md",
  maxWidth = "lg",
  align = "left",
  minHeight,
  className = "",
  children,
}: SectionProps) {
  const outerClass = className.trim()
    ? className.trim()
    : "w-full flex justify-center";

  const innerClass = [
    "w-full flex flex-col gap-6",
    PADDING_CLASS[padding],
    MAX_WIDTH_CLASS[maxWidth],
    ALIGN_CLASS[align],
  ].join(" ");

  return (
    <section
      className={outerClass}
      style={{ background, minHeight }}
    >
      <div className={innerClass}>
        {children ?? (
          <p className="text-xs text-slate-300 italic">Empty section — add components inside</p>
        )}
      </div>
    </section>
  );
}