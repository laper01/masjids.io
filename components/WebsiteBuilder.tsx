"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// Feature list items
const FEATURES = [
  { icon: "api", label: "Integrated Prayer Times API" },
  { icon: "volunteer_activism", label: "Native Donation Widgets" },
  { icon: "sync", label: "Live Content Synchronization" },
] as const;

// Studio component list
const STUDIO_COMPONENTS = [
  { icon: "grid_view", label: "Layout Grid", active: false },
  { icon: "schedule", label: "Prayer Module", active: true },
  { icon: "campaign", label: "Announcements", active: false },
] as const;

// --- WebsiteBuilder Section ---
export default function WebsiteBuilder() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-40 bg-white relative overflow-hidden"
      aria-labelledby="builder-heading"
    >
      {/* Ambient background glow */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-50/30 rounded-full blur-[120px] -ml-96"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-24">

          {/* Left — Copy */}
          <motion.div
            className="lg:w-5/12"
            initial={{ opacity: 0, x: -32 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase mb-6 block">
              No-Code Presence
            </span>
            <h2
              id="builder-heading"
              className="font-headline text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-8 tracking-tightest"
            >
              Your sanctuary&apos;s home in minutes.
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-10 font-medium">
              The easiest way to launch a beautiful, prayer-integrated website.
              Drag, drop, and connect to your community with professional-grade
              design tools.
            </p>

            {/* Feature list */}
            <ul className="space-y-6 mb-12" aria-label="Builder features">
              {FEATURES.map(({ icon, label }) => (
                <li key={label} className="flex items-center gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-primary transition-colors flex-shrink-0">
                    <span
                      className="material-symbols-outlined text-[18px] text-primary group-hover:text-white"
                      aria-hidden="true"
                    >
                      {icon}
                    </span>
                  </div>
                  <span className="text-slate-700 font-bold">{label}</span>
                </li>
              ))}
            </ul>

            <button
              className="bg-slate-900 text-white px-10 py-5 rounded-xl font-bold hover:bg-slate-800 transition-all premium-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 focus-visible:ring-offset-2"
              aria-label="Start building your masjid website"
            >
              Start Building Now
            </button>
          </motion.div>

          {/* Right — Builder mockup */}
          <motion.div
            className="lg:w-7/12 relative"
            initial={{ opacity: 0, x: 32 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <div className="flex gap-6 items-start">
              {/* Studio sidebar */}
              <div className="hidden sm:block w-80 bg-slate-50 rounded-2xl p-6 premium-shadow border border-slate-200/60 hover-lift">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                  Studio Components
                </p>
                <ul className="space-y-3" aria-label="Available studio components">
                  {STUDIO_COMPONENTS.map(({ icon, label, active }) => (
                    <li
                      key={label}
                      className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold cursor-pointer transition-all ${
                        active
                          ? "bg-primary text-white shadow-md"
                          : "bg-white border border-slate-200 text-slate-700 shadow-sm"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                        style={active ? {} : { color: "#94a3b8" }}
                      >
                        {icon}
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>

                {/* Publish button */}
                <div className="mt-10 pt-6 border-t border-slate-200">
                  <button
                    className="h-12 w-full bg-slate-900 rounded-xl flex items-center justify-center text-white text-xs font-bold tracking-widest uppercase cursor-pointer hover:bg-emerald-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
                    aria-label="Publish your website live"
                  >
                    Publish Live
                  </button>
                </div>
              </div>

              {/* Phone device mockup */}
              <div
                className="w-72 bg-slate-900 rounded-[3rem] p-4 border-[8px] border-slate-800 relative z-20 premium-shadow ring-1 ring-slate-700/50"
                aria-label="Mobile website preview"
              >
                <div className="bg-white rounded-[2.2rem] h-[520px] overflow-hidden flex flex-col">
                  {/* Hero image inside phone */}
                  <div className="h-40 relative flex-shrink-0">
                    <img
                      alt="Islamic Center of New York website preview"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAtw4duVub5YgFpwDjh18Y2W7owUNzYe9PSwl2cnpalaBDPgWjRj9xSOV1xKyrnzEKwxvM6_3NL6q3kmmiayoiRVO8IOL_p7FhDIvz7dDi_kivlG7p_LLowYHAoIptGAuenePyLTIyDbqr9kvI233Lm8JM4_KU1CDefblC2iaEfE_abYzK3OqJm0lxMLvlsP1-VO8Jynm5F_s8_F_eQOr1DGf1mt1wQzYj1ebsEu6sbAPtUA5ftlPWdqOLzTgWZGyoyNnGemLXU0Q"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-5">
                      <p className="text-white font-extrabold text-sm leading-tight">
                        Islamic Center of <br /> New York
                      </p>
                    </div>
                  </div>

                  {/* Phone content */}
                  <div className="p-5 flex-1 bg-white overflow-hidden">
                    {/* Prayer times */}
                    <div className="grid grid-cols-2 gap-2 mb-6" aria-label="Prayer times">
                      <div className="bg-emerald-50/50 p-3 rounded-xl text-center border border-emerald-100">
                        <p className="text-[8px] uppercase text-emerald-800 font-bold tracking-widest">
                          Asr
                        </p>
                        <p className="text-sm font-extrabold text-primary">4:45 PM</p>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded-xl text-center border border-emerald-100">
                        <p className="text-[8px] uppercase text-emerald-800 font-bold tracking-widest">
                          Maghrib
                        </p>
                        <p className="text-sm font-extrabold text-primary">7:12 PM</p>
                      </div>
                    </div>

                    {/* Content skeleton */}
                    <div className="space-y-3 mb-8" aria-hidden="true">
                      <div className="h-2 w-full bg-slate-100 rounded-full" />
                      <div className="h-2 w-5/6 bg-slate-100 rounded-full" />
                      <div className="h-2 w-4/6 bg-slate-100 rounded-full" />
                    </div>

                    {/* CTA */}
                    <button className="w-full bg-primary py-4 rounded-2xl text-center text-white text-[10px] font-bold tracking-widest uppercase shadow-lg hover:bg-emerald-900 transition-colors">
                      Support Us
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
