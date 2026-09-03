// components/builder/EventCard/constants.ts

import type { EventCardTheme, EventCardRadius } from "./types";

export interface EventCardThemeStyle {
  card:        string;
  accent:      string;
  title:       string;
  meta:        string;
  description: string;
  badge:       string;
  icon:        string;
  dateBg:      string;
  dateText:    string;
}

export const THEME_STYLE: Record<EventCardTheme, EventCardThemeStyle> = {
  emerald: {
    card:        "bg-white border border-emerald-100 shadow-sm",
    accent:      "bg-emerald-600",
    title:       "text-slate-900",
    meta:        "text-emerald-700",
    description: "text-slate-500",
    badge:       "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon:        "text-emerald-500",
    dateBg:      "bg-emerald-600",
    dateText:    "text-white",
  },
  slate: {
    card:        "bg-white border border-slate-200 shadow-sm",
    accent:      "bg-slate-700",
    title:       "text-slate-900",
    meta:        "text-slate-600",
    description: "text-slate-500",
    badge:       "bg-slate-100 text-slate-600 border border-slate-200",
    icon:        "text-slate-400",
    dateBg:      "bg-slate-700",
    dateText:    "text-white",
  },
  amber: {
    card:        "bg-white border border-amber-100 shadow-sm",
    accent:      "bg-amber-500",
    title:       "text-slate-900",
    meta:        "text-amber-700",
    description: "text-slate-500",
    badge:       "bg-amber-50 text-amber-700 border border-amber-200",
    icon:        "text-amber-500",
    dateBg:      "bg-amber-500",
    dateText:    "text-white",
  },
  sky: {
    card:        "bg-white border border-sky-100 shadow-sm",
    accent:      "bg-sky-600",
    title:       "text-slate-900",
    meta:        "text-sky-700",
    description: "text-slate-500",
    badge:       "bg-sky-50 text-sky-700 border border-sky-200",
    icon:        "text-sky-500",
    dateBg:      "bg-sky-600",
    dateText:    "text-white",
  },
  rose: {
    card:        "bg-white border border-rose-100 shadow-sm",
    accent:      "bg-rose-600",
    title:       "text-slate-900",
    meta:        "text-rose-700",
    description: "text-slate-500",
    badge:       "bg-rose-50 text-rose-700 border border-rose-200",
    icon:        "text-rose-500",
    dateBg:      "bg-rose-600",
    dateText:    "text-white",
  },
};

export const RADIUS_CLASS: Record<EventCardRadius, string> = {
  none: "rounded-none",
  sm:   "rounded-lg",
  md:   "rounded-xl",
  lg:   "rounded-2xl",
  xl:   "rounded-3xl",
};