/**
 * hooks/events/useEvents.ts
 *
 * Unified Event Hook — EVT-EXT-01→07 (public/user) + EVT-MGT-01→06 (admin CRUD)
 * masjids.io · Ummah Web Services · 08 May 2026
 *
 * ── Public / User actions (EVT-EXT) ──────────────────────────────────────────
 *   getEventCategories(masjidId)                → EVT-EXT-01  GET  [public]
 *   getEvents(masjidId, query)                  → EVT-EXT-01b GET  [public, paginated]
 *   getEventCapacity(masjidId, eventId)         → EVT-EXT-02  GET  [public]
 *   registerForEvent(masjidId, eventId, body?)  → EVT-EXT-03  POST [auth]
 *   joinWaitlist(masjidId, eventId)             → EVT-EXT-04  POST [auth]
 *   getCalendarExport(masjidId, eventId, query) → EVT-EXT-05  GET  [public]
 *   addSpeaker(masjidId, eventId, body)         → EVT-EXT-06  POST [auth: events:manage]
 *   getMyRegistrations(query)                   → EVT-EXT-07  GET  [auth, paginated]
 *
 * ── Admin / Management actions (EVT-MGT) ─────────────────────────────────────
 *   createEvent(body)                           → EVT-MGT-01  POST [auth]
 *   getManagedEvent(eventId)                    → EVT-MGT-04  GET  [auth]
 *   getManagedEvents(query)                     → EVT-MGT-05  GET  [auth, paginated]
 *   updateEvent(eventId, body)                  → EVT-MGT-02  PUT  [auth]
 *   updateEventStatus(eventId, status)          → EVT-MGT-03  PATCH [auth]
 *   deleteEvent(eventId)                        → EVT-MGT-06  DELETE [auth]
 *
 * ── Optimistic updates ────────────────────────────────────────────────────────
 *   registerForEvent → user_registration_status → "registered", spots_left--, capacity_pct recalc
 *   joinWaitlist     → user_registration_status → "waitlisted"
 *   deleteEvent      → removes entry from managedEvents list
 *   updateEventStatus → patches status in managedEvents list
 *
 * Usage:
 *   const {
 *     // EVT-EXT state
 *     categories, events, capacity, calendarExport, myRegistrations,
 *     // EVT-MGT state
 *     managedEvent, managedEvents,
 *     // shared
 *     loading, mutating, error,
 *     isEventPending,
 *     // EVT-EXT actions
 *     getEventCategories, getEvents, getEventCapacity,
 *     registerForEvent, joinWaitlist, getCalendarExport,
 *     addSpeaker, getMyRegistrations,
 *     // EVT-MGT actions
 *     createEvent, getManagedEvent, getManagedEvents,
 *     updateEvent, updateEventStatus, deleteEvent,
 *     // calendar helpers
 *     openGoogleCalendar, openOutlookCalendar, downloadIcal,
 *     // utils
 *     clearError, clearCalendarExport,
 *   } = useEvents();
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ApiErrorResponse, PaginationMeta } from "@/types/api";

// EVT-EXT types
import type {
  GetEventCategoriesResponse,
  GetEventsResponse,
  GetEventCapacityResponse,
  RegisterEventResponse,
  JoinWaitlistResponse,
  GetCalendarExportResponse,
  AddSpeakerResponse,
  GetMyRegistrationsResponse,
  GetEventsQuery,
  GetCalendarExportQuery,
  GetMyRegistrationsQuery,
  RegisterEventRequest,
  AddSpeakerRequest,
} from "@/types/events";

// EVT-MGT types
import type {
  ManagedEventData,
  CreateEventRequest,
  UpdateEventRequest,
  ManagedEventStatus,
} from "@/types/event-management";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface EventsState {
  // ── EVT-EXT ──
  categories: GetEventCategoriesResponse | null;
  events: GetEventsResponse | null;
  capacity: GetEventCapacityResponse | null;
  calendarExport: GetCalendarExportResponse | null;
  myRegistrations: GetMyRegistrationsResponse | null;

  // ── EVT-MGT ──
  /** Single managed event (GET by ID) */
  managedEvent: ManagedEventData | null;
  /** Paginated list of managed events */
  managedEvents: { data: ManagedEventData[]; metadata: PaginationMeta } | null;

  // ── Shared ──
  /** Global loading flag — set during GET / read operations */
  loading: boolean;
  /** Mutation flag — set during POST / PUT / PATCH / DELETE operations */
  mutating: boolean;
  /** Per-event pending map for individual card-level spinners */
  pendingEventIds: Set<string>;
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
  return (
    "?" +
    new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE: EventsState = {
  categories: null,
  events: null,
  capacity: null,
  calendarExport: null,
  myRegistrations: null,
  managedEvent: null,
  managedEvents: null,
  loading: false,
  mutating: false,
  pendingEventIds: new Set(),
  error: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useEvents() {
  const [state, setState] = useState<EventsState>(INITIAL_STATE);

  // ── State helpers ──────────────────────────────────────────────────────────

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const startMutating = () =>
    setState((prev) => ({ ...prev, mutating: true, error: null }));

  const stopLoading = () =>
    setState((prev) => ({ ...prev, loading: false }));

  const stopMutating = () =>
    setState((prev) => ({ ...prev, mutating: false }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, mutating: false, error: message }));

  const addPending = (id: string) =>
    setState((prev) => ({
      ...prev,
      pendingEventIds: new Set([...prev.pendingEventIds, id]),
    }));

  const removePending = (id: string) =>
    setState((prev) => {
      const next = new Set(prev.pendingEventIds);
      next.delete(id);
      return { ...prev, pendingEventIds: next };
    });

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-EXT-01 — GET Event Categories
  // GET /api/masjids/:masjid_id/events/categories
  // ─────────────────────────────────────────────────────────────────────────

  const getEventCategories = useCallback(async (masjidId: string) => {
    startLoading();
    try {
      const data = await apiFetch<GetEventCategoriesResponse>(
        `/api/masjids/${masjidId}/events/categories`
      );
      setState((prev) => ({ ...prev, categories: data, loading: false, error: null }));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch event categories.");
      return null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-EXT-01b — GET Events List (paginated)
  // GET /api/masjids/:masjid_id/events
  // ─────────────────────────────────────────────────────────────────────────

  const getEvents = useCallback(
    async (masjidId: string, query: GetEventsQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetEventsResponse>(
          `/api/masjids/${masjidId}/events${qs}`
        );
        setState((prev) => ({ ...prev, events: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch events.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-EXT-02 — GET Real-time Capacity
  // GET /api/masjids/:masjid_id/events/:event_id/capacity
  // ─────────────────────────────────────────────────────────────────────────

  const getEventCapacity = useCallback(
    async (masjidId: string, eventId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetEventCapacityResponse>(
          `/api/masjids/${masjidId}/events/${eventId}/capacity`
        );
        setState((prev) => ({ ...prev, capacity: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch event capacity.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-EXT-03 — POST Register for Event
  // POST /api/masjids/:masjid_id/events/:event_id/register
  // Optimistic: user_registration_status → "registered", spots_left--, capacity_pct recalc
  // ─────────────────────────────────────────────────────────────────────────

  const registerForEvent = useCallback(
    async (
      masjidId: string,
      eventId: string,
      body: RegisterEventRequest = {}
    ) => {
      addPending(eventId);
      try {
        const data = await apiFetch<RegisterEventResponse>(
          `/api/masjids/${masjidId}/events/${eventId}/register`,
          { method: "POST", body: JSON.stringify(body) }
        );

        setState((prev) => {
          const next = new Set(prev.pendingEventIds);
          next.delete(eventId);

          const updatedEvents = prev.events
            ? {
                ...prev.events,
                data: prev.events.data.map((e) =>
                  e.id === eventId
                    ? {
                        ...e,
                        user_registration_status: "registered" as const,
                        registered_count: e.registered_count + 1,
                        spots_left: Math.max(0, e.spots_left - 1),
                        capacity_pct: Math.round(
                          ((e.registered_count + 1) / e.max_participants) * 100
                        ),
                        status:
                          e.spots_left - 1 <= 0
                            ? ("sold_out" as const)
                            : e.status,
                      }
                    : e
                ),
              }
            : null;

          return {
            ...prev,
            pendingEventIds: next,
            events: updatedEvents,
            error: null,
          };
        });

        return data;
      } catch (err) {
        removePending(eventId);
        setError(err instanceof Error ? err.message : "Failed to register for event.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-EXT-04 — POST Join Waitlist
  // POST /api/masjids/:masjid_id/events/:event_id/waitlist
  // Optimistic: user_registration_status → "waitlisted"
  // ─────────────────────────────────────────────────────────────────────────

  const joinWaitlist = useCallback(
    async (masjidId: string, eventId: string) => {
      addPending(eventId);
      try {
        const data = await apiFetch<JoinWaitlistResponse>(
          `/api/masjids/${masjidId}/events/${eventId}/waitlist`,
          { method: "POST" }
        );

        setState((prev) => {
          const next = new Set(prev.pendingEventIds);
          next.delete(eventId);

          return {
            ...prev,
            pendingEventIds: next,
            error: null,
            events: prev.events
              ? {
                  ...prev.events,
                  data: prev.events.data.map((e) =>
                    e.id === eventId
                      ? { ...e, user_registration_status: "waitlisted" as const }
                      : e
                  ),
                }
              : null,
          };
        });

        return data;
      } catch (err) {
        removePending(eventId);
        setError(err instanceof Error ? err.message : "Failed to join waitlist.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-EXT-05 — GET Calendar Export
  // GET /api/masjids/:masjid_id/events/:event_id/calendar
  // ─────────────────────────────────────────────────────────────────────────

  const getCalendarExport = useCallback(
    async (
      masjidId: string,
      eventId: string,
      query: GetCalendarExportQuery = {}
    ) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetCalendarExportResponse>(
          `/api/masjids/${masjidId}/events/${eventId}/calendar${qs}`
        );
        setState((prev) => ({
          ...prev,
          calendarExport: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch calendar export.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-EXT-06 — POST Add Speaker
  // POST /api/masjids/:masjid_id/events/:event_id/speakers
  // ─────────────────────────────────────────────────────────────────────────

  const addSpeaker = useCallback(
    async (masjidId: string, eventId: string, payload: AddSpeakerRequest) => {
      startMutating();
      try {
        const data = await apiFetch<AddSpeakerResponse>(
          `/api/masjids/${masjidId}/events/${eventId}/speakers`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        stopMutating();
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add speaker.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-EXT-07 — GET My Registrations
  // GET /api/users/me/event-registrations
  // ─────────────────────────────────────────────────────────────────────────

  const getMyRegistrations = useCallback(
    async (query: GetMyRegistrationsQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query as Record<string, unknown>);
        const data = await apiFetch<GetMyRegistrationsResponse>(
          `/api/users/me/event-registrations${qs}`
        );
        setState((prev) => ({
          ...prev,
          myRegistrations: data,
          loading: false,
          error: null,
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch your registrations.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-MGT-01 — POST Create Event
  // POST /api/events
  // ─────────────────────────────────────────────────────────────────────────

  const createEvent = useCallback(async (body: CreateEventRequest) => {
    startMutating();
    try {
      const res = await apiFetch<{ success: boolean; message: string; data: ManagedEventData }>(
        "/api/events",
        { method: "POST", body: JSON.stringify(body) }
      );

      setState((prev) => ({
        ...prev,
        mutating: false,
        error: null,
        // Prepend to managed list if already loaded
        managedEvents: prev.managedEvents
          ? {
              ...prev.managedEvents,
              data: [res.data, ...prev.managedEvents.data],
              metadata: {
                ...prev.managedEvents.metadata,
                total_data: prev.managedEvents.metadata.total_data + 1,
              },
            }
          : null,
      }));

      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event.");
      return null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-MGT-04 — GET Managed Event by ID
  // GET /api/events/:event_id
  // ─────────────────────────────────────────────────────────────────────────

  const getManagedEvent = useCallback(async (eventId: string) => {
    startLoading();
    try {
      const res = await apiFetch<{ success: boolean; message: string; data: ManagedEventData }>(
        `/api/events/${eventId}`
      );
      setState((prev) => ({
        ...prev,
        managedEvent: res.data,
        loading: false,
        error: null,
      }));
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch event.");
      return null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-MGT-05 — GET Managed Events List (paginated)
  // GET /api/events?page=1&limit=10
  // ─────────────────────────────────────────────────────────────────────────

  const getManagedEvents = useCallback(
    async (query: Record<string, unknown> = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query);
        const res = await apiFetch<{
          success: boolean;
          message: string;
          data: ManagedEventData[];
          metadata: PaginationMeta;
        }>(`/api/events${qs}`);

        setState((prev) => ({
          ...prev,
          managedEvents: { data: res.data, metadata: res.metadata },
          loading: false,
          error: null,
        }));
        return res;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch managed events.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-MGT-02 — PUT Update Event
  // PUT /api/events/:event_id
  // ─────────────────────────────────────────────────────────────────────────

  const updateEvent = useCallback(
    async (eventId: string, body: UpdateEventRequest) => {
      startMutating();
      try {
        const res = await apiFetch<{ success: boolean; message: string; data: ManagedEventData }>(
          `/api/events/${eventId}`,
          { method: "PUT", body: JSON.stringify(body) }
        );

        setState((prev) => ({
          ...prev,
          mutating: false,
          error: null,
          // Update single managed event if it's the one being viewed
          managedEvent:
            prev.managedEvent?.ID === eventId ? res.data : prev.managedEvent,
          // Patch the entry in the managed list if loaded
          managedEvents: prev.managedEvents
            ? {
                ...prev.managedEvents,
                data: prev.managedEvents.data.map((e) =>
                  e.ID === eventId ? res.data : e
                ),
              }
            : null,
        }));

        return res.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update event.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-MGT-03 — PATCH Update Event Status
  // PATCH /api/events/:event_id/status
  // Optimistic: patches status in managedEvents list + managedEvent
  // ─────────────────────────────────────────────────────────────────────────

  const updateEventStatus = useCallback(
    async (eventId: string, status: ManagedEventStatus) => {
      // Optimistic patch
      setState((prev) => ({
        ...prev,
        managedEvent:
          prev.managedEvent?.ID === eventId
            ? { ...prev.managedEvent, Status: status }
            : prev.managedEvent,
        managedEvents: prev.managedEvents
          ? {
              ...prev.managedEvents,
              data: prev.managedEvents.data.map((e) =>
                e.ID === eventId ? { ...e, Status: status } : e
              ),
            }
          : null,
      }));

      try {
        await apiFetch<{ success: boolean; message: string }>(
          `/api/events/${eventId}/status`,
          { method: "PATCH", body: JSON.stringify({ status }) }
        );
        return true;
      } catch (err) {
        // Rollback is not implemented here — caller can refetch if needed
        setError(err instanceof Error ? err.message : "Failed to update event status.");
        return false;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // EVT-MGT-06 — DELETE Event
  // DELETE /api/events/:event_id
  // Optimistic: removes entry from managedEvents list
  // ─────────────────────────────────────────────────────────────────────────

  const deleteEvent = useCallback(async (eventId: string) => {
    // Optimistic removal
    setState((prev) => ({
      ...prev,
      managedEvent: prev.managedEvent?.ID === eventId ? null : prev.managedEvent,
      managedEvents: prev.managedEvents
        ? {
            ...prev.managedEvents,
            data: prev.managedEvents.data.filter((e) => e.ID !== eventId),
            metadata: {
              ...prev.managedEvents.metadata,
              total_data: Math.max(0, prev.managedEvents.metadata.total_data - 1),
            },
          }
        : null,
    }));

    try {
      await apiFetch<{ success: boolean; message: string }>(
        `/api/events/${eventId}`,
        { method: "DELETE" }
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event.");
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // CALENDAR HELPERS (EVT-EXT-05)
  // ─────────────────────────────────────────────────────────────────────────

  /** Open Google Calendar link in a new tab */
  const openGoogleCalendar = useCallback(() => {
    const url = state.calendarExport?.data?.google_calendar_url;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }, [state.calendarExport]);

  /** Open Outlook calendar link in a new tab */
  const openOutlookCalendar = useCallback(() => {
    const url = state.calendarExport?.data?.outlook_url;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }, [state.calendarExport]);

  /** Trigger iCal file download via a temporary <a> tag */
  const downloadIcal = useCallback(
    (masjidId: string, eventId: string) => {
      const url = `/api/masjids/${masjidId}/events/${eventId}/calendar?format=ical`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────

  /** Returns true if a specific event has a pending registration/waitlist action */
  const isEventPending = useCallback(
    (eventId: string) => state.pendingEventIds.has(eventId),
    [state.pendingEventIds]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearCalendarExport = useCallback(() => {
    setState((prev) => ({ ...prev, calendarExport: null }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // ── EVT-EXT state ──
    categories: state.categories,
    events: state.events,
    capacity: state.capacity,
    calendarExport: state.calendarExport,
    myRegistrations: state.myRegistrations,

    // ── EVT-MGT state ──
    managedEvent: state.managedEvent,
    managedEvents: state.managedEvents,

    // ── Shared state ──
    loading: state.loading,
    mutating: state.mutating,
    error: state.error,

    // ── Per-event pending ──
    isEventPending,

    // ── EVT-EXT actions ──
    getEventCategories,
    getEvents,
    getEventCapacity,
    registerForEvent,
    joinWaitlist,
    getCalendarExport,
    addSpeaker,
    getMyRegistrations,

    // ── EVT-MGT actions ──
    createEvent,
    getManagedEvent,
    getManagedEvents,
    updateEvent,
    updateEventStatus,
    deleteEvent,

    // ── Calendar helpers ──
    openGoogleCalendar,
    openOutlookCalendar,
    downloadIcal,

    // ── Utils ──
    clearError,
    clearCalendarExport,
  };
}