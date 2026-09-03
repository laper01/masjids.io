/* ─────────────────────────────────────────────────────────────
   hooks/useAdhanPreferenceDetail.ts

   Fetches a single Adhan preference by its ID.
   Reads the JWT from next-auth's useSession() hook and sends it
   as the Authorization header to /api/adhan/preference/[id].
   ───────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { AdhanPreference, GetAdhanPreferenceDetailResponse } from "@/types/adhan";

interface UseAdhanPreferenceDetailResult {
  preference: AdhanPreference | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdhanPreferenceDetail(
  id: string | null
): UseAdhanPreferenceDetailResult {
  const { data: session, status } = useSession();
  const [preference, setPreference] = useState<AdhanPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      setPreference(null);
      setIsLoading(false);
      return;
    }

    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.accessToken) {
      setPreference(null);
      setError("unauthenticated");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/adhan/preference/${id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${session!.accessToken}` },
          cache: "no-store",
        });

        if (res.status === 401) {
          if (!cancelled) setError("unauthenticated");
          return;
        }

        if (res.status === 404) {
          if (!cancelled) setError("not_found");
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: GetAdhanPreferenceDetailResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Unknown error");

        if (!cancelled) setPreference(json.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load adhan preference");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [status, session, id, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { preference, isLoading, error, refetch };
}