// components/builder/PrayerTimesCard/index.tsx
"use client";

import { Moon } from "lucide-react";
import { THEME_STYLE, PRAYER_LABELS } from "./constants";
import type { PrayerTimesCardProps } from "./types";

/**
 * PrayerTimesCard — a pre-built card displaying all 5 daily prayer times
 * plus an optional Jumuah time. The #1 feature of any masjid website.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "PrayerTimesCard" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - title   → card heading
 *  - fajr    → Fajr time string (e.g. "05:10")
 *  - dhuhr   → Dhuhr time string
 *  - asr     → Asr time string
 *  - maghrib → Maghrib time string
 *  - isha    → Isha time string
 *  - jumuah  → Friday prayer time (optional — hidden when empty)
 *  - theme   → "emerald" | "slate" | "amber" | "sky"
 *  - layout  → "row" (horizontal) | "grid" (2-column)
 *  - className → free Tailwind override
 */
export default function PrayerTimesCard({
  title = "Prayer Times",
  fajr    = "05:10",
  dhuhr   = "12:20",
  asr     = "15:40",
  maghrib = "18:05",
  isha    = "19:20",
  jumuah  = "",
  theme   = "emerald",
  layout  = "grid",
  className = "",
}: PrayerTimesCardProps) {
  const s = THEME_STYLE[theme];

  const prayers = [
    { key: "fajr",    time: fajr },
    { key: "dhuhr",   time: dhuhr },
    { key: "asr",     time: asr },
    { key: "maghrib", time: maghrib },
    { key: "isha",    time: isha },
  ];

  const wrapClass = className.trim()
    ? className.trim()
    : `rounded-2xl overflow-hidden ${s.card}`;

  const gridClass = layout === "grid"
    ? "grid grid-cols-2 gap-2 p-4"
    : "flex flex-row flex-wrap gap-2 p-4";

  return (
    <div className={wrapClass}>
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-5 py-3.5 ${s.header}`}>
        <Moon size={16} className={s.title} />
        <h3 className={`text-sm font-bold tracking-wide ${s.title}`}>
          {title}
        </h3>
      </div>

      {/* Prayer items */}
      <div className={gridClass}>
        {prayers.map(({ key, time }) => (
          <div
            key={key}
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${s.itemBg}`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
              <span className={`text-xs font-semibold ${s.itemLabel}`}>
                {PRAYER_LABELS[key]}
              </span>
            </div>
            <span className={`text-xs font-bold tabular-nums ${s.itemTime}`}>
              {time}
            </span>
          </div>
        ))}

        {/* Jumuah — only shown when provided */}
        {jumuah && (
          <div
            className={`col-span-2 flex items-center justify-between rounded-lg px-3 py-2.5 ${s.jumuahBg}`}
          >
            <div className="flex items-center gap-2">
              <Moon size={12} className={s.jumuahLabel} />
              <span className={`text-xs font-semibold ${s.jumuahLabel}`}>
                Jumuah
              </span>
            </div>
            <span className={`text-xs font-bold tabular-nums ${s.jumuahTime}`}>
              {jumuah}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}