// components/builder/CoverPhoto/types.ts

export type CoverPhotoAspect  = "video" | "wide" | "square" | "portrait";
export type CoverPhotoRadius  = "none" | "sm" | "md" | "lg" | "xl";
export type CoverPhotoOverlay = "none" | "light" | "dark" | "gradient";

export interface CoverPhotoProps {
  /** Aspect ratio of the photo container */
  aspect?: CoverPhotoAspect;
  /** Border radius preset */
  radius?: CoverPhotoRadius;
  /** Overlay applied on top of the image */
  overlay?: CoverPhotoOverlay;
  /** Show a styled placeholder when no cover photo exists */
  showFallback?: boolean;
  /** Free Tailwind override */
  className?: string;
}