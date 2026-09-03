/* ─────────────────────────────────────────────────────────────
   hooks/useAdhanList.ts

   Fetches the list of Adhan files, optionally filtered by masjid_id.
   Reads the JWT from next-auth's useSession() hook and sends it
   as the Authorization header to /api/adhan.
   ───────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { AdhanFile, GetAdhanListResponse } from "@/types/adhan";

interface UseAdhanListParams {
  masjidId?: string;
  page?: number;
  limit?: number;
}

interface UseAdhanListResult {
  adhanFiles: AdhanFile[];
  isLoading: boolean;
  error: string | null;
  metadata: GetAdhanListResponse["metadata"] | null;
  refetch: () => void;
}

export function useAdhanList(
  params: UseAdhanListParams = {}
): UseAdhanListResult {
  const { masjidId, page = 1, limit = 10 } = params;

  const { data: session, status } = useSession();
  const [adhanFiles, setAdhanFiles] = useState<AdhanFile[]>([]);
  const [metadata, setMetadata] = useState<GetAdhanListResponse["metadata"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.accessToken) {
      setAdhanFiles([]);
      setError("unauthenticated");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        if (masjidId) searchParams.set("masjid_id", masjidId);
        searchParams.set("page", String(page));
        searchParams.set("limit", String(limit));

        const res = await fetch(`/api/adhan?${searchParams.toString()}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${session!.accessToken}` },
          cache: "no-store",
        });

        if (res.status === 401) {
          if (!cancelled) setError("unauthenticated");
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: GetAdhanListResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Unknown error");

        if (!cancelled) {
          setAdhanFiles(Array.isArray(json.data) ? json.data : []);
          setMetadata(json.metadata ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load adhan files");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [status, session, masjidId, page, limit, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { adhanFiles, isLoading, error, metadata, refetch };
}