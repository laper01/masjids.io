/**
 * components/builder/registry.tsx
 *
 * ─── COMPONENT REGISTRY ───────────────────────────────────────────────────────
 *
 * Single source of truth for every component in the Page Builder.
 * To add a new custom component:
 *
 *  1. Create your component folder:
 *       components/builder/MyComponent/
 *         ├── index.tsx      ← React component (default export)
 *         ├── types.ts       ← Props interface
 *         └── constants.ts   ← Preset maps (optional)
 *
 *  2. Import it below and add one entry to REGISTRY.
 *
 *  3. Done — palette, canvas, layer tree, and inspector all update automatically.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RegistryEntry fields:
 *   id           Unique string key (matches CanvasNode.componentId)
 *   name         Display name in palette + inspector
 *   icon         Lucide icon shown in palette + layer tree
 *   category     Palette group: "Layout" | "Typography" | "Media" | "UI" | "Masjid"
 *   isSlot       true → renders children; false → leaf node
 *   defaultProps Prop values on first drop to canvas
 *   fields       Inspector field definitions (drives right panel)
 *   Component    The actual React component rendered on canvas
 *
 * Field types:
 *   "text"   → free text input
 *   "number" → numeric input
 *   "color"  → color picker + hex input
 *   "select" → dropdown with options[]
 */

import React from "react";
import {
  Square,
  Type,
  AlignLeft,
  SeparatorHorizontal,
  Image as ImageIcon,
  Tag,
  MousePointerClick,
  LayoutGrid,
  Rows3,
  MoveVertical,
  Bell,
  Moon,
  Building2,
  Images,
  Megaphone,
  Share2,
  Phone,
  CalendarDays,
  Heart,
  BookOpen,
} from "lucide-react";

// ── Component imports ─────────────────────────────────────────────────────────
import ContainerComponent      from "./Container";
import TextComponent           from "./Text";
import HeadingComponent        from "./Heading";
import CardComponent           from "./Card";
import BadgeComponent          from "./Badge";
import ButtonComponent         from "./Button";
import DividerComponent        from "./Divider";
import SpacerComponent         from "./Spacer";
import ImageComponent          from "./Image";
import SectionComponent        from "./Section";
import AlertComponent          from "./Alert";
import PrayerTimesCardComponent from "./PrayerTimesCard";
 
import CoverPhotoComponent   from "./CoverPhoto";
import GalleryGridComponent  from "./GalleryGrid";
import FacilityInfoComponent from "./FacilityInfo";

import AnnouncementBarComponent from "./AnnouncementBar";
import SocialLinksComponent from "./SocialLinks";
import QuoteBlockComponent from "./QuoteBlock";
import ContactInfoComponent from "./ContactInfo";
import EventCardComponent from "./EventCard";
import DonationBannerComponent from "./DonationBanner";



// ── Heading preset keys (stay in sync with Heading/constants.ts) ──────────────
import { LEVEL_SIZE, PRESET_WEIGHT, COLOR_CLASS as HEADING_COLORS } from "./Heading/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType = "text" | "number" | "color" | "select";

export interface InspectorField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export type ComponentCategory = "Layout" | "Typography" | "Media" | "UI" | "Masjid";

export interface RegistryEntry {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: ComponentCategory;
  isSlot: boolean;
  defaultProps: Record<string, string | number | boolean>;
  fields: InspectorField[];
  Component: React.ComponentType<any>;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const REGISTRY: RegistryEntry[] = [

  // ── Layout ──────────────────────────────────────────────────────────────────

  {
    id: "section",
    name: "Section",
    icon: <Rows3 size={14} />,
    category: "Layout",
    isSlot: true,
    defaultProps: {
      background: "#ffffff",
      padding:    "md",
      maxWidth:   "lg",
      align:      "left",
      minHeight:  0,
      className:  "",
    },
    fields: [
      { key: "background", label: "Background", type: "color" },
      { key: "padding",    label: "Padding",    type: "select", options: ["none", "sm", "md", "lg", "xl"] },
      { key: "maxWidth",   label: "Max width",  type: "select", options: ["sm", "md", "lg", "xl", "full"] },
      { key: "align",      label: "Align",      type: "select", options: ["left", "center", "right"] },
      { key: "minHeight",  label: "Min height", type: "number" },
      { key: "className",  label: "Class",      type: "text" },
    ],
    Component: SectionComponent,
  },

  {
    id: "container",
    name: "Container",
    icon: <Square size={14} />,
    category: "Layout",
    isSlot: true,
    defaultProps: { className: "p-4 flex flex-col gap-4" },
    fields: [
      { key: "className", label: "Class", type: "text" },
    ],
    Component: ContainerComponent,
  },

  {
    id: "divider",
    name: "Divider",
    icon: <SeparatorHorizontal size={14} />,
    category: "Layout",
    isSlot: false,
    defaultProps: {
      style:     "solid",
      color:     "#e2e8f0",
      thickness: 1,
      spacing:   "md",
      label:     "",
      className: "",
    },
    fields: [
      { key: "style",     label: "Style",     type: "select", options: ["solid", "dashed", "dotted"] },
      { key: "color",     label: "Color",     type: "color" },
      { key: "thickness", label: "Thickness", type: "number" },
      { key: "spacing",   label: "Spacing",   type: "select", options: ["sm", "md", "lg", "xl"] },
      { key: "label",     label: "Label",     type: "text" },
      { key: "className", label: "Class",     type: "text" },
    ],
    Component: DividerComponent,
  },

  {
    id: "spacer",
    name: "Spacer",
    icon: <MoveVertical size={14} />,
    category: "Layout",
    isSlot: false,
    defaultProps: {
      size:         "md",
      customHeight: 0,
    },
    fields: [
      { key: "size",         label: "Size",          type: "select", options: ["xs", "sm", "md", "lg", "xl", "2xl"] },
      { key: "customHeight", label: "Custom px",     type: "number" },
    ],
    Component: SpacerComponent,
  },

  // ── Typography ───────────────────────────────────────────────────────────────

  {
    id: "heading",
    name: "Heading",
    icon: <AlignLeft size={14} />,
    category: "Typography",
    isSlot: false,
    defaultProps: {
      text:      "Heading",
      level:     2,
      preset:    "default",
      color:     "default",
      className: "",
    },
    fields: [
      { key: "text",      label: "Content", type: "text" },
      { key: "level",     label: "Level",   type: "select", options: Object.keys(LEVEL_SIZE) },
      { key: "preset",    label: "Preset",  type: "select", options: Object.keys(PRESET_WEIGHT) },
      { key: "color",     label: "Color",   type: "select", options: Object.keys(HEADING_COLORS) },
      { key: "className", label: "Class",   type: "text" },
    ],
    Component: HeadingComponent,
  },

  {
    id: "text",
    name: "Text",
    icon: <Type size={14} />,
    category: "Typography",
    isSlot: false,
    defaultProps: {
      value:     "Text content",
      className: "text-sm text-slate-700",
    },
    fields: [
      { key: "value",     label: "Content", type: "text" },
      { key: "className", label: "Class",   type: "text" },
    ],
    Component: TextComponent,
  },

  // ── Media ────────────────────────────────────────────────────────────────────

  {
    id: "image",
    name: "Image",
    icon: <ImageIcon size={14} />,
    category: "Media",
    isSlot: false,
    defaultProps: {
      src:          "",
      alt:          "",
      aspect:       "video",
      fit:          "cover",
      radius:       "lg",
      widthPercent: 100,
      className:    "",
    },
    fields: [
      { key: "src",          label: "Source URL",  type: "text" },
      { key: "alt",          label: "Alt text",    type: "text" },
      { key: "aspect",       label: "Aspect",      type: "select", options: ["auto", "square", "video", "wide", "portrait"] },
      { key: "fit",          label: "Object fit",  type: "select", options: ["cover", "contain", "fill"] },
      { key: "radius",       label: "Radius",      type: "select", options: ["none", "sm", "md", "lg", "xl", "full"] },
      { key: "widthPercent", label: "Width (%)",   type: "number" },
      { key: "className",    label: "Class",       type: "text" },
    ],
    Component: ImageComponent,
  },

  // ── UI ───────────────────────────────────────────────────────────────────────

  {
    id: "card",
    name: "Card",
    icon: <LayoutGrid size={14} />,
    category: "UI",
    isSlot: true,
    defaultProps: {
      title:     "",
      variant:   "default",
      color:     "white",
      shadow:    "sm",
      padding:   "md",
      className: "",
    },
    fields: [
      { key: "title",     label: "Title",   type: "text" },
      { key: "variant",   label: "Variant", type: "select", options: ["default", "outline", "filled"] },
      { key: "color",     label: "Color",   type: "select", options: ["white", "emerald", "slate", "amber", "rose"] },
      { key: "shadow",    label: "Shadow",  type: "select", options: ["none", "sm", "md", "lg"] },
      { key: "padding",   label: "Padding", type: "select", options: ["sm", "md", "lg"] },
      { key: "className", label: "Class",   type: "text" },
    ],
    Component: CardComponent,
  },

  {
    id: "badge",
    name: "Badge",
    icon: <Tag size={14} />,
    category: "UI",
    isSlot: false,
    defaultProps: {
      label:     "Badge",
      variant:   "soft",
      color:     "emerald",
      size:      "md",
      shape:     "pill",
      className: "",
    },
    fields: [
      { key: "label",     label: "Label",   type: "text" },
      { key: "variant",   label: "Variant", type: "select", options: ["solid", "soft", "outline"] },
      { key: "color",     label: "Color",   type: "select", options: ["emerald", "slate", "amber", "rose", "sky", "violet", "orange"] },
      { key: "size",      label: "Size",    type: "select", options: ["sm", "md", "lg"] },
      { key: "shape",     label: "Shape",   type: "select", options: ["rounded", "pill"] },
      { key: "className", label: "Class",   type: "text" },
    ],
    Component: BadgeComponent,
  },

  {
    id: "button",
    name: "Button",
    icon: <MousePointerClick size={14} />,
    category: "UI",
    isSlot: false,
    defaultProps: {
      label:     "Click me",
      variant:   "solid",
      color:     "emerald",
      size:      "md",
      shape:     "rounded",
      fullWidth: false,
      disabled:  false,
      className: "",
    },
    fields: [
      { key: "label",     label: "Label",      type: "text" },
      { key: "variant",   label: "Variant",    type: "select", options: ["solid", "soft", "outline", "ghost"] },
      { key: "color",     label: "Color",      type: "select", options: ["emerald", "slate", "amber", "rose", "sky", "violet"] },
      { key: "size",      label: "Size",       type: "select", options: ["sm", "md", "lg"] },
      { key: "shape",     label: "Shape",      type: "select", options: ["rounded", "pill", "square"] },
      { key: "fullWidth", label: "Full width", type: "select", options: ["false", "true"] },
      { key: "disabled",  label: "Disabled",   type: "select", options: ["false", "true"] },
      { key: "className", label: "Class",      type: "text" },
    ],
    Component: ButtonComponent,
  },

  {
    id: "alert",
    name: "Alert",
    icon: <Bell size={14} />,
    category: "UI",
    isSlot: false,
    defaultProps: {
      variant:     "info",
      title:       "Alert title",
      description: "",
      showIcon:    true,
      size:        "md",
      className:   "",
    },
    fields: [
      { key: "variant",     label: "Variant",     type: "select", options: ["info", "success", "warning", "error"] },
      { key: "title",       label: "Title",       type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "showIcon",    label: "Show icon",   type: "select", options: ["true", "false"] },
      { key: "size",        label: "Size",        type: "select", options: ["sm", "md", "lg"] },
      { key: "className",   label: "Class",       type: "text" },
    ],
    Component: AlertComponent,
  },

  // ── Masjid ───────────────────────────────────────────────────────────────────

  {
    id: "prayertimescard",
    name: "Prayer Times",
    icon: <Moon size={14} />,
    category: "Masjid",
    isSlot: false,
    defaultProps: {
      title:     "Prayer Times",
      fajr:      "05:10",
      dhuhr:     "12:20",
      asr:       "15:40",
      maghrib:   "18:05",
      isha:      "19:20",
      jumuah:    "",
      theme:     "emerald",
      layout:    "grid",
      className: "",
    },
    fields: [
      { key: "title",     label: "Title",   type: "text" },
      { key: "fajr",      label: "Fajr",    type: "text" },
      { key: "dhuhr",     label: "Dhuhr",   type: "text" },
      { key: "asr",       label: "Asr",     type: "text" },
      { key: "maghrib",   label: "Maghrib", type: "text" },
      { key: "isha",      label: "Isha",    type: "text" },
      { key: "jumuah",    label: "Jumuah",  type: "text" },
      { key: "theme",     label: "Theme",   type: "select", options: ["emerald", "slate", "amber", "sky"] },
      { key: "layout",    label: "Layout",  type: "select", options: ["grid", "row"] },
      { key: "className", label: "Class",   type: "text" },
    ],
    Component: PrayerTimesCardComponent,
  },


  {
    id: "coverphoto",
    name: "Cover Photo",
    icon: <ImageIcon size={14} />,
    category: "Masjid",
    isSlot: false,
    defaultProps: {
      aspect:       "video",
      radius:       "lg",
      overlay:      "none",
      showFallback: true,
      className:    "",
    },
    fields: [
      { key: "aspect",       label: "Aspect",    type: "select", options: ["video", "wide", "square", "portrait"] },
      { key: "radius",       label: "Radius",    type: "select", options: ["none", "sm", "md", "lg", "xl"] },
      { key: "overlay",      label: "Overlay",   type: "select", options: ["none", "light", "dark", "gradient"] },
      { key: "showFallback", label: "Fallback",  type: "select", options: ["true", "false"] },
      { key: "className",    label: "Class",     type: "text" },
    ],
    Component: CoverPhotoComponent,
  },
 
  {
    id: "gallerygrid",
    name: "Gallery",
    icon: <Images size={14} />,           // add: import { Images } from "lucide-react"
    category: "Masjid",
    isSlot: false,
    defaultProps: {
      columns:     3,
      gap:         "md",
      limit:       6,
      aspect:      "square",
      radius:      "md",
      showCaption: false,
      className:   "",
    },
    fields: [
      { key: "columns",     label: "Columns",  type: "select", options: ["2", "3", "4"] },
      { key: "gap",         label: "Gap",      type: "select", options: ["sm", "md", "lg"] },
      { key: "limit",       label: "Limit",    type: "number" },
      { key: "aspect",      label: "Aspect",   type: "select", options: ["square", "video", "auto"] },
      { key: "radius",      label: "Radius",   type: "select", options: ["none", "sm", "md", "lg"] },
      { key: "showCaption", label: "Captions", type: "select", options: ["false", "true"] },
      { key: "className",   label: "Class",    type: "text" },
    ],
    Component: GalleryGridComponent,
  },
 
  {
    id: "facilityinfo",
    name: "Facility Info",
    icon: <Building2 size={14} />,        // add: import { Building2 } from "lucide-react"
    category: "Masjid",
    isSlot: false,
    defaultProps: {
      title:     "Our Facilities",
      layout:    "list",
      theme:     "emerald",
      showIcons: true,
      className: "",
    },
    fields: [
      { key: "title",     label: "Title",      type: "text" },
      { key: "layout",    label: "Layout",     type: "select", options: ["list", "grid"] },
      { key: "theme",     label: "Theme",      type: "select", options: ["emerald", "slate", "amber", "sky"] },
      { key: "showIcons", label: "Show icons", type: "select", options: ["true", "false"] },
      { key: "className", label: "Class",      type: "text" },
    ],
    Component: FacilityInfoComponent,
  },

    {
    id: "announcementbar",
    name: "Announcement",
    icon: <Megaphone size={14} />,
    category: "UI",
    isSlot: false,
    defaultProps: {
      message:  "Friday prayer will begin at 12:30 PM. Please arrive early.",
      label:    "Notice",
      variant:  "info",
      size:     "md",
      showIcon: true,
      className: "",
    },
    fields: [
      { key: "message",   label: "Message",   type: "text" },
      { key: "label",     label: "Label",     type: "text" },
      { key: "variant",   label: "Variant",   type: "select", options: ["info", "success", "warning", "error", "neutral"] },
      { key: "size",      label: "Size",      type: "select", options: ["sm", "md", "lg"] },
      { key: "showIcon",  label: "Show icon", type: "select", options: ["true", "false"] },
      { key: "className", label: "Class",     type: "text" },
    ],
    Component: AnnouncementBarComponent,
  },
 
  {
    id: "sociallinks",
    name: "Social Links",
    icon: <Share2 size={14} />,
    category: "UI",
    isSlot: false,
    defaultProps: {
      instagram:   "",
      facebook:    "",
      youtube:     "",
      twitter:     "",
      whatsapp:    "",
      telegram:    "",
      tiktok:      "",
      website:     "",
      buttonStyle: "icon",
      size:        "md",
      align:       "left",
      className:   "",
    },
    fields: [
      { key: "instagram",   label: "Instagram",  type: "text" },
      { key: "facebook",    label: "Facebook",   type: "text" },
      { key: "youtube",     label: "YouTube",    type: "text" },
      { key: "twitter",     label: "X / Twitter",type: "text" },
      { key: "whatsapp",    label: "WhatsApp",   type: "text" },
      { key: "telegram",    label: "Telegram",   type: "text" },
      { key: "website",     label: "Website",    type: "text" },
      { key: "buttonStyle", label: "Style",      type: "select", options: ["icon", "pill", "card"] },
      { key: "size",        label: "Size",       type: "select", options: ["sm", "md", "lg"] },
      { key: "align",       label: "Align",      type: "select", options: ["left", "center", "right"] },
      { key: "className",   label: "Class",      type: "text" },
    ],
    Component: SocialLinksComponent,
  },
 
  {
    id: "contactinfo",
    name: "Contact Info",
    icon: <Phone size={14} />,
    category: "UI",
    isSlot: false,
    defaultProps: {
      title:     "Contact Us",
      address:   "123 Main St, Dearborn, MI 48126",
      phone:     "+1 (313) 000-0000",
      email:     "info@masjid.org",
      hours:     "Mon–Fri: 9 AM – 6 PM",
      theme:     "emerald",
      layout:    "list",
      showIcons: true,
      className: "",
    },
    fields: [
      { key: "title",     label: "Title",      type: "text" },
      { key: "address",   label: "Address",    type: "text" },
      { key: "phone",     label: "Phone",      type: "text" },
      { key: "email",     label: "Email",      type: "text" },
      { key: "hours",     label: "Hours",      type: "text" },
      { key: "theme",     label: "Theme",      type: "select", options: ["emerald", "slate", "amber", "sky"] },
      { key: "layout",    label: "Layout",     type: "select", options: ["list", "grid"] },
      { key: "showIcons", label: "Show icons", type: "select", options: ["true", "false"] },
      { key: "className", label: "Class",      type: "text" },
    ],
    Component: ContactInfoComponent,
  },
 
// ── Masjid — new entries ──────────────────────────────────────────────────────
 
  {
    id: "eventcard",
    name: "Event Card",
    icon: <CalendarDays size={14} />,
    category: "Masjid",
    isSlot: false,
    defaultProps: {
      title:       "Community Iftar Dinner",
      date:        "Friday, June 14 2026",
      time:        "7:00 PM",
      location:    "Main Hall",
      description: "",
      badge:       "Free",
      theme:       "emerald",
      layout:      "vertical",
      radius:      "lg",
      className:   "",
    },
    fields: [
      { key: "title",       label: "Title",       type: "text" },
      { key: "date",        label: "Date",        type: "text" },
      { key: "time",        label: "Time",        type: "text" },
      { key: "location",    label: "Location",    type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "badge",       label: "Badge",       type: "text" },
      { key: "theme",       label: "Theme",       type: "select", options: ["emerald", "slate", "amber", "sky", "rose"] },
      { key: "layout",      label: "Layout",      type: "select", options: ["vertical", "horizontal"] },
      { key: "radius",      label: "Radius",      type: "select", options: ["none", "sm", "md", "lg", "xl"] },
      { key: "className",   label: "Class",       type: "text" },
    ],
    Component: EventCardComponent,
  },
 
  {
    id: "donationbanner",
    name: "Donation",
    icon: <Heart size={14} />,
    category: "Masjid",
    isSlot: false,
    defaultProps: {
      title:       "Support Our Masjid",
      description: "Your donation helps us maintain our facilities and serve the community.",
      buttonLabel: "Donate Now",
      goal:        "Goal: $50,000",
      raised:      "Raised: $32,000",
      progress:    64,
      theme:       "emerald",
      layout:      "banner",
      className:   "",
    },
    fields: [
      { key: "title",       label: "Title",       type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "buttonLabel", label: "Button",      type: "text" },
      { key: "goal",        label: "Goal",        type: "text" },
      { key: "raised",      label: "Raised",      type: "text" },
      { key: "progress",    label: "Progress %",  type: "number" },
      { key: "theme",       label: "Theme",       type: "select", options: ["emerald", "slate", "amber", "sky", "rose"] },
      { key: "layout",      label: "Layout",      type: "select", options: ["banner", "card"] },
      { key: "className",   label: "Class",       type: "text" },
    ],
    Component: DonationBannerComponent,
  },
 
  {
    id: "quoteblock",
    name: "Quote / Verse",
    icon: <BookOpen size={14} />,
    category: "Masjid",
    isSlot: false,
    defaultProps: {
      arabic:        "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
      translation:   "Indeed, with hardship comes ease.",
      source:        "Surah Ash-Sharh 94:6",
      theme:         "emerald",
      layout:        "centered",
      showQuoteMark: true,
      className:     "",
    },
    fields: [
      { key: "arabic",        label: "Arabic",      type: "text" },
      { key: "translation",   label: "Translation", type: "text" },
      { key: "source",        label: "Source",      type: "text" },
      { key: "theme",         label: "Theme",       type: "select", options: ["emerald", "slate", "amber", "sky", "rose"] },
      { key: "layout",        label: "Layout",      type: "select", options: ["centered", "left", "card"] },
      { key: "showQuoteMark", label: "Quote mark",  type: "select", options: ["true", "false"] },
      { key: "className",     label: "Class",       type: "text" },
    ],
    Component: QuoteBlockComponent,
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const REGISTRY_MAP = Object.fromEntries(
  REGISTRY.map((entry) => [entry.id, entry])
) as Record<string, RegistryEntry>;

export const CATEGORY_ORDER: ComponentCategory[] = [
  "Layout",
  "Typography",
  "Media",
  "UI",
  "Masjid",
];