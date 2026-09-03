// components/builder/Spacer/index.tsx
"use client";

import type { SpacerProps, SpacerSize } from "./types";

const SIZE_PX: Record<SpacerSize, number> = {
  xs:  8,
  sm:  16,
  md:  32,
  lg:  48,
  xl:  64,
  "2xl": 96,
};

/**
 * Spacer — an invisible block that adds vertical space between components.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "Spacer" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - size         → "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
 *  - customHeight → number in px, overrides size when set
 */
export default function Spacer({ size = "md", customHeight }: SpacerProps) {
  const height = customHeight ?? SIZE_PX[size];
  return (
    <div
      aria-hidden="true"
      style={{ height, width: "100%", flexShrink: 0 }}
    />
  );
}