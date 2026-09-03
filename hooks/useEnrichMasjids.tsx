/* ─────────────────────────────────────────────────────────────
   hooks/useEnrichMasjids.ts

   Bulk-enriches a list of Mosque objects with cover photo URL
   and facility data (capacity, languages, services, amenities).

   Strategy:
   ─ Fires one Promise.allSettled per mosque (cover + facility)
   ─ All requests run in parallel, capped to CONCURRENCY_LIMIT
     to avoid flooding the API
   ─ Results are merged back into the Mosque shape so the parent
     can use `enriched` as a drop-in replacement for `mosques`
   ─ Exposes per-id loading map so the UI can show individual
     skeleton states while data streams in
   ───────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { Mosque } from "@/types/masjid";
import type {
  GetCoverPhotoResponse,
  GetFacilityResponse,
} from "@/types/media";

/** Max simultaneous fetch pairs (cover + facility = 2 reqs each) */
const CONCURRENCY_LIMIT = 6;

export interface EnrichedMosque extends Mosque {
  _enriched: boolean;
}

interface UseEnrichMasjidsResult {
  enriched: EnrichedMosque[];
  /** True while ANY enrichment is still in-flight */
  isEnriching: boolean;
  /** Per-id map — true while that specific mosque is still loading */
  loadingMap: Record<string, boolean>;
  /** Total capacity across all enriched mosques */
  totalCapacity: number;
  /** Number of unique country codes across the list */
  countryCount: number;
  /** Re-run enrichment (e.g. after an upload) */
  refresh: () => void;
}

async function fetchWithAuth<T>(
  url: string,
  token: string
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

/** Run promises in batches of `limit` */
async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit).map((fn) => fn());
    results.push(...(await Promise.all(batch)));
  }
  return results;
}

export function useEnrichMasjids(
  mosques: Mosque[]
): UseEnrichMasjidsResult {
  const { data: session, status } = useSession();
  const [enriched, setEnriched] = useState<EnrichedMosque[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [isEnriching, setIsEnriching] = useState(false);
  const [tick, setTick] = useState(0);
  const cancelRef = useRef(false);

  // Sync base list into enriched immediately (so table shows something
  // before cover/facility data arrives)
  useEffect(() => {
    setEnriched(
      mosques.map((m) => ({ ...m, _enriched: false }))
    );
  }, [mosques]);

  useEffect(() => {
    if (status === "loading" || !session?.accessToken || mosques.length === 0)
      return;

    cancelRef.current = false;
    const token = session.accessToken as string;

    // Mark all as loading
    setLoadingMap(
      Object.fromEntries(mosques.map((m) => [m.id, true]))
    );
    setIsEnriching(true);

    const tasks = mosques.map((mosque) => async () => {
      const [coverRes, facilityRes] = await Promise.allSettled([
        fetchWithAuth<GetCoverPhotoResponse>(
          `/api/masjids/${mosque.id}/photo/cover`,
          token
        ),
        fetchWithAuth<GetFacilityResponse>(
          `/api/masjids/${mosque.id}/facility`,
          token
        ),
      ]);

      if (cancelRef.current) return;

      const cover =
        coverRes.status === "fulfilled" && coverRes.value?.success
          ? coverRes.value.data
          : null;

      const facility =
        facilityRes.status === "fulfilled" && facilityRes.value?.success
          ? facilityRes.value.data
          : null;

      const patch: Partial<EnrichedMosque> = {
        _enriched: true,
        ...(cover && {
          thumbnailUrl: cover.cover_photo_url,
          imageUrl: cover.cover_photo_url,
        }),
        ...(facility && {
          capacity: facility.capacity.total,
          services: facility.services,
          language: facility.languages[0],
        }),
      };

      // Merge into state without replacing unrelated entries
      setEnriched((prev) =>
        prev.map((e) =>
          e.id === mosque.id ? { ...e, ...patch } : e
        )
      );
      setLoadingMap((prev) => ({ ...prev, [mosque.id]: false }));
    });

    pLimit(tasks, CONCURRENCY_LIMIT).then(() => {
      if (!cancelRef.current) setIsEnriching(false);
    });

    return () => {
      cancelRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mosques, session?.accessToken, status, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const totalCapacity = enriched.reduce(
    (sum, m) => sum + (m.capacity ?? 0),
    0
  );

  const countryCount = new Set(
    enriched.map((m) => m.countryCode).filter(Boolean)
  ).size;

  return {
    enriched,
    isEnriching,
    loadingMap,
    totalCapacity,
    countryCount,
    refresh,
  };
}