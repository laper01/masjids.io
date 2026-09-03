/**
 * types/media.ts
 * UWS Phase 1 v1.1 — Masjid Media & Facility API Types
 * masjids.io · Ummah Web Services · Added 05 May 2026
 * Base URL: /api/v2
 *
 * Extends types/api.ts — import shared envelope types from there.
 * Covers modules 3.9–4.7:
 *   DIR-03  GET  /masjids/:masjid_id/photo/cover
 *   DIR-04  POST /masjids/:masjid_id/photo/cover
 *   DIR-05  PUT  /masjids/:masjid_id/photo/cover
 *   DIR-06  GET  /masjids/:masjid_id/photo/gallery
 *   DIR-07  POST /masjids/:masjid_id/photo/gallery
 *   DIR-08  PUT  /masjids/:masjid_id/photo/gallery/:photo_id
 *   DIR-09  GET  /masjids/:masjid_id/facility
 *   DIR-10  POST /masjids/:masjid_id/facility
 *   DIR-11  PUT  /masjids/:masjid_id/facility
 */

import type { ApiResponse, ApiPaginatedResponse, UserRef } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────────────────────────────────

export type AllowedService =
  | "Halal"
  | "Funeral"
  | "Nikah"
  | "Weekend School"
  | "Quran Classes"
  | "Youth Programs";

// ─────────────────────────────────────────────────────────────────────────────
// DIR-03 — GET cover photo
// DIR-04 — POST upload cover photo (first upload)
// DIR-05 — PUT  replace cover photo (subsequent uploads)
// ─────────────────────────────────────────────────────────────────────────────

export interface CoverPhotoData {
  masjid_id: string;
  cover_photo_url: string;
  file_name: string;
  file_size_bytes: number;
  width: number;
  height: number;
  uploaded_at?: string;   // present on GET and POST
  updated_at?: string;    // present on PUT
  uploaded_by?: UserRef;  // present on GET and POST
  updated_by?: UserRef;   // present on PUT
}

export type GetCoverPhotoResponse  = ApiResponse<CoverPhotoData>;
export type UploadCoverPhotoResponse = ApiResponse<CoverPhotoData>;
export type UpdateCoverPhotoResponse = ApiResponse<CoverPhotoData>;

// ─────────────────────────────────────────────────────────────────────────────
// DIR-06 — GET gallery (paginated)
// DIR-07 — POST upload gallery photos (batch 1–10)
// DIR-08 — PUT  update single gallery photo
// ─────────────────────────────────────────────────────────────────────────────

export interface GalleryPhotoItem {
  id: string;
  masjid_id: string;
  photo_url: string;
  caption: string | null;
  file_name: string;
  file_size_bytes: number;
  width: number;
  height: number;
  uploaded_at: string;
  uploaded_by: UserRef;
}

export type GetGalleryResponse = ApiPaginatedResponse<GalleryPhotoItem>;

/** Shape of each item in the DIR-07 POST response array */
export interface UploadedGalleryPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  file_name: string;
  file_size_bytes: number;
  uploaded_at: string;
}

/** DIR-07 returns an array of uploaded photos (not paginated) */
export type UploadGalleryResponse = ApiResponse<UploadedGalleryPhoto[]>;

export interface UpdatedGalleryPhoto {
  id: string;
  masjid_id: string;
  photo_url: string;
  caption: string | null;
  file_name: string;
  file_size_bytes: number;
  updated_at: string;
  updated_by: UserRef;
}

export type UpdateGalleryPhotoResponse = ApiResponse<UpdatedGalleryPhoto>;

// ─────────────────────────────────────────────────────────────────────────────
// DIR-09 — GET facility
// DIR-10 — POST create facility
// DIR-11 — PUT  update facility
// ─────────────────────────────────────────────────────────────────────────────

export interface FacilityCapacity {
  main_hall: number;
  womens_section: number;
  total: number;
}

export interface FacilityAmenities {
  parking: boolean;
  wheelchair_accessible: boolean;
  womens_section: boolean;
  ablution_facilities: boolean;
  library: boolean;
  classroom: boolean;
  funeral_services: boolean;
}

export interface FacilityData {
  masjid_id: string;
  capacity: FacilityCapacity;
  amenities: FacilityAmenities;
  languages: string[];
  services: AllowedService[];
  updated_at?: string;   // present on GET and PUT
  created_at?: string;   // present on POST
  created_by?: UserRef;  // present on POST
  updated_by?: UserRef;  // present on PUT
}

export type GetFacilityResponse    = ApiResponse<FacilityData>;
export type CreateFacilityResponse = ApiResponse<FacilityData>;
export type UpdateFacilityResponse = ApiResponse<FacilityData>;

/** Shared request body shape for both POST and PUT facility */
export interface FacilityRequest {
  capacity: FacilityCapacity;
  amenities: FacilityAmenities;
  languages: string[];
  services: AllowedService[];
}