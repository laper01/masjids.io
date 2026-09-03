/* ─────────────────────────────────────────────────────────────
   types/masjid.ts
   Matches the exact shape returned by GET /api/masjids
   ───────────────────────────────────────────────────────────── */

export interface MasjidAddress {
  address_line_1: string;
  address_line_2: string;
  city: string;
  postal_code: string;
  country_code: string;
}

export interface MasjidPhoneNumber {
  country_code: string;
  number: string;
}

export interface PrayerAdjustments {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerTimesConfiguration {
  name: string;
  method: string;
  fajr_angle: number;
  isha_angle: number;
  isha_interval: number;
  asr_method: string;
  high_latitude_rule: string;
  adjustments: PrayerAdjustments;
}

/** Raw shape from the API */
export interface MasjidApiItem {
  id: string;
  name: string;
  location: string;
  subDomain: string;
  is_verified: boolean;
  latitude: number;
  longitude: number;
  version: number;
  address: MasjidAddress;
  phone_number: MasjidPhoneNumber;
  prayer_times_configuration: PrayerTimesConfiguration;
}

export interface MasjidListMetadata {
  total_data: number;
  total_page: number;
  page: number;
  limit: number;
}

export interface MasjidListResponse {
  success: boolean;
  message: string;
  data: MasjidApiItem[];
  metadata: MasjidListMetadata;
}

/* ─── Modal-ready shape (UI layer) ───────────────────────────
   The modal works with this leaner interface.
   Use `mapApiItemToMosque` to convert from raw API data.
   ─────────────────────────────────────────────────────────── */

export type MasjidSize = "Boutique" | "Community" | "Grand";

export interface Mosque {
  id: string;
  name: string;
  /** Human-readable city / region string */
  location: string;
  /**
   * Single-line formatted address string for display.
   * Use `address_structured` when you need the individual fields
   * (e.g. for the edit modal).
   */
  address: string;
  /** Structured address fields — mirrors MasjidApiItem.address */
  address_structured: MasjidAddress;
  /** City extracted from address for display */
  city: string;
  thumbnailUrl?: string;
  version?: number;
  /** Cover / hero image URL used by MasjidCard */
  imageUrl?: string;
  /** Derived from is_verified for display */
  is_verified: boolean;
  /** Alias for is_verified — used by MasjidCard's badge */
  verified: boolean;
  subDomain: string;
  countryCode: string;
  /** Lat/lng kept for potential map use */
  latitude: number;
  longitude: number;
  /** Contact phone number */
  phone_number: MasjidPhoneNumber;
  /** Prayer times configuration */
  prayer_times_configuration: PrayerTimesConfiguration;

  // ── Display / enrichment fields (UI layer) ────────────────
  /** Formatted distance string, e.g. "1.2 km" */
  distance?: string;
  /** Total capacity of the main prayer hall */
  capacity?: number;
  /** Label for the next upcoming prayer, e.g. "Asr · 15:45" */
  nextPrayer?: string;
  /** Countdown label shown before follower count is loaded, e.g. "12 min" */
  prayerIn?: string;
  /** Average star rating */
  rating?: number;
  /** Total number of reviews */
  reviewCount?: number;
  /** Follower count — may be populated from the followers API */
  followerCount?: number;
  /** Dominant / primary khutbah language */
  language?: string;
  /** Size category based on capacity */
  size?: MasjidSize;
  /** Services offered, e.g. ["Halal Food Nearby", "Funeral Services"] */
  services?: string[];
}

/** Convert a raw API item into the UI Mosque shape */
export function mapApiItemToMosque(item: MasjidApiItem): Mosque {
  const { address } = item;
  const line2 = address.address_line_2 ? `, ${address.address_line_2}` : "";
  const formattedAddress = `${address.address_line_1}${line2}, ${address.city} ${address.postal_code}`;

  return {
    id: item.id,
    name: item.name,
    location: item.location,
    address: formattedAddress.trim(),
    address_structured: { ...address },
    version:      item.version, 
    city: address.city,
    is_verified: item.is_verified,
    verified: item.is_verified,
    subDomain: item.subDomain,
    countryCode: address.country_code,
    latitude: item.latitude,
    longitude: item.longitude,
    phone_number: { ...item.phone_number },
    prayer_times_configuration: {
      ...item.prayer_times_configuration,
      adjustments: { ...item.prayer_times_configuration.adjustments },
    },
    // UI enrichment fields are left undefined here and should be
    // populated by higher-level data-fetching hooks (e.g. useMasjids)
    // once additional API endpoints (cover photo, facility, followers)
    // have been called.
  };
}