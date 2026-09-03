"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Search, MapPin, Users, ChevronRight, CheckCircle2 } from "lucide-react";

/* ─── Mosque data ────────────────────────────────────────────────── */
const MOSQUES = [
  {
    id: "1",
    name: "Islamic Center of Frisco",
    location: "Frisco, Texas",
    members: "1,240",
    connectCode: "TX-ICF-001",
    color: "from-teal-400 to-emerald-500",
    verified: true,
  },
  {
    id: "2",
    name: "Cambridge Central",
    location: "Cambridge, UK",
    members: "890",
    connectCode: "UK-CAM-002",
    color: "from-sky-400 to-blue-500",
    verified: true,
  },
  {
    id: "3",
    name: "Assavvah Foundation",
    location: "London, UK",
    members: "2,100",
    connectCode: "UK-LON-003",
    color: "from-violet-400 to-purple-500",
    verified: true,
  },
] as const;

/* ─── Mosque card ────────────────────────────────────────────────── */
function MosqueCard({
  mosque,
  index,
  inView,
}: {
  mosque: (typeof MOSQUES)[number];
  index: number;
  inView: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.2 + index * 0.12, duration: 0.55, ease: "easeOut" }}
      className="mosque-card bg-white rounded-2xl border border-neutral-100 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-300 group"
      aria-label={`${mosque.name}, ${mosque.location}`}
    >
      {/* Image placeholder with gradient */}
      <div className="h-40 overflow-hidden relative">
        <div
          className={`mosque-card-image absolute inset-0 bg-gradient-to-br ${mosque.color} opacity-80`}
          aria-hidden="true"
        />
        {/* Mosque silhouette SVG */}
        <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-30" aria-hidden="true">
          <svg width="80" height="60" viewBox="0 0 80 60" fill="white">
            <path d="M40 0C30 0 22 8 22 18H58C58 8 50 0 40 0Z" />
            <rect x="10" y="15" width="6" height="25" rx="2" />
            <rect x="64" y="15" width="6" height="25" rx="2" />
            <rect x="14" y="18" width="52" height="22" rx="4" />
            <path d="M32 40V30C32 26.7 35.6 24 40 24C44.4 24 48 26.7 48 30V40H32Z" />
            <rect x="8" y="40" width="64" height="6" rx="2" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 leading-tight group-hover:text-brand-green transition-colors">
              {mosque.name}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-neutral-400" aria-hidden="true" />
              <span className="text-[11px] text-neutral-400">{mosque.location}</span>
            </div>
          </div>
          {mosque.verified && (
            <CheckCircle2
              size={16}
              className="text-brand-green shrink-0 mt-0.5"
              aria-label="Verified masjid"
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
              Connect Code
            </p>
            <p className="text-[11px] font-mono text-neutral-500">{mosque.connectCode}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">
              Members
            </p>
            <div className="flex items-center gap-1 justify-end">
              <Users size={10} className="text-neutral-400" aria-hidden="true" />
              <span className="text-[11px] font-medium text-neutral-600">{mosque.members}</span>
            </div>
          </div>
        </div>

        <a
          href={`#masjid-${mosque.id}`}
          className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-brand-green hover:text-brand-green-dark transition-colors"
        >
          View Details
          <ChevronRight size={12} aria-hidden="true" />
        </a>
      </div>
    </motion.article>
  );
}

/* ─── Directory Section ─────────────────────────────────────────── */
export default function DirectorySection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="directory"
      ref={ref}
      aria-labelledby="directory-heading"
      className="py-24 px-4 sm:px-6 bg-white"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="text-center mb-10"
        >
          <h2
            id="directory-heading"
            className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight"
          >
            Find your spiritual home.
          </h2>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="max-w-lg mx-auto mb-12"
        >
          <div className="relative">
            <label htmlFor="masjid-search" className="sr-only">
              Search masjids by city, zip, or name
            </label>
            <input
              id="masjid-search"
              type="search"
              placeholder="Search by city, zip, or name..."
              className="w-full pl-5 pr-14 py-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green transition-all"
            />
            <button
              type="submit"
              aria-label="Search masjids"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center transition-colors"
            >
              <Search size={15} className="text-white" aria-hidden="true" />
            </button>
          </div>
        </motion.div>

        {/* Mosque cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          role="list"
          aria-label="Featured masjids"
        >
          {MOSQUES.map((mosque, idx) => (
            <MosqueCard key={mosque.id} mosque={mosque} index={idx} inView={inView} />
          ))}
        </div>

        {/* Browse CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="text-center mt-10"
        >
          <a
            href="#browse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-600 transition-all"
          >
            Browse all 12,400+ Masjids
            <ChevronRight size={14} aria-hidden="true" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
