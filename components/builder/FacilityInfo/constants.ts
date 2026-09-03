// components/builder/FacilityInfo/constants.ts

import type { FacilityTheme } from "./types";

export interface FacilityThemeStyle {
  card:    string;
  title:   string;
  icon:    string;
  label:   string;
  itemBg:  string;
  dot:     string;
}

export const THEME_STYLE: Record<FacilityTheme, FacilityThemeStyle> = {
  emerald: {
    card:   "bg-white border border-emerald-100 shadow-sm rounded-2xl",
    title:  "text-emerald-900",
    icon:   "text-emerald-500",
    label:  "text-emerald-800",
    itemBg: "bg-emerald-50",
    dot:    "bg-emerald-400",
  },
  slate: {
    card:   "bg-white border border-slate-200 shadow-sm rounded-2xl",
    title:  "text-slate-800",
    icon:   "text-slate-500",
    label:  "text-slate-700",
    itemBg: "bg-slate-50",
    dot:    "bg-slate-400",
  },
  amber: {
    card:   "bg-white border border-amber-100 shadow-sm rounded-2xl",
    title:  "text-amber-900",
    icon:   "text-amber-500",
    label:  "text-amber-800",
    itemBg: "bg-amber-50",
    dot:    "bg-amber-400",
  },
  sky: {
    card:   "bg-white border border-sky-100 shadow-sm rounded-2xl",
    title:  "text-sky-900",
    icon:   "text-sky-500",
    label:  "text-sky-800",
    itemBg: "bg-sky-50",
    dot:    "bg-sky-400",
  },
};