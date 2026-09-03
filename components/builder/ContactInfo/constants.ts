// components/builder/ContactInfo/constants.ts

import type { ContactTheme, ContactLayout } from "./types";

export interface ContactThemeStyle {
  card:   string;
  title:  string;
  label:  string;
  value:  string;
  icon:   string;
  itemBg: string;
}

export const THEME_STYLE: Record<ContactTheme, ContactThemeStyle> = {
  emerald: {
    card:   "bg-white border border-emerald-100 shadow-sm rounded-2xl",
    title:  "text-emerald-900",
    label:  "text-emerald-600",
    value:  "text-slate-700",
    icon:   "text-emerald-500",
    itemBg: "bg-emerald-50",
  },
  slate: {
    card:   "bg-white border border-slate-200 shadow-sm rounded-2xl",
    title:  "text-slate-800",
    label:  "text-slate-500",
    value:  "text-slate-700",
    icon:   "text-slate-400",
    itemBg: "bg-slate-50",
  },
  amber: {
    card:   "bg-white border border-amber-100 shadow-sm rounded-2xl",
    title:  "text-amber-900",
    label:  "text-amber-600",
    value:  "text-slate-700",
    icon:   "text-amber-500",
    itemBg: "bg-amber-50",
  },
  sky: {
    card:   "bg-white border border-sky-100 shadow-sm rounded-2xl",
    title:  "text-sky-900",
    label:  "text-sky-600",
    value:  "text-slate-700",
    icon:   "text-sky-500",
    itemBg: "bg-sky-50",
  },
};

export const LAYOUT_CLASS: Record<ContactLayout, string> = {
  list: "flex flex-col gap-2 mt-3",
  grid: "grid grid-cols-2 gap-2 mt-3",
};