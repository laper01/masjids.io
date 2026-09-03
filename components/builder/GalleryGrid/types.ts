// components/builder/GalleryGrid/types.ts

export type GalleryColumns = 2 | 3 | 4;
export type GalleryGap     = "sm" | "md" | "lg";
export type GalleryRadius  = "none" | "sm" | "md" | "lg";
export type GalleryAspect  = "square" | "video" | "auto";

export interface GalleryGridProps {
  /** Number of columns in the grid */
  columns?: GalleryColumns;
  /** Gap between photos */
  gap?: GalleryGap;
  /** Max number of photos to display (1–10) */
  limit?: number;
  /** Aspect ratio of each photo cell */
  aspect?: GalleryAspect;
  /** Border radius of each photo */
  radius?: GalleryRadius;
  /** Show photo caption below each image */
  showCaption?: boolean;
  /** Free Tailwind override */
  className?: string;
}