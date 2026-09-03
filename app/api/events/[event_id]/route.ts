import { NextResponse } from "next/server";
import { proxyGET, proxyPUT, proxyDELETE } from "@/lib/proxyHelper";
import type {
  GetEventResponse,
  UpdateEventResponse,
  DeleteEventResponse,
} from "@/types/event-management";

// ── Mock data ──────────────────────────────────────────────────────────────

function mockEventDetail(event_id: string): GetEventResponse {
  return {
    success: true,
    message: "Event details retrieved successfully.",
    data: {
      ID: event_id,
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
      created_at: "2026-05-08T06:25:09.229282Z",
      updated_at: "2026-05-08T06:25:09.229282Z",
    },
  };
}

function mockUpdateEvent(event_id: string): UpdateEventResponse {
  return {
    success: true,
    message: "Event updated successfully.",
    data: {
      ID: event_id,
      OrganizerID: "7baa3189-0361-450e-8bd1-35cba854407b",
      Name: "Updated Mock Event",
      Description: "Updated description",
      Type: "in_person",
      Status: "draft",
      StartTime: "2026-06-01T08:00:00Z",
      EndTime: "2026-06-01T18:00:00Z",
      GenderRestriction: "NO_RESTRICTION",
      LocationName: "Updated Venue",
      Latitude: 0,
      Longitude: 0,
      BannerURL: null,
      RequiresRsvp: true,
      MaxParticipants: 150,
      LivestreamLink: null,
      created_at: "2026-05-08T06:25:09.229282Z",
      updated_at: new Date().toISOString(),
    },
  };
}

const MOCK_DELETE_EVENT: DeleteEventResponse = {
  success: true,
  message: "Event deleted successfully.",
};

// ── Handlers ───────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ event_id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const { event_id } = await params;
  return proxyGET<GetEventResponse>(
    req,
    `/event/${event_id}`,
    mockEventDetail(event_id)
  );
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { event_id } = await params;
  return proxyPUT<UpdateEventResponse>(
    req,
    `/event/${event_id}`,
    mockUpdateEvent(event_id)
  );
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { event_id } = await params;
  return proxyDELETE<DeleteEventResponse>(
    req,
    `/event/${event_id}`,
    MOCK_DELETE_EVENT
  );
}