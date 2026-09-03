// components/builder/QuoteBlock/index.tsx
"use client";

import { THEME_STYLE, LAYOUT_CLASS } from "./constants";
import type { QuoteBlockProps } from "./types";

/**
 * QuoteBlock — displays a Quran verse or hadith with Arabic text,
 * translation, and source reference.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "QuoteBlock" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - arabic        → Arabic text displayed RTL in large decorative font
 *  - translation   → English translation or transliteration
 *  - source        → Reference e.g. "Surah Al-Baqarah 2:286"
 *  - theme         → "emerald" | "slate" | "amber" | "sky" | "rose"
 *  - layout        → "centered" | "left" | "card"
 *  - showQuoteMark → show decorative large quotation mark
 *  - className     → free Tailwind override
 */
export default function QuoteBlock({
  arabic        = "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
  translation   = "Indeed, with hardship comes ease.",
  source        = "Surah Ash-Sharh 94:6",
  theme         = "emerald",
  layout        = "centered",
  showQuoteMark = true,
  className     = "",
}: QuoteBlockProps) {
  const s = THEME_STYLE[theme];

  const isCard = layout === "card";

  const wrapClass = className.trim()
    ? className.trim()
    : isCard
    ? `rounded-2xl overflow-hidden ${s.wrapper}`
    : `w-full rounded-2xl px-8 py-10 ${s.wrapper}`;

  return (
    <div className={wrapClass}>
      {/* Card: left accent bar */}
      {isCard && <div className={`h-1.5 w-full ${s.accent}`} />}

      <div className={`flex flex-col gap-4 ${isCard ? "px-6 py-6" : ""} ${LAYOUT_CLASS[layout]}`}>
        {/* Decorative quote mark */}
        {showQuoteMark && (
          <span className={`text-8xl font-serif leading-none select-none -mb-6 ${s.quoteMark}`} aria-hidden="true">
            "
          </span>
        )}

        {/* Arabic text */}
        {arabic && (
          <p
            className={`text-2xl font-bold leading-loose tracking-wide ${s.arabic}`}
            dir="rtl"
            lang="ar"
          >
            {arabic}
          </p>
        )}

        {/* Translation */}
        {translation && (
          <p className={`text-base font-medium leading-relaxed italic ${s.translation}`}>
            "{translation}"
          </p>
        )}

        {/* Source */}
        {source && (
          <p className={`text-xs font-semibold uppercase tracking-widest ${s.source}`}>
            — {source}
          </p>
        )}
      </div>
    </div>
  );
}