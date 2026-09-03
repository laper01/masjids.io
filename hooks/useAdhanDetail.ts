/* ─────────────────────────────────────────────────────────────
   hooks/useAdhanDetail.ts

   Fetches a single Adhan file by its ID.
   Reads the JWT from next-auth's useSession() hook and sends it
   as the Authorization header to /api/adhan/[id].
   ───────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { AdhanFile, GetAdhanDetailResponse } from "@/types/adhan";

interface UseAdhanDetailResult {
  adhanFile: AdhanFile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdhanDetail(id: string | null): UseAdhanDetailResult {
  const { data: session, status } = useSession();
  const [adhanFile, setAdhanFile] = useState<AdhanFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      setAdhanFile(null);
      setIsLoading(false);
      return;
    }

    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.accessToken) {
      setAdhanFile(null);
      setError("unauthenticated");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/adhan/${id}`, {
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

        const json: GetAdhanDetailResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Unknown error");

        if (!cancelled) setAdhanFile(json.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load adhan file");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [status, session, id, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { adhanFile, isLoading, error, refetch };
}