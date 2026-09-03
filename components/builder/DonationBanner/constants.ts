// components/builder/DonationBanner/constants.ts

import type { DonationTheme } from "./types";

export interface DonationThemeStyle {
  wrapper:      string;
  title:        string;
  description:  string;
  meta:         string;
  progressBg:   string;
  progressBar:  string;
  button:       string;
}

export const THEME_STYLE: Record<DonationTheme, DonationThemeStyle> = {
  emerald: {
    wrapper:     "bg-emerald-600",
    title:       "text-white",
    description: "text-emerald-100",
    meta:        "text-emerald-200",
    progressBg:  "bg-emerald-500",
    progressBar: "bg-white",
    button:      "bg-white text-emerald-700 hover:bg-emerald-50",
  },
  slate: {
    wrapper:     "bg-slate-800",
    title:       "text-white",
    description: "text-slate-300",
    meta:        "text-slate-400",
    progressBg:  "bg-slate-700",
    progressBar: "bg-white",
    button:      "bg-white text-slate-800 hover:bg-slate-100",
  },
  amber: {
    wrapper:     "bg-amber-500",
    title:       "text-white",
    description: "text-amber-100",
    meta:        "text-amber-200",
    progressBg:  "bg-amber-400",
    progressBar: "bg-white",
    button:      "bg-white text-amber-700 hover:bg-amber-50",
  },
  sky: {
    wrapper:     "bg-sky-600",
    title:       "text-white",
    description: "text-sky-100",
    meta:        "text-sky-200",
    progressBg:  "bg-sky-500",
    progressBar: "bg-white",
    button:      "bg-white text-sky-700 hover:bg-sky-50",
  },
  rose: {
    wrapper:     "bg-rose-600",
    title:       "text-white",
    description: "text-rose-100",
    meta:        "text-rose-200",
    progressBg:  "bg-rose-500",
    progressBar: "bg-white",
    button:      "bg-white text-rose-700 hover:bg-rose-50",
  },
};