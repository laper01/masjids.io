// components/builder/Divider/index.tsx
"use client";

import { SPACING_CLASS, BORDER_STYLE } from "./constants";
import type { DividerProps } from "./types";

/**
 * Divider — a horizontal rule that separates sections.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "Divider" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - style     → "solid" | "dashed" | "dotted"
 *  - color     → any CSS color string
 *  - thickness → border width in px
 *  - spacing   → vertical margin: "sm" | "md" | "lg" | "xl"
 *  - label     → optional centered text label
 *  - className → free Tailwind override
 */
export default function Divider({
  style = "solid",
  color = "#e2e8f0",
  thickness = 1,
  spacing = "md",
  label = "",
  className = "",
}: DividerProps) {
  if (className.trim()) {
    return <hr className={className.trim()} />;
  }

  if (label) {
    return (
      <div className={`flex items-center gap-3 ${SPACING_CLASS[spacing]}`}>
        <hr
          className={`flex-1 ${BORDER_STYLE[style]}`}
          style={{ borderColor: color, borderTopWidth: thickness }}
        />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
          {label}
        </span>
        <hr
          className={`flex-1 ${BORDER_STYLE[style]}`}
          style={{ borderColor: color, borderTopWidth: thickness }}
        />
      </div>
    );
  }

  return (
    <hr
      className={`w-full ${BORDER_STYLE[style]} ${SPACING_CLASS[spacing]}`}
      style={{ borderColor: color, borderTopWidth: thickness }}
    />
  );
}