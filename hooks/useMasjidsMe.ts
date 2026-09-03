/* ─────────────────────────────────────────────────────────────
   hooks/useMasjidsMe.ts

   Fetches ONLY the masjids belonging to the signed-in user.
   Reads the JWT from next-auth's useSession() hook and sends
   it as the Authorization header to /api/masjids/me.
   ───────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { type Mosque, type MasjidListResponse, mapApiItemToMosque } from "@/types/masjid";

interface UseMasjidsMeResult {
  mosques: Mosque[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMasjidsMe(): UseMasjidsMeResult {
  const { data: session, status } = useSession();
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Still waiting for next-auth to resolve the session
    if (status === "loading") return;

    // Not signed in — clear state, don't fetch
    if (status === "unauthenticated" || !session?.accessToken) {
      setMosques([]);
      setError("unauthenticated");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/masjids/me", {
          method: "GET",
          headers: {
            // session.accessToken comes from auth.ts → jwt callback → session callback
            Authorization: `Bearer ${session!.accessToken}`,
          },
          cache: "no-store",
        });

        if (res.status === 401) {
          if (!cancelled) setError("unauthenticated");
          return;
        }

        if (!res.ok) {
          // FIX: previously threw `HTTP ${res.status}` without ever reading
          // the response body, so any message the backend sent (e.g.
          // "Server error", a validation message, etc.) was silently
          // discarded and the UI only ever showed a generic "HTTP 500".
          // Read the body first and prefer its `message` field; fall back
          // to the generic status string only if the body isn't JSON or
          // has no message (e.g. a proxy/gateway error page).
          let message = `HTTP ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson?.message) message = errJson.message;
          } catch {
            // Body wasn't valid JSON — keep the generic HTTP status message.
          }
          throw new Error(message);
        }

        const json: MasjidListResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Unknown error");

        // Backend returns data: null when the user has no masjids yet
        // (instead of an empty array) — guard against that here.
        if (!cancelled) {
          setMosques((json.data ?? []).map(mapApiItemToMosque));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load your masjids");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [status, session, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { mosques, isLoading, error, refetch };
}