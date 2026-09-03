// components/builder/Alert/index.tsx
"use client";

import { Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { VARIANT_STYLE, SIZE_CLASS } from "./constants";
import type { AlertProps } from "./types";

const ICON_MAP = {
  "info":           Info,
  "check-circle":   CheckCircle,
  "alert-triangle": AlertTriangle,
  "x-circle":       XCircle,
};

/**
 * Alert — a contextual banner for info, success, warning, or error messages.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "Alert" }
 *
 * Leaf node — no slot, no children.
 * Use it for announcements, notices, and system messages.
 *
 * Props:
 *  - variant     → "info" | "success" | "warning" | "error"
 *  - title       → main alert heading
 *  - description → supporting detail text
 *  - showIcon    → show/hide the left icon
 *  - size        → "sm" | "md" | "lg"
 *  - className   → free Tailwind override
 */
export default function Alert({
  variant = "info",
  title = "Alert title",
  description = "",
  showIcon = true,
  size = "md",
  className = "",
}: AlertProps) {
  const variantStyle = VARIANT_STYLE[variant];
  const sizeStyle    = SIZE_CLASS[size];
  const IconComponent = ICON_MAP[variantStyle.iconName];

  const wrapClass = className.trim()
    ? className.trim()
    : `flex items-start ${variantStyle.wrapper} ${sizeStyle.wrapper}`;

  return (
    <div className={wrapClass} role="alert">
      {showIcon && (
        <IconComponent
          size={sizeStyle.icon}
          className={`flex-shrink-0 mt-0.5 ${variantStyle.icon}`}
        />
      )}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        {title && (
          <p className={`${sizeStyle.title} ${variantStyle.title} leading-snug`}>
            {title}
          </p>
        )}
        {description && (
          <p className={`${sizeStyle.desc} ${variantStyle.description} leading-relaxed`}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}