// components/builder/Image/constants.ts

import type { ImageAspect, ImageFit, ImageRadius } from "./types";

export const ASPECT_STYLE: Record<ImageAspect, React.CSSProperties> = {
  auto:     {},
  square:   { aspectRatio: "1 / 1" },
  video:    { aspectRatio: "16 / 9" },
  wide:     { aspectRatio: "21 / 9" },
  portrait: { aspectRatio: "3 / 4" },
};

export const FIT_CLASS: Record<ImageFit, string> = {
  cover:   "object-cover",
  contain: "object-contain",
  fill:    "object-fill",
};

export const RADIUS_CLASS: Record<ImageRadius, string> = {
  none: "rounded-none",
  sm:   "rounded-sm",
  md:   "rounded-md",
  lg:   "rounded-xl",
  xl:   "rounded-2xl",
  full: "rounded-full",
};