// components/builder/EventCard/types.ts

export type EventCardTheme  = "emerald" | "slate" | "amber" | "sky" | "rose";
export type EventCardLayout = "vertical" | "horizontal";
export type EventCardRadius = "none" | "sm" | "md" | "lg" | "xl";

export interface EventCardProps {
  /** Event title */
  title?: string;
  /** Event date string e.g. "Friday, June 14 2026" */
  date?: string;
  /** Event time string e.g. "7:00 PM" */
  time?: string;
  /** Event location */
  location?: string;
  /** Short description */
  description?: string;
  /** Badge label e.g. "Open" | "Free" | "Members Only" */
  badge?: string;
  /** Color theme */
  theme?: EventCardTheme;
  /** Card layout direction */
  layout?: EventCardLayout;
  /** Border radius */
  radius?: EventCardRadius;
  /** Free Tailwind override */
  className?: string;
}