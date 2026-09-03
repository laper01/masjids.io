// components/builder/AnnouncementBar/constants.ts

import type { AnnouncementVariant, AnnouncementSize } from "./types";

export interface AnnouncementStyle {
  wrapper:  string;
  label:    string;
  message:  string;
  icon:     string;
  iconName: "info" | "check-circle" | "alert-triangle" | "megaphone";
}

export const VARIANT_STYLE: Record<AnnouncementVariant, AnnouncementStyle> = {
  info: {
    wrapper:  "bg-sky-50 border border-sky-200",
    label:    "text-sky-700 bg-sky-100",
    message:  "text-sky-800",
    icon:     "text-sky-500",
    iconName: "info",
  },
  success: {
    wrapper:  "bg-emerald-50 border border-emerald-200",
    label:    "text-emerald-700 bg-emerald-100",
    message:  "text-emerald-800",
    icon:     "text-emerald-500",
    iconName: "check-circle",
  },
  warning: {
    wrapper:  "bg-amber-50 border border-amber-200",
    label:    "text-amber-700 bg-amber-100",
    message:  "text-amber-800",
    icon:     "text-amber-500",
    iconName: "alert-triangle",
  },
  error: {
    wrapper:  "bg-rose-50 border border-rose-200",
    label:    "text-rose-700 bg-rose-100",
    message:  "text-rose-800",
    icon:     "text-rose-500",
    iconName: "megaphone",
  },
  neutral: {
    wrapper:  "bg-slate-800",
    label:    "text-slate-300 bg-slate-700",
    message:  "text-slate-100",
    icon:     "text-slate-400",
    iconName: "megaphone",
  },
};

export const SIZE_CLASS: Record<AnnouncementSize, { wrapper: string; text: string; icon: number }> = {
  sm: { wrapper: "px-4 py-2 rounded-lg gap-2",    text: "text-xs", icon: 13 },
  md: { wrapper: "px-5 py-3 rounded-xl gap-3",    text: "text-sm", icon: 15 },
  lg: { wrapper: "px-6 py-4 rounded-2xl gap-3.5", text: "text-base", icon: 17 },
};