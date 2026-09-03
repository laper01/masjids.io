"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Globe, Clock, Heart } from "lucide-react";

/* ─── Builder Preview Mock ───────────────────────────────────────── */
function BuilderPreview() {
  const pages = [
    { label: "Hero Section", active: false },
    { label: "Prayer Times", active: true },
    { label: "Donation Card", active: false },
    { label: "Map View", active: false },
  ];

  return (
    <div className="relative" aria-hidden="true">
      {/* Studio workspace */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
        {/* Header bar */}
        <div className="bg-neutral-50 border-b border-neutral-100 px-4 py-3 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-[11px] text-neutral-400 font-medium">Studio Workspace</span>
        </div>

        <div className="flex gap-0">
          {/* Sidebar */}
          <div className="w-40 border-r border-neutral-100 p-3 space-y-1">
            {pages.map((p) => (
              <div
                key={p.label}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-medium flex items-center gap-2 ${
                  p.active
                    ? "bg-brand-green text-white"
                    : "text-neutral-500 hover:bg-neutral-50"
                }`}
              >
                {p.active && <div className="w-1.5 h-1.5 rounded-full bg-white/70" />}
                {p.label}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <button className="w-full px-2.5 py-2 rounded-lg text-[11px] font-semibold text-white bg-neutral-900 text-center">
                Publish
              </button>
            </div>
          </div>

          {/* Preview area */}
          <div className="flex-1 p-3 bg-neutral-50/50">
            <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
              {/* Mock browser */}
              <div className="bg-neutral-900 px-3 py-2 flex items-center justify-between">
                <span className="text-[9px] text-white/40 font-mono">Islamic Center of New York</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
              </div>
              <div className="p-3 space-y-2">
                {/* Prayer time row */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-neutral-400">Fajr</span>
                  <div className="flex gap-2">
                    <span className="font-semibold text-neutral-700">5:28 AM</span>
                    <span className="text-neutral-300">→</span>
                    <span className="font-semibold text-neutral-700">1:12 PM</span>
                  </div>
                </div>
                <div className="h-px bg-neutral-50" />
                {/* CTA */}
                <button className="w-full py-1.5 rounded-lg bg-brand-green text-white text-[10px] font-semibold">
                  Support Us
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature bullet ─────────────────────────────────────────────── */
function FeatureBullet({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-neutral-600">
      <Icon size={15} className="text-brand-green shrink-0" aria-hidden="true" />
      {text}
    </li>
  );
}

/* ─── Builder Section ────────────────────────────────────────────── */
export default function BuilderSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="solutions"
      ref={ref}
      aria-labelledby="builder-heading"
      className="py-24 px-4 sm:px-6 bg-white"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Eyebrow */}
            <p className="text-[11px] font-semibold text-brand-green uppercase tracking-widest mb-4">
              No-Code Freedom
            </p>

            <h2
              id="builder-heading"
              className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight leading-tight"
            >
              Build your sanctuary&apos;s
              <br />
              home in minutes.
            </h2>

            <p className="mt-4 text-neutral-500 leading-relaxed max-w-md">
              The easiest way to launch a beautiful, prayer-integrated website.
              Drag. Drop. Connect. From automatic prayer time updates to integrated
              program registration.
            </p>

            {/* Bullets */}
            <ul className="mt-6 space-y-3" aria-label="Builder features">
              <FeatureBullet icon={Clock} text="Integrated Prayer Times API" />
              <FeatureBullet icon={Heart} text="One-click Donation Widgets" />
              <FeatureBullet icon={Globe} text="Auto-sync with Masjid directory" />
            </ul>

            <motion.a
              href="#builder"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 text-sm font-semibold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              Try the Builder
              <ArrowRight size={14} aria-hidden="true" />
            </motion.a>
          </motion.div>

          {/* Right: Builder preview */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <BuilderPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
