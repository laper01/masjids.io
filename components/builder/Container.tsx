// components/builder/Container.tsx
"use client";

import React from "react";

interface ContainerProps {
  className?: string;
  /** Reka injects the rendered slot children here */
  children?: React.ReactNode;
}

/**
 * Container — a layout wrapper that accepts a default slot.
 *
 * In the Reka AST this component is referenced as `{ type: "external", name: "Container" }`.
 * Reka automatically renders any child templates defined in `slots.default`
 * and passes them as `children`.
 */
export default function Container({
  className = "p-4",
  children,
}: ContainerProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200/60 bg-white shadow-sm",
        className,
      ].join(" ")}
    >
      {children ?? (
        <p className="text-xs text-slate-300 italic">Empty container</p>
      )}
    </div>
  );
}