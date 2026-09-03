// components/builder/Heading/constants.ts

import type { HeadingLevel, HeadingPreset, HeadingColor } from "./types";

/**
 * Ukuran font per level (h1 → terbesar, h6 → terkecil).
 * User masih bisa override via className.
 */
export const LEVEL_SIZE: Record<HeadingLevel, string> = {
  1: "text-5xl",
  2: "text-4xl",
  3: "text-3xl",
  4: "text-2xl",
  5: "text-xl",
  6: "text-lg",
};

/**
 * Ketebalan font per preset.
 */
export const PRESET_WEIGHT: Record<HeadingPreset, string> = {
  default: "font-semibold",
  bold:    "font-extrabold",
  light:   "font-normal",
};

/**
 * Warna teks per pilihan color.
 */
export const COLOR_CLASS: Record<HeadingColor, string> = {
  default: "text-slate-900",
  emerald: "text-emerald-700",
  slate:   "text-slate-500",
  amber:   "text-amber-600",
  rose:    "text-rose-600",
  sky:     "text-sky-600",
  violet:  "text-violet-600",
};
