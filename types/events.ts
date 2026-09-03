/**
 * types/events.ts
 * UWS Event API Extension — TypeScript Interfaces
 * masjids.io · Ummah Web Services · 05 May 2026
 * Base URL: /api/v2
 *
 * Extends types/api.ts — import shared envelope types from there.
 */

import type { ApiResponse, ApiPaginatedResponse } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type EventStatus = "upcoming" | "sold_out" | "cancelled";

export type UserRegistrationStatus =
  | "not_registered"
  | "registered"
  | "waitlisted"
  | "cancelled";

export type RegistrationStatus = "confirmed" | "waitlisted" | "cancelled";

export type SpeakerRole = "speaker" | "host" | "panelist" | "moderator";

export type CalendarFormat = "ical" | "google" | "all";

export type GenderRestriction =
  | "NO_RESTRICTION"
  | "BROTHERS_ONLY"
  | "SISTERS_ONLY";

export type EventType = "in_person" | "online" | "hybrid";

// ─────────────────────────────────────────────────────────────────────────────
// EVT-EXT-01 — Event Categories
// GET /masjids/:masjid_id/events/categories
// ─────────────────────────────────────────────────────────────────────────────

export interface EventCategory {
  id: string;
  slug: string;
  label: string;
  icon: string;
  event_count: number;
}

export type GetEventCategoriesResponse = ApiResponse<EventCategory[]>;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-EXT-01b — Event List with Capacity & Status
// GET /masjids/:masjid_id/events
// ─────────────────────────────────────────────────────────────────────────────

export interface EventListItem {
  id: string;
  name: string;
  category: string;
  category_label: string;
  type: EventType;
  start_time: string;
  end_time: string;
  location_name: string;
  banner_url: string | null;
  gender_restriction: GenderRestriction;
  max_participants: number;
  registered_count: number;
  spots_left: number;
  capacity_pct: number;
  status: EventStatus;
  user_registration_status: UserRegistrationStatus;
  requires_rsvp: boolean;
}

export type GetEventsResponse = ApiPaginatedResponse<EventListItem>;

export interface GetEventsQuery {
  page?: number;
  limit?: number;
  category?: string;
  status?: EventStatus;
  from?: string;   // ISO8601
  to?: string;     // ISO8601
  q?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVT-EXT-02 — Real-time Capacity Status
// GET /masjids/:masjid_id/events/:event_id/capacity
// ─────────────────────────────────────────────────────────────────────────────

export interface EventCapacity {
  event_id: string;
  max_participants: number;
  registered_count: number;
  waitlist_count: number;
  spots_left: number;
  capacity_pct: number;
  status: EventStatus;
  is_sold_out: boolean;
  waitlist_enabled: boolean;
}

export type GetEventCapacityResponse = ApiResponse<EventCapacity>;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-EXT-03 — Register for Event
// POST /masjids/:masjid_id/events/:event_id/register
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterEventRequest {
  notes?: string;
}

export interface EventRegistrationData {
  registration_id: string;
  event_id: string;
  event_name: string;
  user_id: string;
  status: "confirmed";
  registered_at: string;
  qr_token: string;
  spots_left: number;
}

export type RegisterEventResponse = ApiResponse<EventRegistrationData>;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-EXT-04 — Join Waitlist
// POST /masjids/:masjid_id/events/:event_id/waitlist
// ─────────────────────────────────────────────────────────────────────────────

export interface WaitlistData {
  waitlist_id: string;
  event_id: string;
  event_name: string;
  user_id: string;
  position: number;
  waitlist_count: number;
  joined_at: string;
  status: "waitlisted";
}

export type JoinWaitlistResponse = ApiResponse<WaitlistData>;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-EXT-05 — Calendar Export
// GET /masjids/:masjid_id/events/:event_id/calendar
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarExportData {
  event_id: string;
  event_name: string;
  ical_url: string;
  google_calendar_url: string;
  outlook_url: string;
  ical_content: string;
}

export type GetCalendarExportResponse = ApiResponse<CalendarExportData>;

export interface GetCalendarExportQuery {
  format?: CalendarFormat;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVT-EXT-06 — Add Speaker / Host to Event
// POST /masjids/:masjid_id/events/:event_id/speakers
// ─────────────────────────────────────────────────────────────────────────────

export interface AddSpeakerRequest {
  name: string;
  role: SpeakerRole;
  bio: string;
  avatar_url?: string;
  user_id?: string;
}

export interface SpeakerData {
  id: string;
  event_id: string;
  name: string;
  role: SpeakerRole;
  bio: string;
  avatar_url: string | null;
  user_id: string | null;
  added_at: string;
}

export type AddSpeakerResponse = ApiResponse<SpeakerData>;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-EXT-07 — My Event Registrations
// GET /users/me/event-registrations
// ─────────────────────────────────────────────────────────────────────────────

export interface MyRegistrationItem {
  registration_id: string;
  event_id: string;
  event_name: string;
  event_start_time: string;
  event_end_time: string;
  location_name: string;
  banner_url: string | null;
  category: string;
  status: RegistrationStatus;
  registered_at: string;
  qr_token: string | null;
}

export type GetMyRegistrationsResponse = ApiPaginatedResponse<MyRegistrationItem>;

export interface GetMyRegistrationsQuery {
  page?: number;
  limit?: number;
  status?: RegistrationStatus;
  from?: string;  // ISO8601
  to?: string;    // ISO8601
}