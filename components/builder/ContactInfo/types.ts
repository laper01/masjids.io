// components/builder/ContactInfo/types.ts

export type ContactTheme  = "emerald" | "slate" | "amber" | "sky";
export type ContactLayout = "list" | "grid";

export interface ContactInfoProps {
  /** Section title */
  title?: string;
  /** Street address */
  address?: string;
  /** Phone number */
  phone?: string;
  /** Email address */
  email?: string;
  /** Office / general hours */
  hours?: string;
  /** Color theme */
  theme?: ContactTheme;
  /** Display layout */
  layout?: ContactLayout;
  /** Show icon per row */
  showIcons?: boolean;
  /** Free Tailwind override */
  className?: string;
}