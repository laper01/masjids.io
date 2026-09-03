// components/builder/Alert/types.ts

export type AlertVariant = "info" | "success" | "warning" | "error";
export type AlertSize    = "sm" | "md" | "lg";

export interface AlertProps {
  /** Semantic variant that controls color and icon */
  variant?: AlertVariant;
  /** Main alert title */
  title?: string;
  /** Supporting description text */
  description?: string;
  /** Show or hide the left icon */
  showIcon?: boolean;
  /** Size of the alert */
  size?: AlertSize;
  /** Free Tailwind override */
  className?: string;
}