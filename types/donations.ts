/**
 * types/donations.ts
 * Donation module types — DON-01..07
 * Place at: types/donations.ts
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type CampaignStatus   = "active" | "paused" | "closed";
export type DonationType     = "one_time" | "recurring" | "both";
export type DonationInterval = "month" | "year";
export type DonationStatus   = "pending" | "succeeded" | "failed" | "refunded";

// ─── Campaign ─────────────────────────────────────────────────────────────────

export interface CampaignListItem {
  id:            string;
  title:         string;
  status:        CampaignStatus;
  donation_type: DonationType;
  goal_amount:   number;
  raised_amount: number;
  progress_pct:  number | null;
  donor_count:   number;
  currency:      string;
  end_date?:     string | null;
}

export interface CampaignDetail extends CampaignListItem {
  description:   string | null;
  start_date:    string | null;
  cover_image_url: string | null;
  masjid_id:     string;
  created_at:    string;
  updated_at:    string;
}

// ─── Donation Record ──────────────────────────────────────────────────────────

export interface DonationUser {
  id:    string;
  name:  string | null;
  email: string | null;
}

export interface DonationRecord {
  id:            string;
  campaign_id:   string;
  user:          DonationUser | null;  // null = anonymous
  amount:        number;               // in major currency units (not cents)
  currency:      string;
  donation_type: DonationType;
  interval:      DonationInterval | null;
  status:        DonationStatus;
  payment_intent_id: string | null;
  donated_at:    string;
}

// ─── Stripe Payment Intent ────────────────────────────────────────────────────

export interface StripePaymentIntentData {
  payment_intent_id: string;
  client_secret:     string;
  amount:            number;   // in cents
  currency:          string;
  status:            string;
}

// ─── Request Shapes ───────────────────────────────────────────────────────────

export interface CreateCampaignRequest {
  title:         string;
  description?:  string;
  goal_amount:   number;
  currency:      string;
  donation_type: DonationType;
  start_date?:   string;
  end_date?:     string;
  cover_image_url?: string;
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  status?: CampaignStatus;
}

export interface InitiateDonationRequest {
  amount:        number;          // in cents (multiply by 100 before sending)
  currency:      string;
  donation_type: DonationType;
  interval?:     DonationInterval;
}

export interface GetCampaignsQuery {
  status?: CampaignStatus;
  page?:   number;
  limit?:  number;
}

export interface GetDonationsQuery {
  page?:  number;
  limit?: number;
}

// ─── Response Shapes ──────────────────────────────────────────────────────────

export interface GetDonationsData {
  data:     DonationRecord[];
  metadata: {
    total_data:  number;
    total_page:  number;
    page:        number;
    limit:       number;
  };
}

// API response wrappers
export interface GetCampaignsResponse {
  success:  boolean;
  message:  string;
  data:     CampaignListItem[];
  metadata: {
    total_data:  number;
    total_page:  number;
    page:        number;
    limit:       number;
  };
}

export interface GetCampaignDetailResponse {
  success: boolean;
  message: string;
  data:    CampaignDetail;
}

export interface CreateCampaignResponse {
  success: boolean;
  message: string;
  data:    CampaignDetail;
}

export interface UpdateCampaignResponse {
  success: boolean;
  message: string;
  data:    CampaignDetail;
}

export interface InitiateDonationResponse {
  success: boolean;
  message: string;
  data:    StripePaymentIntentData;
}

export interface GetDonationsResponse {
  success: boolean;
  message: string;
  data:    GetDonationsData;
}

// ─────────────────────────────────────────────────────────────────────────────
// MY DONATIONS (self-service, "me" namespace)
// GET /me/donations         — list, cross-masjid
// GET /me/donations/:id     — single detail
//
// NOTE: this is a DIFFERENT shape from DonationRecord/GetDonationsResponse
// above (those are masjid-scoped campaign donation ledgers keyed by
// `user`/`campaign_id`). This section reflects the real
// GET /api/v2/me/donations response, which nests `masjid` and
// `campaign` refs on each item instead of `user`/`campaign_id`.
// ─────────────────────────────────────────────────────────────────────────────

export interface MyDonationMasjidRef {
  id:   string;
  name: string;
}

export interface MyDonationCampaignRef {
  id:    string;
  title: string;
}

// ── List item (from GET /me/donations) ────────────────────────────────────────

export interface MyDonationListItem {
  id:         string;
  masjid:     MyDonationMasjidRef;
  campaign:   MyDonationCampaignRef;
  amount:     number;    // major currency units (e.g. 1 = $1.00)
  currency:   string;
  status:     DonationStatus;
  donated_at: string;
}

export interface MyDonationsSummary {
  total_donated: number;
  currency:      string;
}

export interface GetMyDonationsData {
  donations: MyDonationListItem[];
  summary:   MyDonationsSummary;
}

export interface GetMyDonationsResponse {
  success:  boolean;
  message:  string;
  data:     GetMyDonationsData;
  metadata: {
    total_data: number;
    total_page: number;
    page:       number;
    limit:      number;
  };
}

export interface GetMyDonationsQuery {
  page?:  number;
  limit?: number;
}

// ── Detail item (from GET /me/donations/:id) ──────────────────────────────────
// Superset of MyDonationListItem — adds donation_type, payment_method,
// and receipt_url, which are not present on the list endpoint.

export interface MyDonationDetail extends MyDonationListItem {
  donation_type:  DonationType;
  payment_method: string;
  receipt_url:    string;
}

export interface GetMyDonationDetailResponse {
  success: boolean;
  message: string;
  data:    MyDonationDetail;
}