// components/builder/templates/index.ts
//
// ─── PAGE TEMPLATE SYSTEM ────────────────────────────────────────────────────
//
// Templates are plain CanvasNode[] arrays — no Reka involvement.
// The canvas hydrates them directly via push() in useHistory.
//
// To add a new template:
//   1. Define a CanvasNode[] constant below
//   2. Add it to TEMPLATES array with metadata
//   3. Done — the picker modal shows it automatically
// ─────────────────────────────────────────────────────────────────────────────

import type { CanvasNode } from "@/app/(admin)/builder/page";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateCategory =
  | "Blank"
  | "Home"
  | "Prayer"
  | "Events"
  | "About"
  | "Donation"
  | "Ramadan"
  | "Contact";

export interface PageTemplate {
  id:          string;
  name:        string;
  description: string;
  category:    TemplateCategory;
  /** Emoji icon shown in the picker card */
  emoji:       string;
  /** Pre-built canvas tree */
  tree:        () => CanvasNode[];
}

// ─── ID generator (deterministic for templates) ───────────────────────────────

let _seq = 0;
function tid(): string {
  _seq++;
  return `tpl_${_seq.toString().padStart(4, "0")}`;
}

function resetSeq() { _seq = 0; }

// ─── Template: Blank ──────────────────────────────────────────────────────────

function blankTree(): CanvasNode[] {
  resetSeq();
  return [];
}

// ─── Template: Masjid Homepage ───────────────────────────────────────────────

function masjidHomeTree(): CanvasNode[] {
  resetSeq();
  return [
    // Hero cover photo
    {
      id: tid(), componentId: "coverphoto", name: "Cover Photo",
      props: { aspect: "video", radius: "lg", overlay: "gradient", showFallback: true, className: "" },
      children: [],
    },
    // Announcement bar
    {
      id: tid(), componentId: "announcementbar", name: "Announcement",
      props: {
        message: "Friday prayer begins at 12:30 PM. Please arrive early.",
        label: "Notice", variant: "info", size: "md", showIcon: true, className: "",
      },
      children: [],
    },
    // Welcome section
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Welcome to Our Masjid", level: 1, preset: "bold", color: "emerald", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "We are a community-centered masjid dedicated to worship, education, and service. All are welcome.", className: "text-base text-slate-600 max-w-2xl" },
          children: [],
        },
        {
          id: tid(), componentId: "button", name: "Button",
          props: { label: "Learn About Us", variant: "solid", color: "emerald", size: "lg", shape: "rounded", fullWidth: false, disabled: false, className: "" },
          children: [],
        },
      ],
    },
    // Prayer times
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Today's Prayer Times", level: 2, preset: "bold", color: "emerald", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "prayertimescard", name: "Prayer Times",
          props: { title: "Prayer Times", fajr: "05:10", dhuhr: "12:20", asr: "15:40", maghrib: "18:05", isha: "19:20", jumuah: "12:30", theme: "emerald", layout: "grid", className: "" },
          children: [],
        },
      ],
    },
    // Donation banner
    {
      id: tid(), componentId: "donationbanner", name: "Donation",
      props: { title: "Support Our Masjid", description: "Your generous donation helps us maintain our facilities and serve thousands of community members.", buttonLabel: "Donate Now", goal: "Goal: $100,000", raised: "Raised: $67,000", progress: 67, theme: "emerald", layout: "banner", className: "" },
      children: [],
    },
    // Social links section
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "md", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Stay Connected", level: 3, preset: "bold", color: "default", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "sociallinks", name: "Social Links",
          props: { instagram: "https://instagram.com", facebook: "https://facebook.com", youtube: "https://youtube.com", twitter: "", whatsapp: "", telegram: "", tiktok: "", website: "", buttonStyle: "pill", size: "md", align: "center", className: "" },
          children: [],
        },
      ],
    },
  ];
}

// ─── Template: Prayer Times Page ─────────────────────────────────────────────

function prayerTimesTree(): CanvasNode[] {
  resetSeq();
  return [
    // Hero heading section
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#064e3b", padding: "lg", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Prayer Times", level: 1, preset: "bold", color: "default", className: "text-white" },
          children: [],
        },
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "Daily prayer schedule for our masjid. Times are updated monthly.", className: "text-emerald-100 text-base" },
          children: [],
        },
      ],
    },
    // Prayer times card
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "md", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "prayertimescard", name: "Prayer Times",
          props: { title: "Daily Prayer Times", fajr: "05:10", dhuhr: "12:20", asr: "15:40", maghrib: "18:05", isha: "19:20", jumuah: "12:30", theme: "emerald", layout: "grid", className: "" },
          children: [],
        },
      ],
    },
    // Divider
    {
      id: tid(), componentId: "divider", name: "Divider",
      props: { style: "solid", color: "#e2e8f0", thickness: 1, spacing: "sm", label: "", className: "" },
      children: [],
    },
    // Quran verse
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "md", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "quoteblock", name: "Quote / Verse",
          props: { arabic: "أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَى غَسَقِ اللَّيْلِ", translation: "Establish prayer at the decline of the sun until the darkness of the night.", source: "Surah Al-Isra 17:78", theme: "emerald", layout: "centered", showQuoteMark: true, className: "" },
          children: [],
        },
      ],
    },
    // Announcement
    {
      id: tid(), componentId: "announcementbar", name: "Announcement",
      props: { message: "Prayer times are subject to change. Please check back monthly for updates.", label: "Note", variant: "info", size: "sm", showIcon: true, className: "" },
      children: [],
    },
  ];
}

// ─── Template: Events Page ────────────────────────────────────────────────────

function eventsTree(): CanvasNode[] {
  resetSeq();
  return [
    // Header section
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "badge", name: "Badge",
          props: { label: "Community Events", variant: "soft", color: "emerald", size: "md", shape: "pill", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Upcoming Events", level: 1, preset: "bold", color: "default", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "Join us for worship, education, and community gatherings throughout the month.", className: "text-slate-600 text-base" },
          children: [],
        },
      ],
    },
    // Announcement
    {
      id: tid(), componentId: "announcementbar", name: "Announcement",
      props: { message: "Registration required for some events. Contact us to reserve your spot.", label: "Info", variant: "info", size: "md", showIcon: true, className: "" },
      children: [],
    },
    // Events grid section
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "eventcard", name: "Event Card",
          props: { title: "Community Iftar Dinner", date: "Friday, March 14 2026", time: "6:30 PM", location: "Main Hall", description: "Join us for a blessed community iftar. All are welcome.", badge: "Free", theme: "emerald", layout: "vertical", radius: "lg", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "spacer", name: "Spacer",
          props: { size: "sm", customHeight: 0 },
          children: [],
        },
        {
          id: tid(), componentId: "eventcard", name: "Event Card",
          props: { title: "Islamic Finance Workshop", date: "Saturday, March 22 2026", time: "10:00 AM", location: "Conference Room", description: "A practical introduction to halal financial planning.", badge: "Register", theme: "sky", layout: "vertical", radius: "lg", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "spacer", name: "Spacer",
          props: { size: "sm", customHeight: 0 },
          children: [],
        },
        {
          id: tid(), componentId: "eventcard", name: "Event Card",
          props: { title: "Youth Quran Competition", date: "Sunday, March 30 2026", time: "9:00 AM", location: "Main Hall", description: "Annual Quran recitation competition for youth ages 8–18.", badge: "Members", theme: "amber", layout: "vertical", radius: "lg", className: "" },
          children: [],
        },
      ],
    },
  ];
}

// ─── Template: About Page ─────────────────────────────────────────────────────

function aboutTree(): CanvasNode[] {
  resetSeq();
  return [
    // Cover photo
    {
      id: tid(), componentId: "coverphoto", name: "Cover Photo",
      props: { aspect: "wide", radius: "none", overlay: "dark", showFallback: true, className: "" },
      children: [],
    },
    // Mission section
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "badge", name: "Badge",
          props: { label: "Our Story", variant: "soft", color: "emerald", size: "md", shape: "pill", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "About Our Masjid", level: 1, preset: "bold", color: "default", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "Founded in 1985, our masjid has been a spiritual home and community hub for Muslims across the region. We are committed to serving our community through worship, education, and outreach.", className: "text-slate-600 text-base leading-relaxed" },
          children: [],
        },
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "Our doors are open to everyone. Whether you are a lifelong Muslim or simply curious about Islam, you are always welcome here.", className: "text-slate-600 text-base leading-relaxed" },
          children: [],
        },
      ],
    },
    // Quote
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "quoteblock", name: "Quote / Verse",
          props: { arabic: "وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا", translation: "And hold firmly to the rope of Allah all together and do not become divided.", source: "Surah Al-Imran 3:103", theme: "emerald", layout: "centered", showQuoteMark: true, className: "" },
          children: [],
        },
      ],
    },
    // Facilities section
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Our Facilities", level: 2, preset: "bold", color: "default", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "facilityinfo", name: "Facility Info",
          props: { title: "", layout: "grid", theme: "emerald", showIcons: true, className: "" },
          children: [],
        },
      ],
    },
// ── Contact Info section ────────────────────────────────────────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "w-full max-w-2xl" },
          children: [
            {
              id: tid(), componentId: "card", name: "Card",
              props: { title: "", variant: "default", color: "white", shadow: "sm", padding: "lg", className: "" },
              children: [
                {
                  id: tid(), componentId: "contactinfo", name: "Contact Info",
                  props: { title: "Visit Us", address: "123 Main St, Dearborn, MI 48126", phone: "+1 (313) 000-0000", email: "info@masjid.org", hours: "Mon–Fri: 9 AM – 6 PM", theme: "emerald", layout: "list", showIcons: true, className: "" },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },

    // ── Social Links section ────────────────────────────────────────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "w-full max-w-2xl" },
          children: [
            {
              id: tid(), componentId: "card", name: "Card",
              props: { title: "", variant: "default", color: "white", shadow: "sm", padding: "lg", className: "text-center" },
              children: [
                {
                  id: tid(), componentId: "heading", name: "Heading",
                  props: { text: "Stay Connected", level: 3, preset: "bold", color: "default", className: "mb-4" },
                  children: [],
                },
                {
                  id: tid(), componentId: "sociallinks", name: "Social Links",
                  props: { instagram: "https://instagram.com", facebook: "https://facebook.com", youtube: "https://youtube.com", twitter: "", whatsapp: "", telegram: "", tiktok: "", website: "", buttonStyle: "pill", size: "md", align: "center", className: "" },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

// ─── Template: Donation Page ──────────────────────────────────────────────────

function donationTree(): CanvasNode[] {
  resetSeq();
  return [
    // Hero
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#064e3b", padding: "lg", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Support Our Masjid", level: 1, preset: "bold", color: "default", className: "text-white" },
          children: [],
        },
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "Every contribution, large or small, helps us maintain our facilities, run our programs, and serve our community.", className: "text-emerald-100 text-base max-w-2xl" },
          children: [],
        },
      ],
    },
    // Main donation banner
    {
      id: tid(), componentId: "donationbanner", name: "Donation",
      props: { title: "Building Fund 2026", description: "Help us expand our prayer hall and educational facilities to serve more families.", buttonLabel: "Donate Now", goal: "Goal: $500,000", raised: "Raised: $312,000", progress: 62, theme: "emerald", layout: "card", className: "" },
      children: [],
    },
    // Quran verse
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "quoteblock", name: "Quote / Verse",
          props: { arabic: "مَّن ذَا الَّذِي يُقْرِضُ اللَّهَ قَرْضًا حَسَنًا فَيُضَاعِفَهُ لَهُ أَضْعَافًا كَثِيرَةً", translation: "Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?", source: "Surah Al-Baqarah 2:245", theme: "emerald", layout: "centered", showQuoteMark: true, className: "" },
          children: [],
        },
      ],
    },
    // Other campaigns
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Other Ways to Give", level: 2, preset: "bold", color: "default", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "donationbanner", name: "Donation",
          props: { title: "Zakat & Sadaqah", description: "Fulfil your Zakat obligation or give Sadaqah to those in need through our verified fund.", buttonLabel: "Give Zakat", goal: "", raised: "", progress: 0, theme: "amber", layout: "card", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "spacer", name: "Spacer",
          props: { size: "sm", customHeight: 0 },
          children: [],
        },
        {
          id: tid(), componentId: "donationbanner", name: "Donation",
          props: { title: "Ramadan Relief Fund", description: "Support families in need during the blessed month of Ramadan.", buttonLabel: "Donate", goal: "Goal: $25,000", raised: "Raised: $18,500", progress: 74, theme: "rose", layout: "card", className: "" },
          children: [],
        },
      ],
    },
    // Contact for bank transfer etc.
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "md", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "Prefer to donate by cheque or bank transfer? Contact us and we will send you our details.", className: "text-slate-600 text-sm text-center" },
          children: [],
        },
        {
          id: tid(), componentId: "contactinfo", name: "Contact Info",
          props: { title: "", address: "", phone: "+1 (313) 000-0000", email: "donate@masjid.org", hours: "", theme: "emerald", layout: "grid", showIcons: true, className: "" },
          children: [],
        },
      ],
    },
  ];
}

// ─── Template: Ramadan Page ───────────────────────────────────────────────────

function ramadanTree(): CanvasNode[] {
  resetSeq();
  return [
    // Hero
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#064e3b", padding: "xl", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Ramadan Mubarak", level: 1, preset: "bold", color: "default", className: "text-white" },
          children: [],
        },
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "May this blessed month bring peace, forgiveness, and blessings to you and your family.", className: "text-emerald-100 text-lg" },
          children: [],
        },
      ],
    },
    // Announcement
    {
      id: tid(), componentId: "announcementbar", name: "Announcement",
      props: { message: "Tarawih prayers begin after Isha every night throughout Ramadan.", label: "Ramadan", variant: "success", size: "md", showIcon: true, className: "" },
      children: [],
    },
    // Quran verse
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "lg", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "quoteblock", name: "Quote / Verse",
          props: { arabic: "شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ", translation: "The month of Ramadan in which was revealed the Quran, a guidance for the people.", source: "Surah Al-Baqarah 2:185", theme: "emerald", layout: "centered", showQuoteMark: true, className: "" },
          children: [],
        },
      ],
    },
    // Prayer times
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Ramadan Prayer Schedule", level: 2, preset: "bold", color: "emerald", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "prayertimescard", name: "Prayer Times",
          props: { title: "Prayer Times", fajr: "04:45", dhuhr: "12:20", asr: "15:30", maghrib: "18:15", isha: "19:30", jumuah: "12:30", theme: "emerald", layout: "grid", className: "" },
          children: [],
        },
      ],
    },
    // Donation

    // Events
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Ramadan Events", level: 2, preset: "bold", color: "default", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "eventcard", name: "Event Card",
          props: { title: "Community Iftar — Week 1", date: "Sunday, March 2 2026", time: "6:15 PM (Maghrib)", location: "Main Hall", description: "Open iftar for all. Bring family and friends.", badge: "Free", theme: "emerald", layout: "horizontal", radius: "lg", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "spacer", name: "Spacer",
          props: { size: "sm", customHeight: 0 },
          children: [],
        },
        {
          id: tid(), componentId: "eventcard", name: "Event Card",
          props: { title: "Laylatul Qadr Night Program", date: "Friday, March 27 2026", time: "10:00 PM", location: "Main Hall", description: "Special night program for the last 10 nights of Ramadan.", badge: "Special", theme: "sky", layout: "horizontal", radius: "lg", className: "" },
          children: [],
        },
      ],
    },
  ];
}

// ─── Template: Contact Page ───────────────────────────────────────────────────

function contactTree(): CanvasNode[] {
  resetSeq();
  return [
    // Hero
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "heading", name: "Heading",
          props: { text: "Contact Us", level: 1, preset: "bold", color: "default", className: "" },
          children: [],
        },
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "We would love to hear from you. Reach out for general enquiries, event bookings, or any other questions.", className: "text-slate-600 text-base" },
          children: [],
        },
      ],
    },
    // Contact details
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "contactinfo", name: "Contact Info",
          props: { title: "Our Details", address: "123 Main St, Dearborn, MI 48126", phone: "+1 (313) 000-0000", email: "info@masjid.org", hours: "Mon–Fri: 9 AM – 6 PM", theme: "emerald", layout: "list", showIcons: true, className: "" },
          children: [],
        },
      ],
    },
    // Divider
    {
      id: tid(), componentId: "divider", name: "Divider",
      props: { style: "solid", color: "#e2e8f0", thickness: 1, spacing: "sm", label: "Follow Us", className: "" },
      children: [],
    },
    // Social
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "md", maxWidth: "lg", align: "left", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "text", name: "Text",
          props: { value: "Follow us on social media for updates, announcements, and community news.", className: "text-slate-600 text-sm" },
          children: [],
        },
        {
          id: tid(), componentId: "sociallinks", name: "Social Links",
          props: { instagram: "https://instagram.com", facebook: "https://facebook.com", youtube: "https://youtube.com", twitter: "", whatsapp: "https://wa.me/1313000000", telegram: "", tiktok: "", website: "https://masjid.org", buttonStyle: "card", size: "md", align: "left", className: "" },
          children: [],
        },
      ],
    },
    // Alert
    {
      id: tid(), componentId: "announcementbar", name: "Announcement",
      props: { message: "For urgent matters, please call us directly. Emails are answered within 24 hours.", label: "Note", variant: "info", size: "sm", showIcon: true, className: "" },
      children: [],
    },
  ];
}

// ─── Template registry ────────────────────────────────────────────────────────


// ─── Template: Modern Landing (Premium Hero) ─────────────────────────────────

function modernLandingTree(): CanvasNode[] {
  resetSeq();
  return [
    // ── Full-bleed hero cover ──────────────────────────────────────────────
    {
      id: tid(), componentId: "coverphoto", name: "Cover Photo",
      props: { aspect: "wide", radius: "none", overlay: "gradient", showFallback: true, className: "" },
      children: [],
    },

    // ── Overlapping hero card ───────────────────────────────────────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "transparent", padding: "none", maxWidth: "full", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "relative z-10 -mt-24 mx-auto max-w-3xl bg-white rounded-3xl shadow-2xl px-8 py-10 flex flex-col items-center text-center gap-4 border border-slate-100" },
          children: [
            {
              id: tid(), componentId: "badge", name: "Badge",
              props: { label: "Est. 1985 · Open to All", variant: "soft", color: "emerald", size: "md", shape: "pill", className: "" },
              children: [],
            },
            {
              id: tid(), componentId: "heading", name: "Heading",
              props: { text: "A Place of Peace, Prayer & Community", level: 1, preset: "bold", color: "default", className: "text-3xl md:text-4xl" },
              children: [],
            },
            {
              id: tid(), componentId: "text", name: "Text",
              props: { value: "Five daily prayers, weekend classes, and a community that welcomes everyone — new Muslims, lifelong members, and curious visitors alike.", className: "text-slate-500 text-base max-w-xl" },
              children: [],
            },
            {
              id: tid(), componentId: "container", name: "Container",
              props: { className: "flex flex-wrap items-center justify-center gap-3 mt-2" },
              children: [
                { id: tid(), componentId: "button", name: "Button", props: { label: "Today's Prayer Times", variant: "solid", color: "emerald", size: "lg", shape: "pill", fullWidth: false, disabled: false, className: "" }, children: [] },
                { id: tid(), componentId: "button", name: "Button", props: { label: "Plan a Visit", variant: "outline", color: "emerald", size: "lg", shape: "pill", fullWidth: false, disabled: false, className: "" }, children: [] },
              ],
            },
          ],
        },
      ],
    },

    // ── Stat highlight strip — wider maxWidth, centered ────────────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl" },
          children: [
            { id: tid(), componentId: "card", name: "Card", props: { title: "", variant: "outline", color: "emerald", shadow: "none", padding: "md", className: "text-center" }, children: [
              { id: tid(), componentId: "heading", name: "Heading", props: { text: "5x", level: 3, preset: "bold", color: "emerald", className: "" }, children: [] },
              { id: tid(), componentId: "text", name: "Text", props: { value: "Daily Prayers", className: "text-xs text-slate-500" }, children: [] },
            ]},
            { id: tid(), componentId: "card", name: "Card", props: { title: "", variant: "outline", color: "sky", shadow: "none", padding: "md", className: "text-center" }, children: [
              { id: tid(), componentId: "heading", name: "Heading", props: { text: "1200+", level: 3, preset: "bold", color: "default", className: "" }, children: [] },
              { id: tid(), componentId: "text", name: "Text", props: { value: "Families Served", className: "text-xs text-slate-500" }, children: [] },
            ]},
            { id: tid(), componentId: "card", name: "Card", props: { title: "", variant: "outline", color: "amber", shadow: "none", padding: "md", className: "text-center" }, children: [
              { id: tid(), componentId: "heading", name: "Heading", props: { text: "40+", level: 3, preset: "bold", color: "default", className: "" }, children: [] },
              { id: tid(), componentId: "text", name: "Text", props: { value: "Years of Service", className: "text-xs text-slate-500" }, children: [] },
            ]},
            { id: tid(), componentId: "card", name: "Card", props: { title: "", variant: "outline", color: "rose", shadow: "none", padding: "md", className: "text-center" }, children: [
              { id: tid(), componentId: "heading", name: "Heading", props: { text: "Free", level: 3, preset: "bold", color: "default", className: "" }, children: [] },
              { id: tid(), componentId: "text", name: "Text", props: { value: "Weekend Classes", className: "text-xs text-slate-500" }, children: [] },
            ]},
          ],
        },
      ],
    },

    // ── Prayer times + Quote — badge fixed for dark bg contrast ────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#0b2e22", padding: "xl", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "w-full max-w-4xl" },
          children: [
            {
              id: tid(), componentId: "badge", name: "Badge",
              props: { label: "Today", variant: "solid", color: "emerald", size: "sm", shape: "pill", className: "mb-3 bg-emerald-400 !text-emerald-950" },
              children: [],
            },
            {
              id: tid(), componentId: "heading", name: "Heading",
              props: { text: "Prayer Times", level: 2, preset: "bold", color: "default", className: "text-white mb-5" },
              children: [],
            },
            {
              id: tid(), componentId: "container", name: "Container",
              props: { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch" },
              children: [
                { id: tid(), componentId: "prayertimescard", name: "Prayer Times", props: { title: "", fajr: "05:10", dhuhr: "12:20", asr: "15:40", maghrib: "18:05", isha: "19:20", jumuah: "12:30", theme: "emerald", layout: "grid", className: "" }, children: [] },
                { id: tid(), componentId: "quoteblock", name: "Quote / Verse", props: { arabic: "إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ", translation: "The believers are but brothers.", source: "Surah Al-Hujurat 49:10", theme: "emerald", layout: "card", showQuoteMark: true, className: "" }, children: [] },
              ],
            },
          ],
        },
      ],
    },

    // ── Facilities — full width to match other sections ────────────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "w-full max-w-4xl" },
          children: [
            { id: tid(), componentId: "heading", name: "Heading", props: { text: "Everything You Need, All in One Place", level: 2, preset: "bold", color: "default", className: "mb-5 text-center" }, children: [] },
            { id: tid(), componentId: "facilityinfo", name: "Facility Info", props: { title: "", layout: "grid", theme: "emerald", showIcons: true, className: "w-full" }, children: [] },
          ],
        },
      ],
    },

    // ── Gallery — same width discipline, tighter padding for empty state ───
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8fafc", padding: "lg", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "w-full max-w-4xl" },
          children: [
            {
              id: tid(), componentId: "container", name: "Container",
              props: { className: "flex items-end justify-between mb-5" },
              children: [
                { id: tid(), componentId: "heading", name: "Heading", props: { text: "A Glimpse Inside", level: 2, preset: "bold", color: "default", className: "" }, children: [] },
                { id: tid(), componentId: "badge", name: "Badge", props: { label: "Photo Gallery", variant: "soft", color: "slate", size: "sm", shape: "pill", className: "" }, children: [] },
              ],
            },
            { id: tid(), componentId: "gallerygrid", name: "Gallery", props: { columns: 3, gap: "md", limit: 6, aspect: "square", radius: "lg", showCaption: false, className: "" }, children: [] },
          ],
        },
      ],
    },

    // ── Reassurance alert ───────────────────────────────────────────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "md", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "w-full max-w-4xl" },
          children: [
            { id: tid(), componentId: "alert", name: "Alert", props: { variant: "success", title: "New to the masjid?", description: "Everyone is welcome — reach out anytime and our team will help you feel at home.", showIcon: true, size: "md", className: "" }, children: [] },
          ],
        },
      ],
    },

// ── Contact Info section ────────────────────────────────────────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#f8faf8", padding: "lg", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "w-full max-w-2xl" },
          children: [
            {
              id: tid(), componentId: "card", name: "Card",
              props: { title: "", variant: "default", color: "white", shadow: "sm", padding: "lg", className: "" },
              children: [
                {
                  id: tid(), componentId: "contactinfo", name: "Contact Info",
                  props: { title: "Visit Us", address: "123 Main St, Dearborn, MI 48126", phone: "+1 (313) 000-0000", email: "info@masjid.org", hours: "Mon–Fri: 9 AM – 6 PM", theme: "emerald", layout: "list", showIcons: true, className: "" },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },

    // ── Social Links section ────────────────────────────────────────────────
    {
      id: tid(), componentId: "section", name: "Section",
      props: { background: "#ffffff", padding: "lg", maxWidth: "xl", align: "center", minHeight: 0, className: "" },
      children: [
        {
          id: tid(), componentId: "container", name: "Container",
          props: { className: "w-full max-w-2xl" },
          children: [
            {
              id: tid(), componentId: "card", name: "Card",
              props: { title: "", variant: "default", color: "white", shadow: "sm", padding: "lg", className: "text-center" },
              children: [
                {
                  id: tid(), componentId: "heading", name: "Heading",
                  props: { text: "Stay Connected", level: 3, preset: "bold", color: "default", className: "mb-4" },
                  children: [],
                },
                {
                  id: tid(), componentId: "sociallinks", name: "Social Links",
                  props: { instagram: "https://instagram.com", facebook: "https://facebook.com", youtube: "https://youtube.com", twitter: "", whatsapp: "", telegram: "", tiktok: "", website: "", buttonStyle: "pill", size: "md", align: "center", className: "" },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

export const TEMPLATES: PageTemplate[] = [
  {
    id:          "blank",
    name:        "Blank Page",
    description: "Start from scratch with an empty canvas.",
    category:    "Blank",
    emoji:       "⬜",
    tree:        blankTree,
  },
  {
    id:          "modern-landing",
    name:        "Modern Landing",
    description: "A striking hero layout with overlapping card, stat highlights, and premium dark accents.",
    category:    "Home",
    emoji:       "✨",
    tree:        modernLandingTree,
  },
  {
    id:          "masjid-home",
    name:        "Masjid Homepage",
    description: "Full homepage with cover photo, prayer times, donation CTA, and social links.",
    category:    "Home",
    emoji:       "🕌",
    tree:        masjidHomeTree,
  },
  {
    id:          "prayer-times",
    name:        "Prayer Times",
    description: "Dedicated prayer schedule page with Quran verse and monthly note.",
    category:    "Prayer",
    emoji:       "🌙",
    tree:        prayerTimesTree,
  },
  {
    id:          "about",
    name:        "About Page",
    description: "Masjid story, facilities, contact info, and social links.",
    category:    "About",
    emoji:       "🏛️",
    tree:        aboutTree,
  },
  {
    id:          "ramadan",
    name:        "Ramadan Page",
    description: "Special Ramadan page with prayer schedule, events, and donation banner.",
    category:    "Ramadan",
    emoji:       "☪️",
    tree:        ramadanTree,
  },
  {
    id:          "contact",
    name:        "Contact Page",
    description: "Contact details, social links, and office hours.",
    category:    "Contact",
    emoji:       "📬",
    tree:        contactTree,
  },
];

export const TEMPLATE_MAP = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t])
) as Record<string, PageTemplate>;