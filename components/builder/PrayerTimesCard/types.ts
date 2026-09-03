// components/builder/PrayerTimesCard/types.ts

export type PrayerTimesTheme = "emerald" | "slate" | "amber" | "sky";
export type PrayerTimesLayout = "row" | "grid";

export interface PrayerTimesCardProps {
  /** Card title */
  title?: string;
  /** Fajr prayer time */
  fajr?: string;
  /** Dhuhr prayer time */
  dhuhr?: string;
  /** Asr prayer time */
  asr?: string;
  /** Maghrib prayer time */
  maghrib?: string;
  /** Isha prayer time */
  isha?: string;
  /** Optional Jumuah time (shown only when provided) */
  jumuah?: string;
  /** Color theme of the card */
  theme?: PrayerTimesTheme;
  /** "row" = horizontal list, "grid" = 2-column grid */
  layout?: PrayerTimesLayout;
  /** Free Tailwind override */
  className?: string;
}