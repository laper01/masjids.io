// components/builder/Section/constants.ts

import type { SectionPadding, SectionAlign, SectionMaxWidth } from "./types";

export const PADDING_CLASS: Record<SectionPadding, string> = {
  none: "py-0 px-0",
  sm:   "py-8 px-4",
  md:   "py-16 px-6",
  lg:   "py-24 px-8",
  xl:   "py-32 px-8",
};

export const MAX_WIDTH_CLASS: Record<SectionMaxWidth, string> = {
  sm:   "max-w-xl",
  md:   "max-w-3xl",
  lg:   "max-w-5xl",
  xl:   "max-w-7xl",
  full: "max-w-full",
};

export const ALIGN_CLASS: Record<SectionAlign, string> = {
  left:   "items-start text-left",
  center: "items-center text-center",
  right:  "items-end text-right",
};