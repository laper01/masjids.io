"use client";

import { motion } from "framer-motion";

// Footer navigation columns
const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: ["Core Features", "Integrations", "Security", "API Docs"],
  },
  {
    heading: "Governance",
    links: ["Trust Engine", "Elections", "Compliance"],
  },
  {
    heading: "Community",
    links: ["Directory", "Leaderboard", "Impact Stories"],
  },
  {
    heading: "Legal",
    links: ["Privacy", "Terms", "Ethical Policy"],
  },
] as const;

// Social icon buttons
const SOCIAL_ICONS = [
  { icon: "public", label: "Visit our website" },
  { icon: "mail", label: "Send us an email" },
  { icon: "hub", label: "Join our network" },
] as const;

// --- Footer Component ---
export default function Footer() {
  return (
    <footer
      className="bg-slate-50 w-full py-24 px-8 border-t border-slate-200"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto">
        {/* Main footer grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-16 mb-20 font-body text-sm leading-relaxed">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-1">
            <a
              href="#"
              className="text-2xl font-extrabold text-slate-900 mb-8 font-headline tracking-tighter block"
              aria-label="masjids.io — home"
            >
              masjids.io
            </a>
            <p className="text-slate-500 mb-8 max-w-xs font-medium">
              Empowering sacred communities through world-class technology and
              transparent governance.
            </p>

            {/* Social links */}
            <div className="flex gap-5" role="list" aria-label="Social links">
              {SOCIAL_ICONS.map(({ icon, label }) => (
                <a
                  key={label}
                  href="#"
                  role="listitem"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Navigation columns */}
          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <nav key={heading} aria-label={`${heading} links`}>
              <h5 className="font-bold text-slate-900 mb-6 uppercase text-[10px] tracking-widest">
                {heading}
              </h5>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-slate-500 hover:text-primary transition-colors font-medium focus-visible:outline-none focus-visible:underline"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            © 2024 masjids.io — A Sanctuary Venture
          </p>

          {/* Operational status indicator */}
          <div
            className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest"
            role="status"
            aria-label="All systems operational"
          >
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
              aria-hidden="true"
            />
            Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
}
