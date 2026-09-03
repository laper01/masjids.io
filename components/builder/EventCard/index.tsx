// components/builder/EventCard/index.tsx
"use client";

import { Calendar, Clock, MapPin } from "lucide-react";
import { THEME_STYLE, RADIUS_CLASS } from "./constants";
import type { EventCardProps } from "./types";

/**
 * EventCard — displays a single event with date, time, location, and badge.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "EventCard" }
 *
 * Leaf node — no slot, no children.
 *
 * Props:
 *  - title       → event name
 *  - date        → date string e.g. "Friday, June 14 2026"
 *  - time        → time string e.g. "7:00 PM"
 *  - location    → venue or address
 *  - description → short summary
 *  - badge       → label pill e.g. "Free" | "Open" | "Members Only"
 *  - theme       → "emerald" | "slate" | "amber" | "sky" | "rose"
 *  - layout      → "vertical" | "horizontal"
 *  - radius      → "none" | "sm" | "md" | "lg" | "xl"
 *  - className   → free Tailwind override
 */
export default function EventCard({
  title       = "Event Title",
  date        = "Friday, June 14 2026",
  time        = "7:00 PM",
  location    = "Main Hall",
  description = "",
  badge       = "",
  theme       = "emerald",
  layout      = "vertical",
  radius      = "lg",
  className   = "",
}: EventCardProps) {
  const s = THEME_STYLE[theme];

  const wrapClass = className.trim()
    ? className.trim()
    : `overflow-hidden ${s.card} ${RADIUS_CLASS[radius]}`;

  if (layout === "horizontal") {
    return (
      <div className={`${wrapClass} flex items-stretch`}>
        {/* Date accent block */}
        <div className={`flex flex-col items-center justify-center px-5 ${s.dateBg} min-w-[72px]`}>
          <span className={`text-2xl font-extrabold leading-none ${s.dateText}`}>
            {date.split(" ")[1]?.replace(",", "") ?? "14"}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${s.dateText} opacity-80`}>
            {date.split(" ")[0]?.slice(0, 3) ?? "Fri"}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`text-sm font-bold leading-snug ${s.title}`}>{title}</h3>
            {badge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${s.badge}`}>
                {badge}
              </span>
            )}
          </div>
          <div className={`flex flex-wrap gap-3 text-xs ${s.meta}`}>
            <span className="flex items-center gap-1">
              <Clock size={11} className={s.icon} /> {time}
            </span>
            {location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} className={s.icon} /> {location}
              </span>
            )}
          </div>
          {description && (
            <p className={`text-xs leading-relaxed ${s.description}`}>{description}</p>
          )}
        </div>
      </div>
    );
  }

  // Vertical layout
  return (
    <div className={wrapClass}>
      {/* Top accent bar */}
      <div className={`h-1.5 w-full ${s.accent}`} />

      <div className="p-5 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={`text-base font-bold leading-snug ${s.title}`}>{title}</h3>
          {badge && (
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${s.badge}`}>
              {badge}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className={`flex flex-col gap-1.5 text-xs ${s.meta}`}>
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className={s.icon} /> {date}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} className={s.icon} /> {time}
          </span>
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className={s.icon} /> {location}
            </span>
          )}
        </div>

        {description && (
          <p className={`text-xs leading-relaxed ${s.description}`}>{description}</p>
        )}
      </div>
    </div>
  );
}