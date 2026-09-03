/**
 * types/event-management.ts
 * UWS Event Management API — TypeScript Interfaces
 * masjids.io · Ummah Web Services · 08 May 2026
 * Base URL: /api/v2
 *
 * Covers CRUD event management (admin-side):
 *   EVT-MGT-01  POST   /event                    — Create event
 *   EVT-MGT-02  PUT    /event/:event_id           — Update event
 *   EVT-MGT-03  PATCH  /event/:event_id/status    — Update event status
 *   EVT-MGT-04  GET    /event/:event_id           — Get event by ID
 *   EVT-MGT-05  GET    /event                     — List events (paginated)
 *   EVT-MGT-06  DELETE /event/:event_id           — Delete event
 */

import type { ApiResponse, ApiPaginatedResponse } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type ManagedEventType = "in_person" | "online" | "hybrid";

export type ManagedEventStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "completed";

export type ManagedGenderRestriction =
  | "NO_RESTRICTION"
  | "BROTHERS_ONLY"
  | "SISTERS_ONLY";

// ─────────────────────────────────────────────────────────────────────────────
// EVT-MGT-01 — Create Event
// POST /event
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateEventRequest {
  name: string;
  organization_id: string;
  description: string;
  type: ManagedEventType;
  start_time: string;           // ISO8601
  end_time: string;             // ISO8601
  max_participants: number;
  gender_restriction: ManagedGenderRestriction;
  location_name: string;
  latitude: number;
  longitude: number;
  banner_url?: string | null;
  requires_rsvp: boolean;
  livestream_link?: string | null;
}

export interface ManagedEventData {
  ID: string;
  OrganizerID: string;
  Name: string;
  Description: string;
  Type: ManagedEventType;
  Status: ManagedEventStatus;
  StartTime: string;
  EndTime: string;
  GenderRestriction: ManagedGenderRestriction;
  LocationName: string;
  Latitude: number;
  Longitude: number;
  BannerURL: string | null;
  RequiresRsvp: boolean;
  MaxParticipants: number;
  LivestreamLink: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateEventResponse = ApiResponse<ManagedEventData>;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-MGT-02 — Update Event
// PUT /event/:event_id
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateEventRequest {
  organizer_id: string;
  name: string;
  description: string;
  type: ManagedEventType;
  start_time: string;           // ISO8601
  end_time: string;             // ISO8601
  max_participants: number;
  gender_restriction: ManagedGenderRestriction;
  location_name: string;
  latitude: number;
  longitude: number;
  banner_url?: string | null;
  requires_rsvp: boolean;
  livestream_link?: string | null;
}

export type UpdateEventResponse = ApiResponse<ManagedEventData>;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-MGT-03 — Update Event Status
// PATCH /event/:event_id/status
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateEventStatusRequest {
  status: ManagedEventStatus;
}

export interface UpdateEventStatusData {
  success: boolean;
  message: string;
}

// Note: backend returns { success, message } only — no data wrapper
export type UpdateEventStatusResponse = UpdateEventStatusData;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-MGT-04 — Get Event by ID
// GET /event/:event_id
// ─────────────────────────────────────────────────────────────────────────────

export type GetEventResponse = ApiResponse<ManagedEventData>;

// ─────────────────────────────────────────────────────────────────────────────
// EVT-MGT-05 — List Events (paginated)
// GET /event?page=1&limit=10
// ─────────────────────────────────────────────────────────────────────────────

export type GetEventsListResponse = ApiPaginatedResponse<ManagedEventData>;

export interface GetEventsListQuery {
  page?: number;
  limit?: number;
  status?: ManagedEventStatus;
  type?: ManagedEventType;
  from?: string;    // ISO8601
  to?: string;      // ISO8601
  q?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVT-MGT-06 — Delete Event
// DELETE /event/:event_id
// ─────────────────────────────────────────────────────────────────────────────

export interface DeleteEventData {
  success: boolean;
  message: string;
}

export type DeleteEventResponse = DeleteEventData;