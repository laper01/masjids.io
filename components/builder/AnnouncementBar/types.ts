// components/builder/AnnouncementBar/types.ts

export type AnnouncementVariant = "info" | "success" | "warning" | "error" | "neutral";
export type AnnouncementSize    = "sm" | "md" | "lg";

export interface AnnouncementBarProps {
  /** Main announcement message */
  message?: string;
  /** Optional label/prefix shown before the message */
  label?: string;
  /** Semantic variant — controls color */
  variant?: AnnouncementVariant;
  /** Size */
  size?: AnnouncementSize;
  /** Show the left icon */
  showIcon?: boolean;
  /** Free Tailwind override */
  className?: string;
}