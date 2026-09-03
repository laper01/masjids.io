/**
 * UWS Phase 1 — API Types · Adhan Module
 * masjids.io · Ummah Web Services
 * Base URL: /api/v2
 *
 * All response shapes follow two conventions:
 *   - Paginated  → ApiPaginatedResponse<T>  (includes metadata)
 *   - Single     → ApiResponse<T>           (data is object or array, no metadata)
 */

import type {
  ApiResponse,
  ApiPaginatedResponse,
} from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED EMBEDDED OBJECTS
// ─────────────────────────────────────────────────────────────────────────────

export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type CalculationMethod =
  | "MUSLIM_WORLD_LEAGUE"
  | "EGYPTIAN"
  | "KARACHI"
  | "MAKKAH"
  | "NORTH_AMERICA"
  | "KUWAIT"
  | "QATAR"
  | "SINGAPORE"
  | "TEHRAN"
  | "JAFARI";

export type AsrMethod =
  | "SHAFI_HANBALI_MALIKI"  // Standard
  | "HANAFI";

export type HighLatitudeRule =
  | "MIDDLE_OF_THE_NIGHT"
  | "SEVENTH_OF_THE_NIGHT"
  | "TWILIGHT_ANGLE";

/** Per-prayer minute offsets. Positive = later, negative = earlier. */
export interface PrayerTimeAdjustments {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerTimesConfiguration {
  id?: string;
  name: string;
  method: CalculationMethod | string;
  asr_method: AsrMethod | string;
  high_latitude_rule: HighLatitudeRule | string;
  adjustments: PrayerTimeAdjustments;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE — ADHAN FILES
// ─────────────────────────────────────────────────────────────────────────────

export interface AdhanFile {
  id: string;
  name: string;
  url: string;
  masjid_id: string;
  created_at: string;
  updated_at: string | null;
}

// ADH-01 · GET /adhan
export type GetAdhanListResponse = ApiPaginatedResponse<AdhanFile>;

export interface GetAdhanListQuery {
  masjid_id?: string;
  page?: number;
  limit?: number;
}

// ADH-02 · POST /adhan/upload
export interface UploadAdhanRequest {
  /** Audio file — multipart/form-data */
  file: File;
  name: string;
  masjid_id: string;
}

export type UploadAdhanResponse = ApiResponse<AdhanFile>;

// ADH-03 · GET /adhan/:id
export type GetAdhanDetailResponse = ApiResponse<AdhanFile>;

// ADH-04 · PUT /adhan/:id
export interface UpdateAdhanRequest {
  /** Replacement audio file — optional, multipart/form-data */
  file?: File;
  name?: string;
  masjid_id?: string;
}

export type UpdateAdhanResponse = ApiResponse<AdhanFile>;

// ADH-05 · DELETE /adhan/:id
export interface DeleteAdhanData {
  id: string;
  deleted: true;
  deleted_at: string;
}

export type DeleteAdhanResponse = ApiResponse<DeleteAdhanData>;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE — ADHAN PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

export interface AdhanPreference {
  id: string;
  user_id: string;
  adhan_file_id: string;
  prayer_times_configuration: PrayerTimesConfiguration;
  created_at: string;
  updated_at: string;
}

// ADH-06 · GET /adhan/preference/by-user-id
export type GetAdhanPreferenceByUserResponse = ApiPaginatedResponse<AdhanPreference>;

// ADH-07 · GET /adhan/preference/by-masjid-id/:masjid_id
export type GetAdhanPreferenceByMasjidResponse = ApiPaginatedResponse<AdhanPreference>;

export interface GetAdhanPreferenceQuery {
  page?: number;
  limit?: number;
}

// ADH-08 · POST /adhan/preference
export interface CreateAdhanPreferenceRequest {
  adhan_file_id: string;
  prayer_times_configuration: {
    name: string;
    method: string;
    asr_method: string;
    high_latitude_rule: string;
    adjustments: PrayerTimeAdjustments;
  };
}

export type CreateAdhanPreferenceResponse = ApiResponse<AdhanPreference>;

// ADH-09 · GET /adhan/preference/:id
export type GetAdhanPreferenceDetailResponse = ApiResponse<AdhanPreference>;

// ADH-10 · PUT /adhan/preference/:id
export interface UpdateAdhanPreferenceRequest {
  adhan_file_id?: string;
  prayer_times_configuration?: {
    name?: string;
    method?: string;
    asr_method?: string;
    high_latitude_rule?: string;
    adjustments?: Partial<PrayerTimeAdjustments>;
  };
}

export type UpdateAdhanPreferenceResponse = ApiResponse<AdhanPreference>;

// ADH-11 · DELETE /adhan/preference/:id
export interface DeleteAdhanPreferenceData {
  id: string;
  deleted: true;
  deleted_at: string;
}

export type DeleteAdhanPreferenceResponse = ApiResponse<DeleteAdhanPreferenceData>;