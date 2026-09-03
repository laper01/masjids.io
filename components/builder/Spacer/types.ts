// components/builder/Spacer/types.ts

export type SpacerSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface SpacerProps {
  /** Preset height */
  size?: SpacerSize;
  /** Custom height in px — overrides size when provided */
  customHeight?: number;
}