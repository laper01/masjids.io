// components/builder/Image/types.ts

export type ImageAspect = "auto" | "square" | "video" | "wide" | "portrait";
export type ImageFit    = "cover" | "contain" | "fill";
export type ImageRadius = "none" | "sm" | "md" | "lg" | "xl" | "full";

export interface ImageProps {
  /** Image URL */
  src?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Aspect ratio preset */
  aspect?: ImageAspect;
  /** Object-fit behaviour */
  fit?: ImageFit;
  /** Border radius preset */
  radius?: ImageRadius;
  /** Width as a percentage of the parent container */
  widthPercent?: number;
  /** Free Tailwind override */
  className?: string;
}