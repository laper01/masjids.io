// components/builder/Card/types.ts

export type CardVariant = "default" | "outline" | "filled";

export type CardColor = "white" | "emerald" | "slate" | "amber" | "rose";

export type CardShadow = "none" | "sm" | "md" | "lg";

export type CardPadding = "sm" | "md" | "lg";

export interface CardProps {
  /** Optional title displayed at the top of the card */
  title?: string;
  /** Visual style: border + background combination */
  variant?: CardVariant;
  /** Background color of the card */
  color?: CardColor;
  /** Drop shadow size */
  shadow?: CardShadow;
  /** Inner padding size */
  padding?: CardPadding;
  /** Free Tailwind override — overrides all presets when provided */
  className?: string;
  /** Slot — accepts child components rendered by Reka */
  children?: React.ReactNode;
}
