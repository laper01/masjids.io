// components/builder/CoverPhoto/constants.ts

import type { CoverPhotoAspect, CoverPhotoRadius, CoverPhotoOverlay } from "./types";

export const ASPECT_STYLE: Record<CoverPhotoAspect, React.CSSProperties> = {
  video:    { aspectRatio: "16 / 9" },
  wide:     { aspectRatio: "21 / 9" },
  square:   { aspectRatio: "1 / 1" },
  portrait: { aspectRatio: "3 / 4" },
};

export const RADIUS_CLASS: Record<CoverPhotoRadius, string> = {
  none: "rounded-none",
  sm:   "rounded-sm",
  md:   "rounded-md",
  lg:   "rounded-xl",
  xl:   "rounded-2xl",
};

export const OVERLAY_CLASS: Record<CoverPhotoOverlay, string> = {
  none:     "",
  light:    "bg-white/30",
  dark:     "bg-black/40",
  gradient: "bg-gradient-to-t from-black/60 via-transparent to-transparent",
};