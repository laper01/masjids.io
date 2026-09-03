// components/builder/SocialLinks/types.ts

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "youtube"
  | "twitter"
  | "whatsapp"
  | "telegram"
  | "tiktok"
  | "website";

export type SocialButtonStyle = "icon" | "pill" | "card";
export type SocialSize        = "sm" | "md" | "lg";
export type SocialAlign       = "left" | "center" | "right";

export interface SocialLinksProps {
  /** Instagram URL */
  instagram?: string;
  /** Facebook URL */
  facebook?: string;
  /** YouTube URL */
  youtube?: string;
  /** Twitter / X URL */
  twitter?: string;
  /** WhatsApp link or number */
  whatsapp?: string;
  /** Telegram link */
  telegram?: string;
  /** TikTok URL */
  tiktok?: string;
  /** Website URL */
  website?: string;
  /** Button visual style */
  buttonStyle?: SocialButtonStyle;
  /** Icon size */
  size?: SocialSize;
  /** Horizontal alignment */
  align?: SocialAlign;
  /** Free Tailwind override */
  className?: string;
}