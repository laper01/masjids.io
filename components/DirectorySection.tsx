"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useMasjids } from "@/hooks/useMasjids";
import { useMasjidMedia } from "@/hooks/masjid/useMasjidMedia";
import type { Mosque } from "@/types/masjid";

// How many masjids to feature on the landing page directory teaser.
const FEATURED_COUNT = 3;

// Static placeholder image used when a masjid has no cover photo uploaded,
// or when the cover photo URL fails to load — same asset used on the
// public discover page for consistency.
const PLACEHOLDER_IMAGE = "/images/masjid-cover.png";

// --- MasjidCard subcomponent ---
// Fetches its own cover photo (same per-card pattern used on the public
// discover page), so featured masjids show a real photo instead of a
// hardcoded Google-hosted placeholder image.
interface MasjidCardProps {
  masjid: Mosque;
  delay?: number;
  isInView: boolean;
}

function MasjidCard({ masjid, delay = 0, isInView }: MasjidCardProps) {
  const media = useMasjidMedia();

  useEffect(() => {
    media.getCoverPhoto(masjid.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjid.id]);

  const coverUrl = media.coverPhoto?.data?.cover_photo_url;
  const isLoadingCover = media.loading;

  const name = masjid.name;
  const location = masjid.location ?? masjid.countryCode ?? "—";
  // Distance (when GPS is available) is more useful to a visitor here than
  // a generic "Open for Jama'ah" placeholder that isn't backed by real data.
  const status = masjid.distance ? `${masjid.distance} away` : "View details for hours";

  return (
    <motion.article
      className="group bg-white rounded-3xl overflow-hidden premium-shadow border border-slate-100 hover-lift"
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      aria-label={`${name} — ${location}`}
    >
      {/* Card image */}
      <div className="h-56 overflow-hidden relative bg-slate-100">
        {isLoadingCover ? (
          <div className="w-full h-full animate-pulse bg-gradient-to-br from-slate-200 to-slate-100" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${name} exterior`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            src={coverUrl || PLACEHOLDER_IMAGE}
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
          />
        )}

      </div>

      {/* Card body */}
      <div className="p-8">
        <h4 className="font-bold font-headline text-xl text-slate-900 mb-2">{name}</h4>
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            location_on
          </span>
          {location}
        </div>

        {/* Footer row */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Status
            </span>
            <span className="text-xs font-bold text-emerald-600">{status}</span>
          </div>
          <a
            href={masjid.subDomain ? `https://${masjid.subDomain}.masjids.io` : `/public-masjids/${masjid.id}`}
            target={masjid.subDomain ? "_blank" : undefined}
            rel={masjid.subDomain ? "noopener noreferrer" : undefined}
            className="text-primary font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
            aria-label={`View details for ${name}`}
          >
            View Details{" "}
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              east
            </span>
          </a>
        </div>
      </div>
    </motion.article>
  );
}

// --- Loading / empty / error states for the cards grid ---

function CardSkeleton() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse">
      <div className="h-56 bg-slate-100" />
      <div className="p-8 space-y-4">
        <div className="h-6 w-3/4 bg-slate-100 rounded" />
        <div className="h-4 w-1/2 bg-slate-100 rounded" />
        <div className="h-10 w-full bg-slate-50 rounded mt-6" />
      </div>
    </div>
  );
}

// --- DirectorySection ---
export default function DirectorySection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const { mosques, isLoading, error, refetch, totalData } = useMasjids();
  const [query, setQuery] = useState("");

  const featured = mosques.slice(0, FEATURED_COUNT);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    refetch({ name: query || undefined });
  }

  return (
    <section
      ref={ref}
      className="py-40 bg-white"
      aria-labelledby="directory-heading"
    >
      <div className="max-w-7xl mx-auto px-8">
        {/* Section header + search */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-24"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase mb-6 block">
            The Global Directory
          </span>
          <h2
            id="directory-heading"
            className="font-headline text-5xl font-extrabold text-slate-900 mb-10 tracking-tightest"
          >
            Connect with your home.
          </h2>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
            {/* Gradient glow ring */}
            <div
              className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-slate-900 rounded-full blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"
              aria-hidden="true"
            />
            <div className="relative flex items-center">
              <label htmlFor="directory-search" className="sr-only">
                Search masjids by city, zip code, or name
              </label>
              <input
                id="directory-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-full px-10 py-6 text-xl font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all premium-shadow placeholder:text-slate-400 outline-none"
                placeholder="Search by city, zip, or name..."
                aria-label="Search for masjids"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white p-4 rounded-full shadow-lg cursor-pointer hover:bg-emerald-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Search"
              >
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                  search
                </span>
              </button>
            </div>
          </form>
        </motion.div>

        {/* Cards grid */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">Could not load masjids right now.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-primary font-bold text-sm underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
            role="list"
            aria-label="Featured masjids"
          >
            {isLoading
              ? Array.from({ length: FEATURED_COUNT }).map((_, i) => <CardSkeleton key={i} />)
              : featured.map((masjid, index) => (
                  <MasjidCard
                    key={masjid.id}
                    masjid={masjid}
                    delay={0.1 + index * 0.1}
                    isInView={isInView}
                  />
                ))}
          </div>
        )}

        {!isLoading && !error && featured.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-12">
            No masjids found yet.
          </p>
        )}

        {/* Browse all CTA */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <a
            href="/public-masjids"
            className="text-slate-900 font-bold border-b-2 border-primary/20 pb-1 hover:border-primary transition-all text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
            aria-label={`Browse all ${totalData.toLocaleString()} masjids in the directory`}
          >
            Browse all {totalData > 0 ? `${totalData.toLocaleString()}+` : ""} Masjids
          </a>
        </motion.div>
      </div>
    </section>
  );
}