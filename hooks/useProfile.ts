"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiFetch";
import type { UserProfile, UserProfileResponse, UpdateProfilePayload } from "@/types/profile";

interface UseProfileResult {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<boolean>;
  isUpdating: boolean;
  updateError: string | null;
}

export function useProfile(): UseProfileResult {
  const { data: session, status } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.accessToken) {
      setProfile(null);
      setError("unauthenticated");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // apiFetch handles 401 / X-Auth-Action: redirect-login internally
        // and redirects to /login automatically — no manual status check needed.
        const json = await apiFetch<UserProfileResponse>("/api/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session!.accessToken}`,
          },
          cache: "no-store",
        });

        if (!json.success) throw new Error(json.message ?? "Unknown error");

        if (!cancelled) {
          setProfile(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load profile"
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [status, session, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<boolean> => {
      if (!session?.accessToken) {
        setUpdateError("unauthenticated");
        return false;
      }

      setIsUpdating(true);
      setUpdateError(null);

      try {
        const json = await apiFetch<{ data?: Partial<UserProfile> }>("/api/profile", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        const updatedData: Partial<UserProfile> = json?.data ?? payload;
        setProfile((prev) => (prev ? { ...prev, ...updatedData } : prev));

        return true;
      } catch (err) {
        setUpdateError(
          err instanceof Error ? err.message : "Failed to update profile"
        );
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [session]
  );

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile,
    isUpdating,
    updateError,
  };
}