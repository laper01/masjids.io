// components/builder/DonationBanner/index.tsx
"use client";

import { Heart } from "lucide-react";
import { THEME_STYLE } from "./constants";
import type { DonationBannerProps } from "./types";

/**
 * DonationBanner — a CTA block for masjid donation campaigns.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "DonationBanner" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - title       → banner heading
 *  - description → supporting text
 *  - buttonLabel → CTA button text
 *  - goal        → e.g. "Goal: $50,000"
 *  - raised      → e.g. "Raised: $32,000"
 *  - progress    → 0–100, shows progress bar when > 0
 *  - theme       → "emerald" | "slate" | "amber" | "sky" | "rose"
 *  - layout      → "banner" (full-width) | "card" (contained)
 *  - className   → free Tailwind override
 */
export default function DonationBanner({
  title       = "Support Our Masjid",
  description = "Your donation helps us maintain our facilities and serve the community.",
  buttonLabel = "Donate Now",
  goal        = "",
  raised      = "",
  progress    = 0,
  theme       = "emerald",
  layout      = "banner",
  className   = "",
}: DonationBannerProps) {
  const s = THEME_STYLE[theme];

  const wrapClass = className.trim()
    ? className.trim()
    : layout === "card"
    ? `rounded-2xl overflow-hidden ${s.wrapper}`
    : `w-full ${s.wrapper}`;

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const showProgress    = clampedProgress > 0;
  const showMeta        = goal || raised;

  return (
    <div className={wrapClass}>
      <div className="px-6 py-8 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Heart size={16} className="text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className={`text-lg font-extrabold leading-tight ${s.title}`}>{title}</h3>
            {description && (
              <p className={`text-sm leading-relaxed ${s.description}`}>{description}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="flex flex-col gap-1.5">
            <div className={`w-full h-2 rounded-full overflow-hidden ${s.progressBg}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${s.progressBar}`}
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
            <p className={`text-xs font-semibold ${s.meta}`}>{clampedProgress}% funded</p>
          </div>
        )}

        {/* Meta row */}
        {showMeta && (
          <div className={`flex gap-4 text-xs font-medium ${s.meta}`}>
            {goal   && <span>{goal}</span>}
            {raised && <span>{raised}</span>}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          className={`self-start px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${s.button}`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}