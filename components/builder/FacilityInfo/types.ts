// components/builder/FacilityInfo/types.ts

export type FacilityLayout = "list" | "grid";
export type FacilityTheme  = "emerald" | "slate" | "amber" | "sky";

export interface FacilityInfoProps {
  /** Title shown above the facility list */
  title?: string;
  /** Display layout */
  layout?: FacilityLayout;
  /** Color theme */
  theme?: FacilityTheme;
  /** Show icon per facility item */
  showIcons?: boolean;
  /** Free Tailwind override */
  className?: string;
}