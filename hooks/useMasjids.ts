"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type Mosque,
  type MasjidListResponse,
  mapApiItemToMosque,
} from "@/types/masjid";

// ─── GPS ──────────────────────────────────────────────────────────────────────

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

function getUserLocation(timeoutMs = 8_000): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// ─── Filter params ────────────────────────────────────────────────────────────

export interface ListMasjidsParams {
  name?:        string;
  location?:    string;
  lat?:         number;
  lon?:         number;
  radius?:      number;
  page?:        number;
  limit?:       number;
  is_verified?: boolean;
}

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 12;

function buildQueryString(params: ListMasjidsParams): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ) as [string, string | number | boolean][];
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ─── Payload types ────────────────────────────────────────────────────────────

export interface CreateMasjidPayload {
  name: string;
  location: string;
  subDomain: string;
  latitude: string;
  longitude: string;
  address: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    postal_code: string;
    country_code: string;
  };
  phone_number: { country_code: string; number: string };
  prayer_times_configuration: {
    name: string; method: string;
    fajr_angle: number; isha_angle: number; isha_interval: number;
    asr_method: string; high_latitude_rule: string;
    adjustments: { fajr: number; dhuhr: number; asr: number; maghrib: number; isha: number };
  };
}

export interface UpdateMasjidPayload extends Partial<CreateMasjidPayload> {
  version?: number;
}

// ─── Return shape ─────────────────────────────────────────────────────────────

interface UseMasjidsResult {
  mosques:       Mosque[];
  isLoading:     boolean;
  error:         string | null;
  refetch:       (params?: ListMasjidsParams) => void;
  userLocation:  GeoCoords | null;
  locationError: string | null;
  createMasjid:  (payload: CreateMasjidPayload) => Promise<string>;
  isCreating:    boolean;
  createError:   string | null;
  getMasjid:     (masjidId: string) => Promise<Mosque>;
  updateMasjid:  (masjidId: string, payload: UpdateMasjidPayload) => Promise<Mosque>;
  isUpdating:    boolean;
  updateError:   string | null;
  deleteMasjid:  (masjidId: string) => Promise<void>;
  isDeleting:    boolean;
  deleteError:   string | null;
  // ✅ pagination
  page:          number;
  limit:         number;
  totalData:     number;
  totalPage:     number;
  hasMore:       boolean;
  isLoadingMore: boolean;
  loadMore:      () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMasjids(): UseMasjidsResult {
  const [mosques,       setMosques]       = useState<Mosque[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [userLocation,  setUserLocation]  = useState<GeoCoords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isCreating,    setIsCreating]    = useState(false);
  const [createError,   setCreateError]   = useState<string | null>(null);
  const [isUpdating,    setIsUpdating]    = useState(false);
  const [updateError,   setUpdateError]   = useState<string | null>(null);
  const [isDeleting,    setIsDeleting]    = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  // ✅ pagination state
  const [page,      setPage]      = useState(DEFAULT_PAGE);
  const [limit]                   = useState(DEFAULT_LIMIT);
  const [totalData, setTotalData] = useState(0);
  const [totalPage, setTotalPage] = useState(0);

  // ✅ Use ref for params — avoids object reference issues with useEffect deps
  const paramsRef     = useRef<ListMasjidsParams>({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT });
  const coordsRef     = useRef<GeoCoords | null>(null);
  const appendModeRef = useRef(false); // true = loadMore (append), false = fresh search (replace)
  const [tick, setTick] = useState(0);

  // ── Step 1: Resolve GPS once on mount ────────────────────────────────────
  useEffect(() => {
    getUserLocation()
      .then((coords) => {
        coordsRef.current = coords;
        setUserLocation(coords);
        setLocationError(null);
        // ✅ Auto-inject GPS into params and trigger fetch
        paramsRef.current = {
          ...paramsRef.current,
          lat:    coords.latitude,
          lon:    coords.longitude,
          radius: paramsRef.current.radius ?? 50,
          page:   DEFAULT_PAGE,
          limit:  DEFAULT_LIMIT,
        };
        appendModeRef.current = false;
        setTick((t) => t + 1);
      })
      .catch((err) => {
        let msg = "Location unavailable — distances hidden.";
        if (err instanceof GeolocationPositionError) {
          if (err.code === GeolocationPositionError.PERMISSION_DENIED)
            msg = "Location permission denied — distances hidden.";
          else if (err.code === GeolocationPositionError.TIMEOUT)
            msg = "Location request timed out — distances hidden.";
        }
        setLocationError(msg);
        // Still fetch masjids without geo params
        appendModeRef.current = false;
        setTick((t) => t + 1);
      });
  }, []); // run once on mount

  // ── Step 2: Fetch masjids whenever tick changes ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const isAppend = appendModeRef.current;
      if (isAppend) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);

      const qs = buildQueryString(paramsRef.current);
      console.log("[useMasjids] fetching →", `/api/masjids${qs}`, "params →", paramsRef.current);

      try {
        const res = await fetch(`/api/masjids${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: MasjidListResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Unknown error");

        // ✅ Backend returns data: null when no results found — treat as empty array
        let rawMosques = (json.data ?? []).map(mapApiItemToMosque);
        const coords   = coordsRef.current;

        // Inject distanceKm + distance + sort nearest-first
        if (coords) {
          rawMosques = rawMosques.map((m) => {
            const lat = Number(m.latitude);
            const lng = Number(m.longitude);
            if (!lat || !lng) return m;
            const km = haversineKm(coords.latitude, coords.longitude, lat, lng);
            return { ...m, distanceKm: km, distance: formatDistance(km) };
          });
          rawMosques.sort((a, b) => {
            const da = (a as any).distanceKm ?? Infinity;
            const db = (b as any).distanceKm ?? Infinity;
            return da - db;
          });
        }

        const meta = (json as any).metadata ?? {};

        // ✅ FIX: backend's `total_page` is unreliable (often returns 0 even
        // when there ARE more pages — e.g. total_data: 13, limit: 12,
        // total_page: 0, which should be ceil(13/12) = 2). `?? 1` never
        // catches this because 0 is not null/undefined. Compute it
        // ourselves from total_data/limit whenever the backend value is
        // missing or non-positive, instead of trusting a broken 0.
        const effectiveLimit = paramsRef.current.limit ?? DEFAULT_LIMIT;
        const resolvedTotalData = meta.total_data ?? rawMosques.length;
        const resolvedTotalPage =
          typeof meta.total_page === "number" && meta.total_page > 0
            ? meta.total_page
            : Math.max(1, Math.ceil(resolvedTotalData / effectiveLimit));

        if (!cancelled) {
          setMosques((prev) => (isAppend ? [...prev, ...rawMosques] : rawMosques));
          setTotalData(resolvedTotalData);
          setTotalPage(resolvedTotalPage);
          setPage(meta.page ?? paramsRef.current.page ?? DEFAULT_PAGE);
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load masjids");
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }

    // Only run after GPS resolves (tick starts at 0, GPS sets tick to 1)
    if (tick > 0) load();
    return () => { cancelled = true; };
  }, [tick]);

  // ── refetch — update params ref + trigger tick (fresh search, resets page) ─
  const refetch = useCallback((params?: ListMasjidsParams) => {
    if (params !== undefined) {
      // Merge GPS coords back in if not explicitly overridden
      paramsRef.current = {
        lat:    coordsRef.current?.latitude,
        lon:    coordsRef.current?.longitude,
        radius: 1200,
        limit:  DEFAULT_LIMIT,
        ...paramsRef.current,
        ...params,
        page: DEFAULT_PAGE, // ✅ always reset to page 1 on a fresh filter/search
      };
    } else {
      paramsRef.current = { ...paramsRef.current, page: DEFAULT_PAGE };
    }
    appendModeRef.current = false;
    setTick((t) => t + 1);
  }, []);

  // ── loadMore — fetch next page and append results ─────────────────────────
  const loadMore = useCallback(() => {
    const nextPage = (paramsRef.current.page ?? DEFAULT_PAGE) + 1;
    if (totalPage && nextPage > totalPage) return; // no more pages
    paramsRef.current = { ...paramsRef.current, page: nextPage };
    appendModeRef.current = true;
    setTick((t) => t + 1);
  }, [totalPage]);

  const hasMore = totalPage > 0 ? page < totalPage : false;

  // ── POST /api/masjids ─────────────────────────────────────────────────────
  const createMasjid = useCallback(
    async (payload: CreateMasjidPayload): Promise<string> => {
      setIsCreating(true); setCreateError(null);
      try {
        const res = await fetch("/api/masjids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
        refetch();
        return (data?.data?.id ?? data?.id ?? "") as string;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create masjid";
        setCreateError(msg); throw new Error(msg);
      } finally { setIsCreating(false); }
    },
    [refetch]
  );

  // ── GET single ────────────────────────────────────────────────────────────
  const getMasjid = useCallback(async (masjidId: string): Promise<Mosque> => {
    const res = await fetch(`/api/masjids/${masjidId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return mapApiItemToMosque(data?.data ?? data);
  }, []);

  // ── PATCH ─────────────────────────────────────────────────────────────────
  const updateMasjid = useCallback(
    async (masjidId: string, payload: UpdateMasjidPayload): Promise<Mosque> => {
      setIsUpdating(true); setUpdateError(null);
      try {
        const res = await fetch(`/api/masjids/${masjidId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
        const updated = mapApiItemToMosque(data?.data ?? data);
        setMosques((prev) => prev.map((m) => (m.id === masjidId ? updated : m)));
        return updated;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update masjid";
        setUpdateError(msg); throw new Error(msg);
      } finally { setIsUpdating(false); }
    }, []
  );

  // ── DELETE ────────────────────────────────────────────────────────────────
  const deleteMasjid = useCallback(async (masjidId: string): Promise<void> => {
    setIsDeleting(true); setDeleteError(null);
    try {
      const res = await fetch(`/api/masjids/${masjidId}`, { method: "DELETE" });
      if (res.status === 204) { setMosques((prev) => prev.filter((m) => m.id !== masjidId)); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
      setMosques((prev) => prev.filter((m) => m.id !== masjidId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete masjid";
      setDeleteError(msg); throw new Error(msg);
    } finally { setIsDeleting(false); }
  }, []);

  return {
    mosques, isLoading, error, refetch,
    userLocation, locationError,
    createMasjid, isCreating, createError,
    getMasjid,
    updateMasjid, isUpdating, updateError,
    deleteMasjid, isDeleting, deleteError,
    page, limit, totalData, totalPage,
    hasMore, isLoadingMore, loadMore,
  };
}