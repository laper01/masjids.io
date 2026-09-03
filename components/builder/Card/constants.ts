// components/builder/Card/constants.ts

import type { CardVariant, CardColor, CardShadow, CardPadding } from "./types";

/** Border + background combination per variant */
export const VARIANT_CLASS: Record<CardVariant, string> = {
  default: "border border-slate-200/60 bg-white",
  outline: "border-2 border-slate-300 bg-transparent",
  filled:  "border border-transparent",
};

/** Background color — only applied when variant is "filled" */
export const COLOR_CLASS: Record<CardColor, string> = {
  white:   "bg-white",
  emerald: "bg-emerald-50",
  slate:   "bg-slate-100",
  amber:   "bg-amber-50",
  rose:    "bg-rose-50",
};

/** Drop shadow per size */
export const SHADOW_CLASS: Record<CardShadow, string> = {
  none: "shadow-none",
  sm:   "shadow-sm",
  md:   "shadow-md",
  lg:   "shadow-lg",
};

/** Inner padding per size */
export const PADDING_CLASS: Record<CardPadding, string> = {
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

/** Title size — fixed, always semibold */
export const TITLE_CLASS = "text-base font-semibold text-slate-800 mb-3";
