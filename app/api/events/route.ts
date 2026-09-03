/**
 * app/api/events/route.ts
 * Next.js Route Handlers — Event Collection
 *
 * GET  /api/events          → EVT-MGT-05 List events (paginated)
 * POST /api/events          → EVT-MGT-01 Create event
 */

import { proxyGET, proxyPOST } from "@/lib/proxyHelper";
import type { GetEventsListResponse, CreateEventResponse } from "@/types/event-management";

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_EVENT_LIST: GetEventsListResponse = {
  success: true,
  message: "Events retrieved successfully.",
  data: [
    {
      ID: "3915861c-97ac-4af9-81ac-af195db84790",
      OrganizerID: "7baa3189-0361-450e-8bd1-35cba854407b",
      Name: "Global Tech Symposium 2026",
      Description: "An international gathering of tech enthusiasts.",
      Type: "hybrid",
      Status: "published",
      StartTime: "2026-02-15T09:00:00Z",
      EndTime: "2026-02-15T17:00:00Z",
      GenderRestriction: "NO_RESTRICTION",
      LocationName: "San Francisco Convention Center",
      Latitude: 37.7842,
      Longitude: -122.4019,
      BannerURL: "https://cdn.yourservice.com/assets/banner_symposium.png",
      RequiresRsvp: true,
      MaxParticipants: 1000,
      LivestreamLink: "https://youtube.com/live/example-event",
      created_at: "2026-05-08T06:25:09.229282508Z",
      updated_at: "2026-05-08T06:25:09.229282508Z",
    },
  ],
  metadata: { total_data: 1, total_page: 1, page: 1, limit: 10 },
};

const MOCK_CREATE_EVENT: CreateEventResponse = {
  success: true,
  message: "Event created successfully.",
  data: {
    ID: "00000000-0000-0000-0000-000000000001",
    OrganizerID: "7baa3189-0361-450e-8bd1-35cba854407b",
    Name: "Mock Event",
    Description: "Mock description",
    Type: "in_person",
    Status: "draft",
    StartTime: "2026-06-01T09:00:00Z",
    EndTime: "2026-06-01T17:00:00Z",
    GenderRestriction: "NO_RESTRICTION",
    LocationName: "Mock Venue",
    Latitude: 0,
    Longitude: 0,
    BannerURL: null,
    RequiresRsvp: false,
    MaxParticipants: 100,
    LivestreamLink: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

// ── Handlers ───────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  return proxyGET<GetEventsListResponse>(req, "/event", MOCK_EVENT_LIST);
}

export async function POST(req: Request) {
  return proxyPOST<CreateEventResponse>(req, "/event", MOCK_CREATE_EVENT);
}