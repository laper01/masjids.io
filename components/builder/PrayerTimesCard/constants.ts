// components/builder/PrayerTimesCard/constants.ts

import type { PrayerTimesTheme } from "./types";

export interface ThemeStyle {
  card:        string;
  header:      string;
  title:       string;
  itemBg:      string;
  itemLabel:   string;
  itemTime:    string;
  jumuahBg:    string;
  jumuahLabel: string;
  jumuahTime:  string;
  dot:         string;
}

export const THEME_STYLE: Record<PrayerTimesTheme, ThemeStyle> = {
  emerald: {
    card:        "bg-white border border-emerald-100 shadow-sm",
    header:      "bg-emerald-600",
    title:       "text-white",
    itemBg:      "bg-emerald-50 hover:bg-emerald-100",
    itemLabel:   "text-emerald-800",
    itemTime:    "text-emerald-600",
    jumuahBg:    "bg-emerald-600",
    jumuahLabel: "text-emerald-100",
    jumuahTime:  "text-white",
    dot:         "bg-emerald-400",
  },
  slate: {
    card:        "bg-white border border-slate-200 shadow-sm",
    header:      "bg-slate-800",
    title:       "text-white",
    itemBg:      "bg-slate-50 hover:bg-slate-100",
    itemLabel:   "text-slate-700",
    itemTime:    "text-slate-500",
    jumuahBg:    "bg-slate-700",
    jumuahLabel: "text-slate-300",
    jumuahTime:  "text-white",
    dot:         "bg-slate-400",
  },
  amber: {
    card:        "bg-white border border-amber-100 shadow-sm",
    header:      "bg-amber-500",
    title:       "text-white",
    itemBg:      "bg-amber-50 hover:bg-amber-100",
    itemLabel:   "text-amber-900",
    itemTime:    "text-amber-600",
    jumuahBg:    "bg-amber-500",
    jumuahLabel: "text-amber-100",
    jumuahTime:  "text-white",
    dot:         "bg-amber-400",
  },
  sky: {
    card:        "bg-white border border-sky-100 shadow-sm",
    header:      "bg-sky-600",
    title:       "text-white",
    itemBg:      "bg-sky-50 hover:bg-sky-100",
    itemLabel:   "text-sky-900",
    itemTime:    "text-sky-600",
    jumuahBg:    "bg-sky-600",
    jumuahLabel: "text-sky-100",
    jumuahTime:  "text-white",
    dot:         "bg-sky-400",
  },
};

/** Prayer name display labels */
export const PRAYER_LABELS: Record<string, string> = {
  fajr:    "Fajr",
  dhuhr:   "Dhuhr",
  asr:     "Asr",
  maghrib: "Maghrib",
  isha:    "Isha",
};