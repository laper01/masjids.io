// components/builder/SocialLinks/index.tsx
"use client";

import {
  Instagram, Facebook, Youtube, Twitter,
  MessageCircle, Send, Music2, Globe,
} from "lucide-react";
import { PLATFORM_CONFIG, SIZE_CLASS, ALIGN_CLASS } from "./constants";
import type { SocialLinksProps, SocialPlatform } from "./types";

const PLATFORM_ICON: Record<SocialPlatform, React.ComponentType<{ size?: number; className?: string }>> = {
  instagram: Instagram,
  facebook:  Facebook,
  youtube:   Youtube,
  twitter:   Twitter,
  whatsapp:  MessageCircle,
  telegram:  Send,
  tiktok:    Music2,
  website:   Globe,
};

/**
 * SocialLinks — a row of social media icon buttons for the masjid's profiles.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "SocialLinks" }
 *
 * Leaf node — no slot, no children.
 * Only platforms with non-empty URLs are rendered.
 *
 * Props:
 *  - instagram / facebook / youtube / twitter / whatsapp / telegram / tiktok / website
 *    → URL strings; empty = hidden
 *  - buttonStyle → "icon" | "pill" | "card"
 *  - size        → "sm" | "md" | "lg"
 *  - align       → "left" | "center" | "right"
 *  - className   → free Tailwind override
 */
export default function SocialLinks({
  instagram = "",
  facebook  = "",
  youtube   = "",
  twitter   = "",
  whatsapp  = "",
  telegram  = "",
  tiktok    = "",
  website   = "",
  buttonStyle = "icon",
  size        = "md",
  align       = "left",
  className   = "",
}: SocialLinksProps) {
const links = (
  [
    { platform: "instagram" as SocialPlatform, url: instagram },
    { platform: "facebook"  as SocialPlatform, url: facebook  },
    { platform: "youtube"   as SocialPlatform, url: youtube   },
    { platform: "twitter"   as SocialPlatform, url: twitter   },
    { platform: "whatsapp"  as SocialPlatform, url: whatsapp  },
    { platform: "telegram"  as SocialPlatform, url: telegram  },
    { platform: "tiktok"    as SocialPlatform, url: tiktok    },
    { platform: "website"   as SocialPlatform, url: website   },
  ] satisfies { platform: SocialPlatform; url: string }[]
).filter((l) => l.url.trim() !== "");

  const sz = SIZE_CLASS[size];

  const wrapClass = className.trim()
    ? className.trim()
    : `flex flex-wrap gap-2 ${ALIGN_CLASS[align]}`;

  // Empty state in builder
  if (links.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-xs italic py-2">
        <Globe size={14} />
        Add social URLs in the inspector to show links
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      {links.map(({ platform, url }) => {
        const cfg  = PLATFORM_CONFIG[platform];
        const Icon = PLATFORM_ICON[platform];

        if (buttonStyle === "pill") {
          return (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 transition-colors ${cfg.bg} ${cfg.hover}`}
            >
              <Icon size={sz.icon} className={cfg.color} />
              <span className={`font-medium ${sz.text} ${cfg.color}`}>{cfg.label}</span>
            </a>
          );
        }

        if (buttonStyle === "card") {
          return (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 transition-colors min-w-[64px] ${cfg.bg} ${cfg.hover}`}
            >
              <Icon size={sz.icon} className={cfg.color} />
              <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
            </a>
          );
        }

        // Default: icon only
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={cfg.label}
            className={`flex items-center justify-center transition-colors ${sz.button} ${cfg.bg} ${cfg.hover} ${cfg.color}`}
          >
            <Icon size={sz.icon} />
          </a>
        );
      })}
    </div>
  );
}