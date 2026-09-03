// components/builder/Button/constants.ts

import type { ButtonVariant, ButtonColor, ButtonSize, ButtonShape, ButtonAlign } from "./types";

/**
 * Color × variant matrix.
 * Each color defines all 4 variants: solid, soft, outline, ghost.
 * Structure: COLOR_VARIANT_CLASS[color][variant]
 */
export const COLOR_VARIANT_CLASS: Record<
  ButtonColor,
  Record<ButtonVariant, string>
> = {
  emerald: {
    solid:   "bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700",
    soft:    "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
    outline: "bg-transparent text-emerald-600 border border-emerald-500 hover:bg-emerald-50",
    ghost:   "bg-transparent text-emerald-600 border border-transparent hover:bg-emerald-50",
  },
  slate: {
    solid:   "bg-slate-800 text-white border border-slate-800 hover:bg-slate-900 hover:border-slate-900",
    soft:    "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200",
    outline: "bg-transparent text-slate-700 border border-slate-400 hover:bg-slate-50",
    ghost:   "bg-transparent text-slate-600 border border-transparent hover:bg-slate-100",
  },
  amber: {
    solid:   "bg-amber-500 text-white border border-amber-500 hover:bg-amber-600 hover:border-amber-600",
    soft:    "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100",
    outline: "bg-transparent text-amber-600 border border-amber-400 hover:bg-amber-50",
    ghost:   "bg-transparent text-amber-600 border border-transparent hover:bg-amber-50",
  },
  rose: {
    solid:   "bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 hover:border-rose-700",
    soft:    "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100",
    outline: "bg-transparent text-rose-600 border border-rose-400 hover:bg-rose-50",
    ghost:   "bg-transparent text-rose-600 border border-transparent hover:bg-rose-50",
  },
  sky: {
    solid:   "bg-sky-500 text-white border border-sky-500 hover:bg-sky-600 hover:border-sky-600",
    soft:    "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100",
    outline: "bg-transparent text-sky-600 border border-sky-400 hover:bg-sky-50",
    ghost:   "bg-transparent text-sky-600 border border-transparent hover:bg-sky-50",
  },
  violet: {
    solid:   "bg-violet-600 text-white border border-violet-600 hover:bg-violet-700 hover:border-violet-700",
    soft:    "bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100",
    outline: "bg-transparent text-violet-600 border border-violet-500 hover:bg-violet-50",
    ghost:   "bg-transparent text-violet-600 border border-transparent hover:bg-violet-50",
  },
};

/** Font size + padding per size */
export const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-base px-6 py-3 gap-2.5",
};

/** Border radius per shape */
export const SHAPE_CLASS: Record<ButtonShape, string> = {
  rounded: "rounded-lg",
  pill:    "rounded-full",
  square:  "rounded-none",
};

/** Alignment wrapper class when not fullWidth */
export const ALIGN_CLASS: Record<ButtonAlign, string> = {
  left:   "self-start",
  center: "self-center",
  right:  "self-end",
};

/** Shared base classes applied to every button */
export const BASE_CLASS =
  "inline-flex items-center justify-center font-medium transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/** Disabled state — appended when disabled=true */
export const DISABLED_CLASS = "opacity-50 cursor-not-allowed pointer-events-none";