"use client";

import { useState, useCallback } from "react";
import type { DashboardData, DashboardSummaryResponse } from "@/types/dashboard";

interface GetSummaryOptions {
  period?: "day" | "week" | "month";
}

interface UseDashboardSummaryResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  getSummary: (masjidId: string, options?: GetSummaryOptions) => Promise<DashboardData | null>;
}

export function useDashboardSummary(): UseDashboardSummaryResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSummary = useCallback(
    async (masjidId: string, options?: GetSummaryOptions) => {
      if (!masjidId) return null;

      setLoading(true);
      setError(null);

      try {
        const qs = options?.period ? `?period=${options.period}` : "";
        const res = await fetch(`/api/masjids/${masjidId}/dashboard/summary${qs}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: DashboardSummaryResponse = await res.json();
        if (!json.success) throw new Error(json.message ?? "Failed to load dashboard summary");

        setData(json.data);
        return json.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load dashboard summary";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, loading, error, getSummary };
}