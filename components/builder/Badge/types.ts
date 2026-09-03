// components/builder/Badge/types.ts

export type BadgeVariant = "solid" | "soft" | "outline";

export type BadgeColor =
  | "emerald"
  | "slate"
  | "amber"
  | "rose"
  | "sky"
  | "violet"
  | "orange";

export type BadgeSize = "sm" | "md" | "lg";

export type BadgeShape = "rounded" | "pill";

export interface BadgeProps {
  /** Text label displayed inside the badge */
  label?: string;
  /** Visual style: solid fill, soft tinted, or outline only */
  variant?: BadgeVariant;
  /** Color theme of the badge */
  color?: BadgeColor;
  /** Size of the badge */
  size?: BadgeSize;
  /** Border radius shape */
  shape?: BadgeShape;
  /** Free Tailwind override — replaces all presets when provided */
  className?: string;
}