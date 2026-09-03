export type EventType = {
  id: string;
  masjidId: string; // Mapped from OrganizerID / organization_id
  name: string;
  description: string;
  type: 'offline' | 'online' | 'hybrid';
  status: 'draft' | 'published';
  startTime: string;
  endTime: string;
  requiresRsvp: boolean;
  maxParticipants: number;
  livestreamLink: string | null;
  
  // New fields based on Postman
  genderRestriction: 'NO_RESTRICTION' | 'MEN_ONLY' | 'WOMEN_ONLY';
  locationName: string;
  latitude: number;
  longitude: number;
  bannerUrl: string;
  
  createTime: string;
  updateTime: string;
};