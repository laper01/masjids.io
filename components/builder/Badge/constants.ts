// components/builder/Badge/constants.ts

import type { BadgeVariant, BadgeColor, BadgeSize, BadgeShape } from "./types";

/**
 * Each color has 3 variant styles: solid, soft, outline.
 * Structure: COLOR_VARIANT_CLASS[color][variant]
 */
export const COLOR_VARIANT_CLASS: Record<
  BadgeColor,
  Record<BadgeVariant, string>
> = {
  emerald: {
    solid:   "bg-emerald-600 text-white border border-emerald-600",
    soft:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
    outline: "bg-transparent text-emerald-600 border border-emerald-500",
  },
  slate: {
    solid:   "bg-slate-700 text-white border border-slate-700",
    soft:    "bg-slate-100 text-slate-600 border border-slate-200",
    outline: "bg-transparent text-slate-600 border border-slate-400",
  },
  amber: {
    solid:   "bg-amber-500 text-white border border-amber-500",
    soft:    "bg-amber-50 text-amber-700 border border-amber-200",
    outline: "bg-transparent text-amber-600 border border-amber-400",
  },
  rose: {
    solid:   "bg-rose-600 text-white border border-rose-600",
    soft:    "bg-rose-50 text-rose-600 border border-rose-200",
    outline: "bg-transparent text-rose-600 border border-rose-400",
  },
  sky: {
    solid:   "bg-sky-500 text-white border border-sky-500",
    soft:    "bg-sky-50 text-sky-700 border border-sky-200",
    outline: "bg-transparent text-sky-600 border border-sky-400",
  },
  violet: {
    solid:   "bg-violet-600 text-white border border-violet-600",
    soft:    "bg-violet-50 text-violet-700 border border-violet-200",
    outline: "bg-transparent text-violet-600 border border-violet-400",
  },
  orange: {
    solid:   "bg-orange-500 text-white border border-orange-500",
    soft:    "bg-orange-50 text-orange-700 border border-orange-200",
    outline: "bg-transparent text-orange-600 border border-orange-400",
  },
};

/** Font size + padding per size */
export const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

/** Border radius per shape */
export const SHAPE_CLASS: Record<BadgeShape, string> = {
  rounded: "rounded-md",
  pill:    "rounded-full",
};