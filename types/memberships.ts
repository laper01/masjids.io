/**
 * types/memberships.ts
 * UWS Membership & Payment Module — TypeScript Interfaces
 * Covers:
 *   MEM-ME-01  → MEM-ME-04   (member self-service, /me namespace)
 *   MEM-MISS-01 → MEM-MISS-09 (admin membership & payment endpoints)
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type MembershipStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "pending"
  | "suspended";

export type PaymentStatus = "paid" | "failed" | "refunded" | "pending" | "PENDING" | "PAID" | "FAILED" | "REFUNDED"

export type PaymentInterval = "monthly" | "yearly" | "one_time";

export type OnboardingStatus = "not_started" | "incomplete" | "complete";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED EMBEDDED SHAPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MembershipPagination {
  page: number;
  limit: number;
  total: number;
}

export interface MasjidRef {
  id: string;
  name: string;
  city?: string;
  logo_url?: string | null;
}

export interface TierSnapshot {
  id: string;
  name: string;
  price?: number;
  currency?: string;
  interval?: PaymentInterval;
  description?: string;
}

export interface TierSummary {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-ME-01 — Get All My Subscriptions
// GET /me/memberships
// ─────────────────────────────────────────────────────────────────────────────

export interface MyMembershipItem {
  membership_id: string;
  masjid: MasjidRef;
  tier: TierSnapshot;
  status: MembershipStatus;
  can_vote: boolean;
  started_at: string;
  next_billing_at: string | null;
  expires_at: string | null;
}

export interface GetMyMembershipsResponse {
  data: MyMembershipItem[];
  pagination: MembershipPagination;
}

export interface GetMyMembershipsQuery {
  page?: number;
  limit?: number;
  status?: MembershipStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-ME-02 — Get My Subscription at a Specific Masjid
// GET /me/memberships/:masjid_id
// ─────────────────────────────────────────────────────────────────────────────

export interface TierSnapshotWithDescription extends TierSnapshot {
  description: string;
}

export interface MyMembershipDetail {
  membership_id: string;
  masjid: MasjidRef;
  tier: TierSnapshotWithDescription;
  status: MembershipStatus;
  can_vote: boolean;
  payment_method: string;
  started_at: string;
  renewed_at: string | null;
  next_billing_at: string | null;
  expires_at: string | null;
  payment_count: number;
  total_paid: number;
}

export interface GetMyMembershipDetailResponse {
  success: boolean;
  message: string;
  data: MyMembershipDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-ME-03 — Get My Full Payment History (All Masjids)
// GET /me/memberships/history
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentHistorySummary {
  total_paid: number;
  currency: string;
  period: string;
}

export interface MyPaymentHistoryItem {
  payment_id: string;
  masjid: Pick<MasjidRef, "id" | "name">;
  tier_name: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  invoice_url: string | null;
}

// ✅ yang benar
export interface GetMyPaymentHistoryResponse {
  success: boolean;
  message: string;
  data: {
    history: MyPaymentHistoryItem[];
  };
  metadata: MembershipPagination;
}
export interface GetMyPaymentHistoryQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  from?: string; // ISO8601
  to?: string;   // ISO8601
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-ME-04 — Cancel My Subscription at a Masjid
// DELETE /me/memberships/:masjid_id
// ─────────────────────────────────────────────────────────────────────────────

export interface CancelMyMembershipRequest {
  reason?: string;
}

export interface CancelMyMembershipData {
  membership_id: string;
  masjid_id: string;
  status: "cancelled";
  cancelled_at: string;
  reason: string | null;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-01 — List All Memberships (Admin)
// GET /masjids/:masjid_id/memberships
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminMembershipItem {
  id: string;
  user_id: string;
  display_name: string;
  tier: TierSummary;
  status: MembershipStatus;
  payment_method: string;
  started_at: string;
  expires_at: string | null;
}

export interface GetAdminMembershipsResponse {
  data: AdminMembershipItem[];
  pagination: MembershipPagination;
}

export interface GetAdminMembershipsQuery {
  page?: number;
  limit?: number;
  status?: MembershipStatus;
  tier_id?: string;
  from?: string; // ISO8601
  to?: string;   // ISO8601
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-02 — Get Membership Detail (Admin)
// GET /masjids/:masjid_id/memberships/:membership_id
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminMembershipDetail {
  id: string;
  user_id: string;
  display_name: string;
  tier: TierSnapshot;
  status: MembershipStatus;
  can_vote: boolean;
  payment_method: string;
  started_at: string;
  renewed_at: string | null;
  expires_at: string | null;
  payment_count: number;
  total_paid: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-03 — Update Membership Status (Admin)
// PATCH /masjids/:masjid_id/memberships/:membership_id
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateMembershipRequest {
  status?: MembershipStatus;
  can_vote?: boolean;
  reason?: string;
}

export interface UpdateMembershipData {
  success: boolean;
  message: string;
  data: {
    status: MembershipStatus;
    can_vote: boolean;
    // field lain yang emang dibalikin backend, kalau ada
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-04 — Cancel Membership (Admin or Self)
// DELETE /masjids/:masjid_id/memberships/:membership_id
// ─────────────────────────────────────────────────────────────────────────────

export interface CancelMembershipRequest {
  reason?: string;
}

export interface CancelMembershipData {
  id: string;
  status: "cancelled";
  cancelled_at: string;
  reason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-05 — Get Membership Payment History
// GET /masjids/:masjid_id/memberships/:membership_id/history
// ─────────────────────────────────────────────────────────────────────────────

export interface MembershipPaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  invoice_url: string | null;
}

export interface GetMembershipHistoryResponse {
  data: MembershipPaymentRecord[];
  pagination: MembershipPagination;
}

export interface GetMembershipHistoryQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-06 — List All Payments (Admin)
// GET /masjids/:masjid_id/payments
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentSummary {
  total_collected: number;
  currency: string;
  period: string;
}

export interface AdminPaymentItem {
  id: string;
  membership_id: string;
  user_id: string;
  display_name: string;
  tier_name: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
   paid_at: string | null;  
}

export interface GetAdminPaymentsResponse {
  summary: PaymentSummary | null;
  data: AdminPaymentItem[];
  pagination: MembershipPagination;
}

export interface GetAdminPaymentsQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  tier_id?: string;
  from?: string; // ISO8601
  to?: string;   // ISO8601
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-07 — Get Single Payment Detail (Admin)
// GET /masjids/:masjid_id/payments/:payment_id
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminPaymentDetail {
  id: string;
  membership_id: string;
  user_id: string;
  display_name: string;
  tier_name: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failure_reason: string | null;
  gateway_ref: string;
  payment_method: string;
  period_start: string;
  period_end: string;
  created_at: string;
  invoice_url: string | null;
   paid_at: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-08 — Payment Gateway Webhook
// POST /masjids/:masjid_id/payments/webhook
// ─────────────────────────────────────────────────────────────────────────────

export type StripeWebhookEventType =
  | "invoice.payment_succeeded"
  | "invoice.payment_failed"
  | "customer.subscription.deleted";

export interface StripeWebhookPayload {
  id: string;
  type: StripeWebhookEventType | string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface WebhookAckResponse {
  received: true;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEM-MISS-09 — Get Payment Onboarding Status
// GET /masjids/:masjid_id/payments/onboarding/status
// ─────────────────────────────────────────────────────────────────────────────

export interface OnboardingRequirements {
  currently_due: string[];
  eventually_due: string[];
  past_due: string[];
}

export interface PaymentOnboardingStatus {
  masjid_id: string;
  onboarding_status: OnboardingStatus;
  stripe_account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: OnboardingRequirements;
  onboarding_url: string;
  checked_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER CRUD (from old app routes — Tier collection & single resource)
// GET/POST /masjids/:masjid_id/tiers
// GET/PUT/DELETE /masjids/:masjid_id/tiers/:tier_id
// ─────────────────────────────────────────────────────────────────────────────

export type TierVisibility = "public" | "private" | "invite_only";
export type TierBillingCycle = "monthly" | "yearly";

export interface Tier {
  id: string;
  masjid_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: TierBillingCycle;
  visibility?: TierVisibility;
  can_vote: boolean;
  max_members: number | null;
  current_member_count: number;
  benefits?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetTiersResponse {
  success: boolean;
  message: string;
  data: Tier[];
}

export interface GetTierDetailResponse {
  success: boolean;
  message: string;
  data: Tier;
}

export interface CreateTierRequest {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: TierBillingCycle;
  visibility?: TierVisibility;
  can_vote?: boolean;
  max_members?: number | null;
  benefits?: string[];
}

export interface CreateTierResponse {
  success: boolean;
  message: string;
  data: Tier;
}

export interface UpdateTierRequest {
  name?: string;
  description?: string;
  price?: number;
  interval?: TierBillingCycle;
  visibility?: TierVisibility;
  can_vote?: boolean;
  max_members?: number | null;
  benefits?: string[];
  is_active?: boolean;
}

export interface UpdateTierResponse {
  success: boolean;
  message: string;
  data: Tier;
}

export interface DeleteTierResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIBE TO TIER (from old app — POST /masjids/:masjid_id/memberships)
// ─────────────────────────────────────────────────────────────────────────────

export interface SubscribeToTierRequest {
  tier_id: string;
  payment_method: string;          // required by API — e.g. "credit_card"
  payment_method_id?: string;      // optional Stripe PaymentMethod ID
}

export interface SubscribeToTierData {
  membership_id: string;
  masjid_id: string;
  tier: TierSnapshot;  // ← sesuaikan, response pakai TierSnapshot bukan TierSummary
  status: MembershipStatus;
  can_vote: boolean;
  started_at: string;
  next_billing_at: string | null;
  payment_url: string | null;      // ← tambah ini
  external_id?: string;            // ← opsional, ada di response
  client_secret?: string | null;
}

export interface SubscribeToTierResponse {
  success: boolean;
  message: string;
  data: SubscribeToTierData;
}

// ─────────────────────────────────────────────────────────────────────────────
// MY MEMBERSHIP AT MASJID (from old app — GET /masjids/:masjid_id/memberships/me)
// ─────────────────────────────────────────────────────────────────────────────

export interface MyMasjidMembership {
  membership_id: string;
  masjid_id: string;
  tier: TierSnapshot;
  status: MembershipStatus;
  can_vote: boolean;
  started_at: string;
  renewed_at: string | null;
  next_billing_at: string | null;
  expires_at: string | null;
}

export interface GetMyMasjidMembershipResponse {
  success: boolean;
  message: string;
  data: MyMasjidMembership;
}


// Add these types to types/memberships.ts first:

export interface OnboardingLinkData {
  onboarding_url: string;
}

export interface GenerateOnboardingLinkResponse {
  success: boolean;
  message: string;
  data: OnboardingLinkData;
}

export interface GenerateOnboardingLinkRequest {
  email: string;
}


// Wrap PaymentOnboardingStatus dalam ApiResponse
export interface GetOnboardingStatusResponse {
  success: boolean;
  message: string;
  data: PaymentOnboardingStatus;
}