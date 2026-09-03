// components/builder/Divider/types.ts

export type DividerOrientation = "horizontal" | "vertical";
export type DividerStyle = "solid" | "dashed" | "dotted";
export type DividerSpacing = "sm" | "md" | "lg" | "xl";

export interface DividerProps {
  /** Line style */
  style?: DividerStyle;
  /** Color of the line */
  color?: string;
  /** Thickness in px */
  thickness?: number;
  /** Vertical margin above and below */
  spacing?: DividerSpacing;
  /** Optional centered label text */
  label?: string;
  /** Free Tailwind override */
  className?: string;
}