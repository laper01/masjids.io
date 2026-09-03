// components/builder/Section/types.ts

export type SectionPadding  = "none" | "sm" | "md" | "lg" | "xl";
export type SectionAlign    = "left" | "center" | "right";
export type SectionMaxWidth = "sm" | "md" | "lg" | "xl" | "full";

export interface SectionProps {
  /** Background color (any CSS color) */
  background?: string;
  /** Vertical padding preset */
  padding?: SectionPadding;
  /** Content max-width constraint */
  maxWidth?: SectionMaxWidth;
  /** Horizontal alignment of inner content */
  align?: SectionAlign;
  /** Min height in px — useful for hero sections */
  minHeight?: number;
  /** Free Tailwind override */
  className?: string;
  /** Slot — accepts child components rendered by Reka */
  children?: React.ReactNode;
}