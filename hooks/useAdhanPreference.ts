/* ─────────────────────────────────────────────────────────────
   hooks/useAdhanPreference.ts

   Fetches Adhan preferences either for the authenticated user
   (?by=user) or for a specific masjid (?by=masjid&masjid_id=…).

   Reads the JWT from next-auth's useSession() hook and sends it
   as the Authorization header to /api/adhan/preference.
   ───────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type {
  AdhanPreference,
  GetAdhanPreferenceByUserResponse,
  GetAdhanPreferenceByMasjidResponse,
} from "@/types/adhan";

// ─── By-User Variant ──────────────────────────────────────────────────────────

interface UseAdhanPreferenceByUserResult {
  preferences: AdhanPreference[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdhanPreferenceByUser(): UseAdhanPreferenceByUserResult {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<AdhanPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.accessToken) {
      setPreferences([]);
      setError("unauthenticated");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/adhan/preference?by=user", {
          method: "GET",
          headers: { Authorization: `Bearer ${session!.accessToken}` },
          cache: "no-store",
        });

        if (res.status === 401) {
          if (!cancelled) setError("unauthenticated");
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: GetAdhanPreferenceByUserResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Unknown error");

        if (!cancelled) setPreferences(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load adhan preferences");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [status, session, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { preferences, isLoading, error, refetch };
}

// ─── By-Masjid Variant ───────────────────────────────────────────────────────

interface UseAdhanPreferenceByMasjidResult {
  preferences: AdhanPreference[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdhanPreferenceByMasjid(
  masjidId: string | null
): UseAdhanPreferenceByMasjidResult {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<AdhanPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!masjidId) {
      setPreferences([]);
      setIsLoading(false);
      return;
    }

    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.accessToken) {
      setPreferences([]);
      setError("unauthenticated");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/adhan/preference?by=masjid&masjid_id=${masjidId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${session!.accessToken}` },
            cache: "no-store",
          }
        );

        if (res.status === 401) {
          if (!cancelled) setError("unauthenticated");
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: GetAdhanPreferenceByMasjidResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Unknown error");

        if (!cancelled) setPreferences(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load adhan preferences");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [status, session, masjidId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { preferences, isLoading, error, refetch };
}