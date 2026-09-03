// components/builder/Divider/constants.ts

import type { DividerSpacing, DividerStyle } from "./types";

export const SPACING_CLASS: Record<DividerSpacing, string> = {
  sm: "my-2",
  md: "my-4",
  lg: "my-8",
  xl: "my-12",
};

export const BORDER_STYLE: Record<DividerStyle, string> = {
  solid:  "border-solid",
  dashed: "border-dashed",
  dotted: "border-dotted",
};