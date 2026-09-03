/**
 * hooks/masjid/useMasjidMedia.ts
 *
 * Client-side data-fetching hook for the Masjid Media & Facility module
 * (DIR-03 → DIR-11).
 *
 * Provides:
 *   Cover Photo:
 *     - getCoverPhoto(masjidId)              → DIR-03 GET  [public]
 *     - uploadCoverPhoto(masjidId, file)     → DIR-04 POST [auth: members:manage]
 *     - updateCoverPhoto(masjidId, file)     → DIR-05 PUT  [auth: members:manage]
 *
 *   Gallery:
 *     - getGallery(masjidId, query)          → DIR-06 GET  [public, paginated]
 *     - uploadGalleryPhotos(masjidId, files) → DIR-07 POST [auth: members:manage]
 *     - updateGalleryPhoto(masjidId, photoId, payload) → DIR-08 PUT [auth]
 *
 *   Facility:
 *     - getFacility(masjidId)                → DIR-09 GET  [public]
 *     - createFacility(masjidId, payload)    → DIR-10 POST [auth: members:manage]
 *     - updateFacility(masjidId, payload)    → DIR-11 PUT  [auth: members:manage]
 *
 * File upload helpers:
 *   All photo upload functions accept a standard File object and build
 *   the FormData internally — no manual FormData construction needed
 *   in the calling component.
 *
 * Optimistic state updates:
 *   - uploadCoverPhoto / updateCoverPhoto → patches `coverPhoto` state
 *   - uploadGalleryPhotos → prepends new photos to gallery list
 *   - updateGalleryPhoto  → patches matching photo in gallery list
 *   - createFacility / updateFacility → patches `facility` state
 *
 * FIX (previous revision):
 *   `uploadGalleryPhotos` and `updateGalleryPhoto` previously assumed
 *   `prev.gallery.data` was always an array once `prev.gallery` was
 *   truthy. Both functions now guard with Array.isArray() and fall back
 *   to an empty array/zero total.
 *
 *   `getCoverPhoto` / `getGallery` / `getFacility` previously treated a
 *   404 (masjid has no cover photo / gallery / facility record yet) the
 *   same as a real fetch failure. A 404 on these three GETs now
 *   resolves the state to `null` with no `error` set.
 *
 * FIX (this revision):
 *   `getCoverPhoto`, `getGallery`, and `getFacility` are documented as
 *   PUBLIC endpoints — they're called from the public masjid site
 *   (site/[subdomain]/page.tsx) where the visitor has no session at
 *   all. If the backend ever returns 401 for these (misconfiguration —
 *   these routes should never require auth), apiFetch is called with
 *   { skipAuthRedirect: true } so the anonymous visitor is NOT yanked
 *   to /login. The 401 is instead surfaced through the normal `error`
 *   state, same as any other fetch failure, and the calling component's
 *   existing error UI (e.g. "Failed to load cover photo") handles it.
 *   Mutation functions (upload/create/update) are untouched — those
 *   genuinely require an authenticated admin session, and redirecting
 *   to /login on 401 there is correct behavior.
 *
 * Usage:
 *   const {
 *     coverPhoto, gallery, facility,
 *     loading, error,
 *     getCoverPhoto, uploadCoverPhoto, updateCoverPhoto,
 *     getGallery, uploadGalleryPhotos, updateGalleryPhoto,
 *     getFacility, createFacility, updateFacility,
 *   } = useMasjidMedia();
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ApiErrorResponse } from "@/types/api";
import type {
  GetCoverPhotoResponse,
  UploadCoverPhotoResponse,
  UpdateCoverPhotoResponse,
  GetGalleryResponse,
  UploadGalleryResponse,
  UpdateGalleryPhotoResponse,
  GetFacilityResponse,
  CreateFacilityResponse,
  UpdateFacilityResponse,
  FacilityRequest,
  GalleryPhotoItem,
} from "@/types/media";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_GALLERY_BATCH = 10;

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface MasjidMediaState {
  coverPhoto: GetCoverPhotoResponse | null;
  gallery: GetGalleryResponse | null;
  facility: GetFacilityResponse | null;
  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/**
 * Client-side file validation before sending to the BFF.
 * Returns an error message string or null if valid.
 */
function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported format. Use JPEG, PNG, or WEBP.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the 5 MB size limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
}

/**
 * A 404 from these GET endpoints just means "no record yet" (e.g. a
 * freshly-registered masjid with no cover photo / gallery / facility
 * info) — not a real failure. apiFetch is expected to throw an Error
 * whose `status` matches the HTTP status, or whose `message` contains
 * it (e.g. "Request failed with status 404"); either shape is handled.
 */
function isNotFoundError(err: unknown): boolean {
  const status = (err as { status?: number } | undefined)?.status;
  if (status === 404) return true;
  const message = err instanceof Error ? err.message : "";
  return /\b404\b/.test(message);
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useMasjidMedia() {
  const [state, setState] = useState<MasjidMediaState>({
    coverPhoto: null,
    gallery: null,
    facility: null,
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ── DIR-03: GET cover photo (PUBLIC) ──────────────────────────────────────

  const getCoverPhoto = useCallback(async (masjidId: string) => {
    startLoading();
    try {
      const data = await apiFetch<GetCoverPhotoResponse>(
        `/api/masjids/${masjidId}/photo/cover`,
        undefined,
        { skipAuthRedirect: true }
      );
      setState((prev) => ({ ...prev, coverPhoto: data, loading: false, error: null }));
      return data;
    } catch (err) {
      if (isNotFoundError(err)) {
        setState((prev) => ({ ...prev, coverPhoto: null, loading: false, error: null }));
        return null;
      }
      setError(err instanceof Error ? err.message : "Failed to fetch cover photo.");
      return null;
    }
  }, []);

  // ── DIR-04: POST upload first cover photo ─────────────────────────────────

  const uploadCoverPhoto = useCallback(
    async (masjidId: string, file: File) => {
      const fileError = validateImageFile(file);
      if (fileError) {
        setError(fileError);
        return null;
      }

      startLoading();
      try {
        const formData = new FormData();
        formData.append("file", file);

        const data = await apiFetch<UploadCoverPhotoResponse>(
          `/api/masjids/${masjidId}/photo/cover`,
          { method: "POST", body: formData }
          // Note: Do NOT set Content-Type manually — browser sets multipart boundary automatically
          // Note: no skipAuthRedirect — this is an authenticated admin action.
        );

        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          coverPhoto: prev.coverPhoto
            ? { ...prev.coverPhoto, data: data.data }
            : data as unknown as GetCoverPhotoResponse,
        }));

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload cover photo.");
        return null;
      }
    },
    []
  );

  // ── DIR-05: PUT replace cover photo ──────────────────────────────────────

  const updateCoverPhoto = useCallback(
    async (masjidId: string, file: File) => {
      const fileError = validateImageFile(file);
      if (fileError) {
        setError(fileError);
        return null;
      }

      startLoading();
      try {
        const formData = new FormData();
        formData.append("file", file);

        const data = await apiFetch<UpdateCoverPhotoResponse>(
          `/api/masjids/${masjidId}/photo/cover`,
          { method: "PUT", body: formData }
        );

        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          coverPhoto: prev.coverPhoto
            ? { ...prev.coverPhoto, data: data.data }
            : null,
        }));

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update cover photo.");
        return null;
      }
    },
    []
  );

  // ── DIR-06: GET gallery (PUBLIC, paginated) ───────────────────────────────

  const getGallery = useCallback(
    async (masjidId: string, query: { page?: number; limit?: number } = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetGalleryResponse>(
          `/api/masjids/${masjidId}/photo/gallery${qs}`,
          undefined,
          { skipAuthRedirect: true }
        );
        setState((prev) => ({ ...prev, gallery: data, loading: false, error: null }));
        return data;
      } catch (err) {
        if (isNotFoundError(err)) {
          setState((prev) => ({ ...prev, gallery: null, loading: false, error: null }));
          return null;
        }
        setError(err instanceof Error ? err.message : "Failed to fetch gallery.");
        return null;
      }
    },
    []
  );

  // ── DIR-07: POST batch-upload gallery photos ──────────────────────────────

  const uploadGalleryPhotos = useCallback(
    async (
      masjidId: string,
      files: File[],
      captions?: string[]
    ) => {
      if (files.length === 0) {
        setError("At least one file must be provided.");
        return null;
      }

      if (files.length > MAX_GALLERY_BATCH) {
        setError(`Maximum ${MAX_GALLERY_BATCH} files per upload.`);
        return null;
      }

      // Validate all files before sending
      for (const file of files) {
        const fileError = validateImageFile(file);
        if (fileError) {
          setError(fileError);
          return null;
        }
      }

      startLoading();
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        if (captions) {
          captions.forEach((caption) => formData.append("captions", caption));
        }

        const data = await apiFetch<UploadGalleryResponse>(
          `/api/masjids/${masjidId}/photo/gallery`,
          { method: "POST", body: formData }
        );

        // Optimistically prepend new photos to gallery list.
        // Guard against `prev.gallery` being null OR `prev.gallery.data`
        // being missing/non-array.
        setState((prev) => {
          const newItems: GalleryPhotoItem[] = data.data.map((p) => ({
            id: p.id,
            masjid_id: masjidId,
            photo_url: p.photo_url,
            caption: p.caption,
            file_name: p.file_name,
            file_size_bytes: p.file_size_bytes,
            width: 0,   // not returned in upload response
            height: 0,
            uploaded_at: p.uploaded_at,
            uploaded_by: { id: "", name: "" }, // resolved from JWT server-side
          }));

          const prevItems = Array.isArray(prev.gallery?.data)
            ? (prev.gallery as GetGalleryResponse).data
            : [];
          const prevTotal = prev.gallery?.metadata?.total_data ?? 0;

          return {
            ...prev,
            loading: false,
            error: null,
            gallery: {
              ...prev.gallery,
              data: [...newItems, ...prevItems],
              metadata: {
                ...prev.gallery?.metadata,
                total_data: prevTotal + data.data.length,
              },
            } as GetGalleryResponse,
          };
        });

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload gallery photos.");
        return null;
      }
    },
    []
  );

  // ── DIR-08: PUT update gallery photo ─────────────────────────────────────

  const updateGalleryPhoto = useCallback(
    async (
      masjidId: string,
      photoId: string,
      payload: { file?: File; caption?: string }
    ) => {
      if (!payload.file && payload.caption === undefined) {
        setError("At least one of file or caption must be provided.");
        return null;
      }

      if (payload.file) {
        const fileError = validateImageFile(payload.file);
        if (fileError) {
          setError(fileError);
          return null;
        }
      }

      startLoading();
      try {
        let body: BodyInit;
        let headers: Record<string, string> = {};

        if (payload.file) {
          // File update — use multipart (with or without caption)
          const formData = new FormData();
          formData.append("file", payload.file);
          if (payload.caption !== undefined) {
            formData.append("caption", payload.caption);
          }
          body = formData;
          // No Content-Type header — browser sets boundary automatically
        } else {
          // Caption-only update — use JSON
          body = JSON.stringify({ caption: payload.caption });
          headers = { "Content-Type": "application/json" };
        }

        const data = await apiFetch<UpdateGalleryPhotoResponse>(
          `/api/masjids/${masjidId}/photo/gallery/${photoId}`,
          { method: "PUT", body, headers }
        );

        // Patch matching photo in gallery list.
        // Guard against `prev.gallery.data` being missing/non-array.
        setState((prev) => {
          if (!prev.gallery || !Array.isArray(prev.gallery.data)) {
            return { ...prev, loading: false, error: null };
          }

          return {
            ...prev,
            loading: false,
            error: null,
            gallery: {
              ...prev.gallery,
              data: prev.gallery.data.map((p) =>
                p.id === photoId
                  ? {
                      ...p,
                      photo_url: data.data.photo_url,
                      caption: data.data.caption,
                      file_name: data.data.file_name,
                      file_size_bytes: data.data.file_size_bytes,
                    }
                  : p
              ),
            },
          };
        });

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update gallery photo.");
        return null;
      }
    },
    []
  );

  // ── DIR-09: GET facility (PUBLIC) ─────────────────────────────────────────

  const getFacility = useCallback(async (masjidId: string) => {
    startLoading();
    try {
      const data = await apiFetch<GetFacilityResponse>(
        `/api/masjids/${masjidId}/facility`,
        undefined,
        { skipAuthRedirect: true }
      );
      setState((prev) => ({ ...prev, facility: data, loading: false, error: null }));
      return data;
    } catch (err) {
      if (isNotFoundError(err)) {
        // No facility record yet — normal for a new masjid, not an error.
        setState((prev) => ({ ...prev, facility: null, loading: false, error: null }));
        return null;
      }
      setError(err instanceof Error ? err.message : "Failed to fetch facility info.");
      return null;
    }
  }, []);

  // ── DIR-10: POST create facility ──────────────────────────────────────────

  const createFacility = useCallback(
    async (masjidId: string, payload: FacilityRequest) => {
      startLoading();
      try {
        const data = await apiFetch<CreateFacilityResponse>(
          `/api/masjids/${masjidId}/facility`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          facility: data as unknown as GetFacilityResponse,
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create facility info.");
        return null;
      }
    },
    []
  );

  // ── DIR-11: PUT update facility ───────────────────────────────────────────

  const updateFacility = useCallback(
    async (masjidId: string, payload: FacilityRequest) => {
      startLoading();
      try {
        const data = await apiFetch<UpdateFacilityResponse>(
          `/api/masjids/${masjidId}/facility`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          facility: data as unknown as GetFacilityResponse,
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update facility info.");
        return null;
      }
    },
    []
  );

  // ── Utils ─────────────────────────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearGallery = useCallback(() => {
    setState((prev) => ({ ...prev, gallery: null }));
  }, []);

  return {
    // State
    coverPhoto: state.coverPhoto,
    gallery: state.gallery,
    facility: state.facility,
    loading: state.loading,
    error: state.error,

    // Cover Photo
    getCoverPhoto,
    uploadCoverPhoto,
    updateCoverPhoto,

    // Gallery
    getGallery,
    uploadGalleryPhotos,
    updateGalleryPhoto,

    // Facility
    getFacility,
    createFacility,
    updateFacility,

    // Utils
    clearError,
    clearGallery,
  };
}