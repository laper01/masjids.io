// components/builder/DonationBanner/types.ts

export type DonationTheme  = "emerald" | "slate" | "amber" | "sky" | "rose";
export type DonationLayout = "banner" | "card";

export interface DonationBannerProps {
  /** Banner heading */
  title?: string;
  /** Supporting description */
  description?: string;
  /** CTA button label */
  buttonLabel?: string;
  /** Goal amount label e.g. "Goal: $50,000" */
  goal?: string;
  /** Amount raised label e.g. "Raised: $32,000" */
  raised?: string;
  /** Progress percentage 0–100 (shows progress bar when > 0) */
  progress?: number;
  /** Color theme */
  theme?: DonationTheme;
  /** Layout style */
  layout?: DonationLayout;
  /** Free Tailwind override */
  className?: string;
}