// components/builder/SocialLinks/constants.ts

import type { SocialPlatform, SocialSize, SocialAlign } from "./types";

export interface PlatformConfig {
  label:  string;
  color:  string;   // icon + pill accent color
  bg:     string;   // icon button background
  hover:  string;   // hover state
}

export const PLATFORM_CONFIG: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    color: "text-pink-600",
    bg:    "bg-pink-50",
    hover: "hover:bg-pink-100",
  },
  facebook: {
    label: "Facebook",
    color: "text-blue-600",
    bg:    "bg-blue-50",
    hover: "hover:bg-blue-100",
  },
  youtube: {
    label: "YouTube",
    color: "text-red-600",
    bg:    "bg-red-50",
    hover: "hover:bg-red-100",
  },
  twitter: {
    label: "X / Twitter",
    color: "text-slate-800",
    bg:    "bg-slate-100",
    hover: "hover:bg-slate-200",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
    hover: "hover:bg-emerald-100",
  },
  telegram: {
    label: "Telegram",
    color: "text-sky-600",
    bg:    "bg-sky-50",
    hover: "hover:bg-sky-100",
  },
  tiktok: {
    label: "TikTok",
    color: "text-slate-900",
    bg:    "bg-slate-100",
    hover: "hover:bg-slate-200",
  },
  website: {
    label: "Website",
    color: "text-violet-600",
    bg:    "bg-violet-50",
    hover: "hover:bg-violet-100",
  },
};

export const SIZE_CLASS: Record<SocialSize, { icon: number; button: string; text: string }> = {
  sm: { icon: 14, button: "w-8 h-8 rounded-lg",  text: "text-xs" },
  md: { icon: 18, button: "w-10 h-10 rounded-xl", text: "text-sm" },
  lg: { icon: 22, button: "w-12 h-12 rounded-2xl", text: "text-base" },
};

export const ALIGN_CLASS: Record<SocialAlign, string> = {
  left:   "justify-start",
  center: "justify-center",
  right:  "justify-end",
};