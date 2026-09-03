// components/builder/ContactInfo/index.tsx
"use client";

import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { THEME_STYLE, LAYOUT_CLASS } from "./constants";
import type { ContactInfoProps } from "./types";

/**
 * ContactInfo — displays masjid contact details with icons.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "ContactInfo" }
 *
 * Leaf node — no slot, no children.
 * Only rows with non-empty values are rendered.
 *
 * Props:
 *  - title     → section heading
 *  - address   → street address
 *  - phone     → phone number
 *  - email     → email address
 *  - hours     → office / general hours
 *  - theme     → "emerald" | "slate" | "amber" | "sky"
 *  - layout    → "list" | "grid"
 *  - showIcons → show icon per row
 *  - className → free Tailwind override
 */
export default function ContactInfo({
  title     = "Contact Us",
  address   = "123 Main St, Dearborn, MI 48126",
  phone     = "+1 (313) 000-0000",
  email     = "info@masjid.org",
  hours     = "Mon–Fri: 9 AM – 6 PM",
  theme     = "emerald",
  layout    = "list",
  showIcons = true,
  className = "",
}: ContactInfoProps) {
  const s = THEME_STYLE[theme];

  const wrapClass = className.trim()
    ? className.trim()
    : `p-5 ${s.card}`;

  const rows: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }[] = [
    { icon: MapPin, label: "Address", value: address },
    { icon: Phone,  label: "Phone",   value: phone   },
    { icon: Mail,   label: "Email",   value: email   },
    { icon: Clock,  label: "Hours",   value: hours   },
  ].filter((r) => r.value.trim() !== "");

  return (
    <div className={wrapClass}>
      {title && (
        <h3 className={`text-sm font-bold ${s.title} mb-1`}>{title}</h3>
      )}

      <div className={LAYOUT_CLASS[layout]}>
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg ${s.itemBg}`}>
            {showIcons && (
              <Icon size={14} className={`flex-shrink-0 mt-0.5 ${s.icon}`} />
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${s.label}`}>
                {label}
              </span>
              <span className={`text-xs font-medium leading-snug break-words ${s.value}`}>
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}