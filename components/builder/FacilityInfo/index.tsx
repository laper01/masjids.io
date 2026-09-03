// components/builder/FacilityInfo/index.tsx
"use client";

import React, { useEffect } from "react";
import { Building2, Loader2, CheckCircle } from "lucide-react";
import { useMosque } from "@/context/MosqueContext";
import { useMasjidMedia } from "@/hooks/masjid/useMasjidMedia";
import { THEME_STYLE } from "./constants";
import type { FacilityInfoProps } from "./types";

/**
 * FacilityInfo — displays the masjid's facility information fetched from the API.
 *
 * Referenced in the Reka AST as:
 *   { type: "external", name: "FacilityInfo" }
 *
 * Leaf node — no slot, no children.
 *
 * Data source:
 *   Reads masjidId from MosqueContext (useMosque) — no prop required.
 *   Calls getFacility(masjidId) on mount via useMasjidMedia.
 *
 * Props:
 *  - title     → heading above the list
 *  - layout    → "list" (stacked) | "grid" (2-column)
 *  - theme     → "emerald" | "slate" | "amber" | "sky"
 *  - showIcons → show icon per facility item
 *  - className → free Tailwind override
 */
export default function FacilityInfo({
  title     = "Our Facilities",
  layout    = "list",
  theme     = "emerald",
  showIcons = true,
  className = "",
}: FacilityInfoProps) {
  const { activeMosque } = useMosque();
  const { facility, loading, error, getFacility } = useMasjidMedia();

  useEffect(() => {
    if (activeMosque?.id) {
      getFacility(activeMosque.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMosque?.id]);

  const s = THEME_STYLE[theme];

  const wrapClass = className.trim() ? className.trim() : `p-5 ${s.card}`;

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`${wrapClass} flex items-center justify-center gap-2 py-8`}>
        <Loader2 size={18} className={`animate-spin ${s.icon}`} />
        <p className={`text-sm ${s.label}`}>Loading facilities…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`${wrapClass} flex flex-col items-center justify-center gap-2 py-8 text-rose-400`}>
        <Building2 size={24} />
        <p className="text-xs font-medium">Failed to load facility info</p>
      </div>
    );
  }

  /**
   * Real API response shape:
   * {
   *   data: {
   *     capacity:  { main_hall, womens_section, total }
   *     amenities: { parking, wheelchair_accessible, womens_section,
   *                  ablution_facilities, library, classroom,
   *                  funeral_services, ... }
   *     languages: string[]
   *     services:  string[]
   *   }
   * }
   */
  const facilityData = facility?.data as {
    capacity?:  { main_hall?: number; womens_section?: number; total?: number };
    amenities?: Record<string, boolean>;
    languages?: string[];
    services?:  string[];
  } | undefined;

  const AMENITY_LABELS: Record<string, string> = {
    parking:              "Parking",
    wheelchair_accessible:"Wheelchair Accessible",
    womens_section:       "Women's Section",
    ablution_facilities:  "Ablution Facilities",
    library:              "Library",
    classroom:            "Classroom",
    funeral_services:     "Funeral Services",
  };

  // Active amenity items
  const amenityItems = Object.entries(facilityData?.amenities ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => AMENITY_LABELS[k] ?? k.replace(/_/g, " "));

  // Services and languages as plain strings
  const serviceItems  = facilityData?.services  ?? [];
  const languageItems = facilityData?.languages  ?? [];

  // Capacity line — only show when total > 0
  const total = facilityData?.capacity?.total ?? 0;
  const capacityLabel = total > 0 ? `Capacity: ${total} people` : null;

  const activeItems = [
    ...amenityItems,
    ...serviceItems,
    ...languageItems.map((l) => `Language: ${l}`),
    ...(capacityLabel ? [capacityLabel] : []),
  ];

  // ── Empty state ──────────────────────────────────────────
  if (activeItems.length === 0) {
    return (
      <div className={`${wrapClass} flex flex-col items-center justify-center gap-2 py-8 text-slate-400`}>
        <Building2 size={24} />
        <p className="text-xs font-medium">No facility information available</p>
      </div>
    );
  }

  const listClass = layout === "grid"
    ? "grid grid-cols-2 gap-2 mt-3"
    : "flex flex-col gap-2 mt-3";

  // ── Facility list ────────────────────────────────────────
  return (
    <div className={wrapClass}>
      {title && (
        <h3 className={`text-sm font-bold ${s.title} mb-1`}>{title}</h3>
      )}

      <div className={listClass}>
        {activeItems.map((label) => (
          <div
            key={label}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${s.itemBg}`}
          >
            {showIcons ? (
              <CheckCircle size={14} className={`flex-shrink-0 ${s.icon}`} />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
            )}
            <span className={`text-xs font-medium ${s.label} capitalize`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}