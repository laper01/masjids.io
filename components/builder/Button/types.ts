// components/builder/Button/types.ts

export type ButtonVariant = "solid" | "soft" | "outline" | "ghost";

export type ButtonColor =
  | "emerald"
  | "slate"
  | "amber"
  | "rose"
  | "sky"
  | "violet";

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonShape = "rounded" | "pill" | "square";

export type ButtonAlign = "left" | "center" | "right";

export interface ButtonProps {
  /** Text label displayed inside the button */
  label?: string;
  /** Visual style */
  variant?: ButtonVariant;
  /** Color theme */
  color?: ButtonColor;
  /** Button size */
  size?: ButtonSize;
  /** Border radius shape */
  shape?: ButtonShape;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button takes full width of its container */
  fullWidth?: boolean;
  /** Alignment when fullWidth is false */
  align?: ButtonAlign;
  /** Free Tailwind override — replaces all presets when provided */
  className?: string;
  /** Click handler — can be wired to Reka expressions */
  onClick?: () => void;
}