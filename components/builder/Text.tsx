// components/builder/Text.tsx
"use client";

interface TextProps {
  value?: string;
  className?: string;
}

/**
 * Text — a leaf node that renders a single string value.
 *
 * In the Reka AST this component is referenced as `{ type: "external", name: "Text" }`.
 * It intentionally has no slot — it is always a leaf in the component tree.
 */
export default function Text({
  value = "",
  className = "text-sm text-slate-700",
}: TextProps) {
  return <p className={className}>{value}</p>;
}