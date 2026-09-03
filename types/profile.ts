/* ─────────────────────────────────────────────────────────────
   types/profile.ts

   Type definitions for the authenticated user's profile,
   mirroring the shape returned by GET /api/v2/users/me
   and accepted by PATCH /api/v2/users/{id}.
   ───────────────────────────────────────────────────────────── */

// ─── Shared sub-types ─────────────────────────────────────────────────────────

export interface PhoneNumber {
  country_code: string;
  number: string;
}

// ─── Core profile shape (as returned by the backend) ─────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  /** e.g. "MALE" | "FEMALE" | "OTHER" — extend as needed */
  gender: string | null;
  phone_number: PhoneNumber | null;
  profile_picture_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ─── API response wrapper ─────────────────────────────────────────────────────

export interface UserProfileResponse {
  success: boolean;
  message?: string;
  data: UserProfile;
}

// ─── PATCH payload ────────────────────────────────────────────────────────────
// All fields optional — send only what needs to change.

export interface UpdateProfilePayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  phone_number?: PhoneNumber;
  username?: string;
  /** URL of the new profile picture (after uploading separately) */
  profile_picture_url?: string;
}