// components/builder/Alert/constants.ts

import type { AlertVariant, AlertSize } from "./types";

export interface AlertStyle {
  wrapper: string;
  icon: string;
  title: string;
  description: string;
  /** Lucide icon name to render */
  iconName: "info" | "check-circle" | "alert-triangle" | "x-circle";
}

export const VARIANT_STYLE: Record<AlertVariant, AlertStyle> = {
  info: {
    wrapper:     "bg-sky-50 border border-sky-200",
    icon:        "text-sky-500",
    title:       "text-sky-900",
    description: "text-sky-700",
    iconName:    "info",
  },
  success: {
    wrapper:     "bg-emerald-50 border border-emerald-200",
    icon:        "text-emerald-500",
    title:       "text-emerald-900",
    description: "text-emerald-700",
    iconName:    "check-circle",
  },
  warning: {
    wrapper:     "bg-amber-50 border border-amber-200",
    icon:        "text-amber-500",
    title:       "text-amber-900",
    description: "text-amber-700",
    iconName:    "alert-triangle",
  },
  error: {
    wrapper:     "bg-rose-50 border border-rose-200",
    icon:        "text-rose-500",
    title:       "text-rose-900",
    description: "text-rose-700",
    iconName:    "x-circle",
  },
};

export const SIZE_CLASS: Record<AlertSize, { wrapper: string; icon: number; title: string; desc: string }> = {
  sm: { wrapper: "p-3 rounded-lg gap-2.5",  icon: 15, title: "text-xs font-semibold", desc: "text-xs" },
  md: { wrapper: "p-4 rounded-xl gap-3",    icon: 18, title: "text-sm font-semibold", desc: "text-sm" },
  lg: { wrapper: "p-5 rounded-2xl gap-3.5", icon: 20, title: "text-base font-semibold", desc: "text-sm" },
};