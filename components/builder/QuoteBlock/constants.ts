// components/builder/QuoteBlock/constants.ts

import type { QuoteTheme, QuoteLayout } from "./types";

export interface QuoteThemeStyle {
  wrapper:     string;
  arabic:      string;
  translation: string;
  source:      string;
  quoteMark:   string;
  accent:      string;
}

export const THEME_STYLE: Record<QuoteTheme, QuoteThemeStyle> = {
  emerald: {
    wrapper:     "bg-emerald-50 border border-emerald-100",
    arabic:      "text-emerald-900",
    translation: "text-emerald-800",
    source:      "text-emerald-600",
    quoteMark:   "text-emerald-200",
    accent:      "bg-emerald-500",
  },
  slate: {
    wrapper:     "bg-slate-50 border border-slate-200",
    arabic:      "text-slate-900",
    translation: "text-slate-700",
    source:      "text-slate-500",
    quoteMark:   "text-slate-200",
    accent:      "bg-slate-500",
  },
  amber: {
    wrapper:     "bg-amber-50 border border-amber-100",
    arabic:      "text-amber-900",
    translation: "text-amber-800",
    source:      "text-amber-600",
    quoteMark:   "text-amber-200",
    accent:      "bg-amber-500",
  },
  sky: {
    wrapper:     "bg-sky-50 border border-sky-100",
    arabic:      "text-sky-900",
    translation: "text-sky-800",
    source:      "text-sky-600",
    quoteMark:   "text-sky-200",
    accent:      "bg-sky-500",
  },
  rose: {
    wrapper:     "bg-rose-50 border border-rose-100",
    arabic:      "text-rose-900",
    translation: "text-rose-800",
    source:      "text-rose-600",
    quoteMark:   "text-rose-200",
    accent:      "bg-rose-500",
  },
};

export const LAYOUT_CLASS: Record<QuoteLayout, string> = {
  centered: "items-center text-center",
  left:     "items-start text-left",
  card:     "items-start text-left",
};