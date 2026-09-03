// components/builder/GalleryGrid/constants.ts

import type { GalleryColumns, GalleryGap, GalleryRadius, GalleryAspect } from "./types";

export const COLUMNS_CLASS: Record<GalleryColumns, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export const GAP_CLASS: Record<GalleryGap, string> = {
  sm: "gap-1.5",
  md: "gap-3",
  lg: "gap-5",
};

export const RADIUS_CLASS: Record<GalleryRadius, string> = {
  none: "rounded-none",
  sm:   "rounded-sm",
  md:   "rounded-md",
  lg:   "rounded-xl",
};

export const ASPECT_STYLE: Record<GalleryAspect, React.CSSProperties> = {
  square: { aspectRatio: "1 / 1" },
  video:  { aspectRatio: "16 / 9" },
  auto:   {},
};