"use client";

/**
 * hooks/useBuilder.ts
 *
 * useBuilderContent    — fetch layout for a masjid
 * useUpdateBuilder     — save/update layout (PUT → backend PATCH)
 * usePublishBuilder    — publish the current layout
 * useBuilderOperations — combined hook used by BuilderPage
 */

import { useState, useEffect, useCallback } from "react";
import type {
  BuilderContent,
  Layout,
  GetLayoutResponse,
  UpdateLayoutResponse,
  PublishLayoutResponse,
} from "@/types/builder";

// ─── Hook 1: Fetch Builder Content ───────────────────────────────────────────

interface UseBuilderContentReturn {
  data: BuilderContent | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBuilderContent(masjidId: string): UseBuilderContentReturn {
  const [data, setData] = useState<BuilderContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    if (!masjidId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/builder/content?masjid_id=${masjidId}`);
      const result: GetLayoutResponse = await response.json();
      if (!response.ok) throw new Error((result as any).error || "Failed to fetch layout");
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch layout");
    } finally {
      setLoading(false);
    }
  }, [masjidId]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  return { data, loading, error, refetch: fetchContent };
}

// ─── Hook 2: Update Builder Content ──────────────────────────────────────────

interface UseUpdateBuilderReturn {
  updateContent: (masjidId: string, layout: Layout, version: number) => Promise<BuilderContent>;
  loading: boolean;
  error: string | null;
}

export function useUpdateBuilder(): UseUpdateBuilderReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateContent = async (
    masjidId: string,
    layout: Layout,
    version: number
  ): Promise<BuilderContent> => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/builder/content?masjid_id=${masjidId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // FIX: send current version as-is — backend handles increment
        body: JSON.stringify({ layout, version }),
      });
      const result: UpdateLayoutResponse = await response.json();
      if (!response.ok) throw new Error((result as any).error || "Failed to update layout");
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update layout";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateContent, loading, error };
}

// ─── Hook 3: Publish Builder Content ─────────────────────────────────────────

interface UsePublishBuilderReturn {
  publishContent: (masjidId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function usePublishBuilder(): UsePublishBuilderReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishContent = async (masjidId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/builder/publish?masjid_id=${masjidId}`, {
        method: "POST",
      });
      const result: PublishLayoutResponse = await response.json();
      if (!response.ok) throw new Error((result as any).error || "Failed to publish layout");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish layout";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { publishContent, loading, error };
}

// ─── Hook 4: Combined Builder Operations ─────────────────────────────────────

interface UseBuilderOperationsReturn {
  content: BuilderContent | null;
  loading: boolean;
  error: string | null;
  fetchContent: () => Promise<void>;
  /**
   * Save current layout draft.
   * Sends the CURRENT version from state — no +1 here.
   * Backend is responsible for incrementing and returning the new version.
   * After a successful save, local `content` is updated so the next save
   * uses the backend's latest version (prevents 409 on repeated saves).
   */
  updateContent: (layout: Layout) => Promise<void>;
  publishContent: () => Promise<void>;
}

export function useBuilderOperations(masjidId: string): UseBuilderOperationsReturn {
  const [content, setContent] = useState<BuilderContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    if (!masjidId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/builder/content?masjid_id=${masjidId}`);
      const result: GetLayoutResponse = await response.json();
      if (!response.ok) throw new Error((result as any).error || "Failed to fetch layout");
      setContent(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch layout");
    } finally {
      setLoading(false);
    }
  }, [masjidId]);

  // ── Update (save draft) ───────────────────────────────────────────────────────
  const updateContent = useCallback(
    async (layout: Layout) => {
      if (!masjidId) return;

      // Use current version from state; if not loaded yet default to 1.
      // FIX: do NOT do content.version + 1 — backend owns the increment.
      const currentVersion = content?.version ?? 1;

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/builder/content?masjid_id=${masjidId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout, version: currentVersion }),
        });
        const result: UpdateLayoutResponse = await response.json();
        if (!response.ok) throw new Error((result as any).error || "Failed to update layout");

        // IMPORTANT: sync local content with backend's response so next save
        // uses the updated version returned by the server — prevents 409.
        setContent(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update layout");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [masjidId, content]
  );

  // ── Publish ───────────────────────────────────────────────────────────────────
  const publishContent = useCallback(async () => {
    if (!masjidId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/builder/publish?masjid_id=${masjidId}`, {
        method: "POST",
      });
      const result: PublishLayoutResponse = await response.json();
      if (!response.ok) throw new Error((result as any).error || "Failed to publish layout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish layout");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [masjidId]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  return { content, loading, error, fetchContent, updateContent, publishContent };
}