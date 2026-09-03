/**
 * UWS Phase 1 — API Types
 * masjids.io · Ummah Web Services
 * Base URL: /api/v2
 *
 * All response shapes follow two conventions:
 *   - Paginated  → ApiPaginatedResponse<T>  (includes metadata)
 *   - Single     → ApiResponse<T>           (data is object or array, no metadata)
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED / ENVELOPE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total_data: number;
  total_page: number;
  page: number;
  limit: number;
}

/** Response envelope WITHOUT pagination */
export interface ApiResponse<T> {
  metadata?: PaginationMeta; // ← optional for single-object responses
  success: boolean;
  message: string;
  data: T;
}

/** Response envelope WITH pagination metadata */
export interface ApiPaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  metadata: PaginationMeta;
}

/** Standard error response */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED EMBEDDED OBJECTS
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRef {
  id: string;
  name: string;
  email?: string;
}

export interface MasjidRef {
  id: string;
  name: string;
}

export interface GeoPin {
  lat: number;
  lng: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3.1 — PERMISSIONS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All valid permission scope strings.
 * Keep in sync with the Go backend seed data (limestone_v2).
 */
export type PermissionScope =
  // Masjid profile
  | "masjid:profile:edit"
  | "masjid:settings:manage"
  // Members
  | "members:view"
  | "members:manage"
  | "members:verify"
  | "members:export"
  // Notifications
  | "notifications:send"
  | "notifications:manage"
  // Announcements
  | "announcements:create"
  | "announcements:delete"
  // Donations
  | "donations:view"
  | "donations:manage"
  | "donations:report"
  | "donations:refund"
  // Payouts
  | "payouts:manage"
  // Website
  | "website:edit"
  | "website:publish"
  | "website:domains"
  | "website:view"      // ← ADD
  | "website:manage"
    
  // Events
  | "events:create"
  | "events:manage"
  // Facilities
  | "facilities:book"
  // Elections
  | "elections:create"
  | "elections:manage"
  | "elections:view_results"
  |"elections:vote"
  // Nikkah / Reverts
  | "nikkah:moderate"
  | "reverts:manage"
  | "matchmaking:access"
  // Permissions & Audit
  | "permissions:manage"
  | "audit:view";

// PERM-01 · GET /masjids/:masjid_id/permissions/role-templates
export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  permissions: PermissionScope[];
  is_system: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
  /** null for system templates; masjid UUID for custom templates. */
  masjid_id: string | null;
}

export type GetRoleTemplatesResponse = ApiPaginatedResponse<RoleTemplate>;

export interface GetRoleTemplatesQuery {
  page?: number;
  limit?: number;
  type?: "system" | "custom";
}

// PERM-02 · POST /masjids/:masjid_id/permissions/role-templates
export interface CreateRoleTemplateRequest {
  name: string;
  description: string;
  permissions: PermissionScope[];
}

/** Real backend returns the full template object on creation. */
export type CreateRoleTemplateData = RoleTemplate;

export type CreateRoleTemplateResponse = ApiResponse<CreateRoleTemplateData>;

// PERM-03 · PUT /masjids/:masjid_id/permissions/role-templates/:id
export interface UpdateRoleTemplateRequest {
  name: string;
  description: string;
  permissions: PermissionScope[];
}

/** Real backend returns the full updated template + affected member count. */
export type UpdateRoleTemplateData = RoleTemplate & {
  /** Number of members whose effective permissions were re-evaluated. */
  affected_member_count: number;
};

export type UpdateRoleTemplateResponse = ApiResponse<UpdateRoleTemplateData>;

// PERM-04 · POST /masjids/:masjid_id/permissions/grant
export interface GrantPermissionRequest {
  user_id: string;
  scope: PermissionScope;
  reason: string;
}

export interface GrantPermissionData {
  user_id: string;
  scope: PermissionScope;
  action: "granted";
  effective_scopes: PermissionScope[];
  audit_entry_id: string;
  granted_at: string;
}

export type GrantPermissionResponse = ApiResponse<GrantPermissionData>;

// PERM-05 · POST /masjids/:masjid_id/permissions/revoke
export interface RevokePermissionRequest {
  user_id: string;
  scope: PermissionScope;
  reason: string;
}

export interface RevokePermissionData {
  user_id: string;
  scope: PermissionScope;
  action: "revoked";
  effective_scopes: PermissionScope[];
  audit_entry_id: string;
  revoked_at: string;
}

export type RevokePermissionResponse = ApiResponse<RevokePermissionData>;

// PERM-06 · POST /masjids/:masjid_id/permissions/assign-role-template
export interface AssignRoleTemplateRequest {
  user_id: string;
  role_template_id: string;
  reason: string;
}

export interface AssignRoleTemplateData {
  user_id: string;
  role_template_id: string;
  role_name: string;
  effective_scopes: PermissionScope[];
  /**
   * Individually granted scopes layered on top of the template.
   * null when no individual grants exist (real backend returns null, not []).
   */
  granted_overrides: PermissionScope[] | null;
  /**
   * Individually revoked scopes subtracted from the template.
   * null when no individual revocations exist.
   */
  revoked_overrides: PermissionScope[] | null;
  audit_entry_id: string;
  assigned_at: string;
}

export type AssignRoleTemplateResponse = ApiResponse<AssignRoleTemplateData>;

// PERM-07 · GET /masjids/:masjid_id/permissions/audit-log
/**
 * Real backend returns "role_assigned" for template assignments.
 * "scope_granted" / "scope_revoked" for individual overrides.
 */
export type AuditAction =
  | "role_assigned"
  | "scope_granted"
  | "scope_revoked";

export interface AuditLogEntry {
  id: string;
  actor: UserRef | null;
  action: AuditAction;
  target_user: UserRef;
  /**
   * Scope string for scope_granted / scope_revoked actions,
   * or the role template name for role_assigned actions.
   */
  scope: string;
  reason: string;
  timestamp: string;
}

export type GetAuditLogResponse = ApiPaginatedResponse<AuditLogEntry>;

export interface GetAuditLogQuery {
  page?: number;
  limit?: number;
  actor_id?: string;
  action?: AuditAction;
  target_user_id?: string;
  from?: string; // ISO8601
  to?: string;   // ISO8601
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3.2 — FOLLOWERS SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

// FOL-01 · POST /masjids/:masjid_id/follow
export interface FollowMasjidData {
  masjid_id: string;
  following: true;
  follower_count: number;
  followed_at: string;
}

export type FollowMasjidResponse = ApiResponse<FollowMasjidData>;

// FOL-02 · DELETE /masjids/:masjid_id/follow
export interface UnfollowMasjidData {
  masjid_id: string;
  following: false;
  follower_count: number;
}

export type UnfollowMasjidResponse = ApiResponse<UnfollowMasjidData>;

// FOL-03 · GET /masjids/:masjid_id/follow/status
export interface FollowStatusData {
  masjid_id: string;
  following: boolean;
  follower_count: number;
}

export type GetFollowStatusResponse = ApiResponse<FollowStatusData>;

// FOL-04 · GET /masjids/:masjid_id/followers
export interface MasjidFollower {
  user_id: string;
  name: string;
  avatar_url: string;
  followed_at: string;
}

export interface GetFollowersData {
  masjid_id: string;
  follower_count: number;
followers: MasjidFollower[];
}

export type GetFollowersResponse = ApiResponse<GetFollowersData>;

export interface GetFollowersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// FOL-05 · GET /users/me/followed-masjids
export interface FollowedMasjidItem {
  masjid_id: string;
  name: string;
  city: string;
  follower_count: number;
  push_enabled: boolean;
  in_app_enabled: boolean;
  followed_at: string;
}

export type GetFollowedMasjidsResponse = ApiPaginatedResponse<FollowedMasjidItem>;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3.3 — NOTIFICATIONS INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType = "announcement" | "election" | "system";
export type PushPlatform = "fcm" | "apns" | "web";

// NOTIF-01 · GET /notifications
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  masjid: MasjidRef;
  source_id: string | null;  // API returns null
  read: boolean;
  unread_count: number;      //
  created_at: string;
}


export interface GetNotificationsData {
  data: NotificationItem[];
  metadata: PaginationMeta;
}

export type GetNotificationsResponse = ApiPaginatedResponse<NotificationItem>;

export interface GetNotificationsQuery {
  page?: number;
  limit?: number;
  read?: boolean;
  masjid_id?: string;
  type?: NotificationType;
}

// NOTIF-02 · PATCH /notifications/:id/read
export interface MarkNotificationReadData {
  id: string;
  read: true;
  read_at: string;
  unread_count: number;
}

export type MarkNotificationReadResponse = ApiResponse<MarkNotificationReadData>;

// NOTIF-03 · PATCH /notifications/read-all
export interface MarkAllReadRequest {
  masjid_id?: string;
}

export interface MarkAllReadData {
  marked_count: number;
  unread_count: number;
  updated_at: string;
}

export type MarkAllReadResponse = ApiResponse<MarkAllReadData>;

// NOTIF-04 · POST /notifications/device-token
export interface RegisterDeviceTokenRequest {
  token: string;
  platform: PushPlatform;
}

export interface DeviceTokenData {
  id: string;
  platform: PushPlatform;
  is_active: boolean;
  registered_at: string;
}

export type RegisterDeviceTokenResponse = ApiResponse<DeviceTokenData>;

// NOTIF-05 · DELETE /notifications/device-token/:id
export interface DeactivateDeviceTokenData {
  id: string;
  is_active: false;
  deactivated_at: string;
}

export type DeactivateDeviceTokenResponse = ApiResponse<DeactivateDeviceTokenData>;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3.4 — ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export type AnnouncementCategory =
  | "event"
  | "general"
  | "urgent"
  | "jumuah"
  | "fundraising";

export type BroadcastStatus = "queued" | "sent" | "failed";

// ANN-01 · POST /masjids/:masjid_id/announcements
export interface CreateAnnouncementRequest {
  title: string;
  body: string;
  category: AnnouncementCategory;
  media_url?: string;
}

export interface CreateAnnouncementData {
  id: string;
  masjid_id: string;
  title: string;
  category: AnnouncementCategory;
  broadcast_status: BroadcastStatus;
  follower_count: number;
  published_at: string;
}

export type CreateAnnouncementResponse = ApiResponse<CreateAnnouncementData>;

// ANN-02 · GET /masjids/:masjid_id/announcements
export interface AnnouncementListItem {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  media_url: string | null;
  published_at: string;
}

export type GetAnnouncementsResponse = ApiPaginatedResponse<AnnouncementListItem>;

export interface GetAnnouncementsQuery {
  page?: number;
  limit?: number;
  category?: AnnouncementCategory;
}

// ANN-03 · GET /masjids/:masjid_id/announcements/:id
export interface AnnouncementDetail {
  id: string;
  masjid: MasjidRef;
  title: string;
  body: string;
  category: AnnouncementCategory;
  media_url: string | null;
  published_at: string;
  updated_at: string;
}

export type GetAnnouncementDetailResponse = ApiResponse<AnnouncementDetail>;

// ANN-04 · PUT /masjids/:masjid_id/announcements/:id
export interface UpdateAnnouncementRequest {
  title: string;
  body: string;
  category: AnnouncementCategory;
}

export interface UpdateAnnouncementData {
  id: string;
  title: string;
  category: AnnouncementCategory;
  updated_at: string;
}

export type UpdateAnnouncementResponse = ApiResponse<UpdateAnnouncementData>;

// ANN-05 · DELETE /masjids/:masjid_id/announcements/:id
export interface DeleteAnnouncementData {
  id: string;
  deleted: true;
  deleted_at: string;
}

export type DeleteAnnouncementResponse = ApiResponse<DeleteAnnouncementData>;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3.5 — GOVERNANCE & ELECTION → ROLE PROMOTION
// ─────────────────────────────────────────────────────────────────────────────

// GOV-01 · PUT /masjids/:masjid_id/elections/positions/:id/role-mapping
export interface MapElectionRoleRequest {
  role_template_id: string;
  notes?: string;
}

export interface MapElectionRoleData {
  position_id: string;
  position_name: string;
  role_template_id: string;
  role_name: string;
  mapped_at: string;
}

export type MapElectionRoleResponse = ApiResponse<MapElectionRoleData>;

// GOV-02 · Internal Job — promoteElectionWinner (no HTTP payload)
// Defined here for typing internal service calls if needed
export interface PromoteElectionWinnerInput {
  election_id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3.6 — DONATION CAMPAIGNS (Stripe Connect)
// ─────────────────────────────────────────────────────────────────────────────

export type DonationType = "one_time" | "recurring" | "both";
export type CampaignStatus = "active" | "paused" | "closed";
export type DonationInterval = "month" | "year";
export type DonationStatus = "succeeded" | "pending" | "failed";

// DON-01 · POST /masjids/:masjid_id/donations/campaigns
export interface CreateCampaignRequest {
  title: string;
  description: string;
  goal_amount: number;
  currency: string; // ISO 4217
  donation_type: DonationType;
  end_date: string; // ISO8601
}

export interface CampaignData {
  id: string;
  masjid_id: string;
  title: string;
  goal_amount: number;
  raised_amount: number;
  currency: string;
  donation_type: DonationType;
  status: CampaignStatus;
  progress_pct: number;
  donor_count: number;
  created_at: string;
}

export type CreateCampaignResponse = ApiResponse<CampaignData>;

// DON-02 · GET /masjids/:masjid_id/donations/campaigns
export interface CampaignListItem {
  id: string;
  title: string;
  goal_amount: number;
  raised_amount: number;
  currency: string;
  donation_type: DonationType;
  status: CampaignStatus;
  progress_pct: number;
  donor_count: number;
}

export type GetCampaignsResponse = ApiPaginatedResponse<CampaignListItem>;

export interface GetCampaignsQuery {
  page?: number;
  limit?: number;
  status?: CampaignStatus;
}

// DON-03 · GET /masjids/:masjid_id/donations/campaigns/:id
export interface CampaignDetail {
  id: string;
  masjid: MasjidRef;
  title: string;
  description: string;
  goal_amount: number;
  raised_amount: number;
  currency: string;
  donation_type: DonationType;
  status: CampaignStatus;
  progress_pct: number;
  donor_count: number;
  start_date?: string;
  end_date: string;
  cover_image_url?: string | null;
}

export type GetCampaignDetailResponse = ApiResponse<CampaignDetail>;

// DON-04 · PUT /masjids/:masjid_id/donations/campaigns/:id
export interface UpdateCampaignRequest {
  title?: string;
  description?: string;
  goal_amount?: number;
  status?: CampaignStatus;
}

export interface UpdateCampaignData {
  id: string;
  title: string;
  goal_amount: number;
  status: CampaignStatus;
  updated_at: string;
}

export type UpdateCampaignResponse = ApiResponse<UpdateCampaignData>;

// DON-05 · POST /masjids/:masjid_id/donations/campaigns/:id/donate
export interface InitiateDonationRequest {
  amount: number;
  currency: string;
  donation_type: Exclude<DonationType, "both">;
  interval?: DonationInterval;
}

export interface InitiateDonationData {
  payment_intent_id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: "requires_payment_method";
  stripe_account_id?: string;   // ← tambah ini
}

export type InitiateDonationResponse = ApiResponse<InitiateDonationData>;

// DON-06 · GET /masjids/:masjid_id/donations/campaigns/:id/donations
export interface DonationRecord {
  id: string;
  user: UserRef;
  amount: number;
  currency: string;
  donation_type: Exclude<DonationType, "both">;
  status: DonationStatus;
  donated_at: string;
}

export interface GetDonationsData {
  campaign_id: string;
  total_raised: number;
  donor_count: number;
  data: DonationRecord[];
  metadata: PaginationMeta;
}

export type GetDonationsResponse = ApiResponse<GetDonationsData>;

export interface GetDonationsQuery {
  page?: number;
  limit?: number;
  type?: Exclude<DonationType, "both">;
  from?: string; // ISO8601
  to?: string;   // ISO8601
}

// DON-07 · POST /webhooks/stripe
export interface StripeWebhookPayload {
  id: string;
  type: "payment_intent.succeeded" | "invoice.paid";
  data: {
    object: Record<string, unknown>; // Stripe PaymentIntent or Invoice
  };
}

export interface StripeWebhookData {
  received: true;
  donation_id: string;
  campaign_raised: number;
  progress_pct: number;
}

export type StripeWebhookResponse = ApiResponse<StripeWebhookData>;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3.7 — MASJID DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

export type MasjidService = "Halal" | "Funeral" | "Nikah" | "Weekend School";

// DIR-01 · GET /masjids
export interface MasjidDirectoryItem {
  id: string;
  name: string;
  city: string;
  country: string; // ISO 3166
  languages: string[];
  services: MasjidService[];
  follower_count: number;
  verified: boolean;
  thumbnail_url: string;
}

export type GetMasjidDirectoryResponse = ApiPaginatedResponse<MasjidDirectoryItem>;

export interface GetMasjidDirectoryQuery {
  page?: number;
  limit?: number;
  q?: string;
  city?: string;
  country?: string; // ISO 3166
  language?: string;
  services?: MasjidService[];
}

// DIR-02 · GET /masjids/:masjid_id/profile
export interface MasjidLocation {
  address: string;
  city: string;
  country: string;
  geo_pin: GeoPin;
  website_url: string;
}

export interface MasjidFacilities {
  capacity: number;
  languages: string[];
  womens_section: boolean;
  services: MasjidService[];
}

export interface MasjidProfile {
  id: string;
  name: string;
  bio: string;
  founded_year: number;
  location: MasjidLocation;
  facilities: MasjidFacilities;
  follower_count: number;
  verified: boolean;
  announcements: AnnouncementListItem[];
  active_campaigns: CampaignListItem[];
}

export type GetMasjidProfileResponse = ApiResponse<MasjidProfile>;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3.8 — USER INVITATION & STAFF MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

// INV-01 · POST /masjids/:masjid_id/staff/invite
export interface InviteStaffRequest {
  email: string;
  role_template_id: string;
  role_name: string;
  message?: string;
}

export interface InvitationData {
  invite_id: string;
  email: string;
  role_template_id: string;
  role_name: string;
  status: InvitationStatus;
  expires_at: string;
  invited_by: UserRef;
  created_at: string;
}

export type InviteStaffResponse = ApiResponse<InvitationData>;

// INV-02 · GET /masjids/:masjid_id/staff/invitations
export type GetInvitationsResponse = ApiPaginatedResponse<InvitationData>;

export interface GetInvitationsQuery {
  page?: number;
  limit?: number;
  status?: InvitationStatus;
}

// INV-03 · DELETE /masjids/:masjid_id/staff/invitations/:invite_id
export interface RevokeInvitationData {
  invite_id: string;
  email: string;
  status: "revoked";
  revoked_at: string;
}

export type RevokeInvitationResponse = ApiResponse<RevokeInvitationData>;

// INV-04 · POST /invitations/:token/accept
export interface AcceptInvitationData {
  masjid_id: string;
  masjid_name: string;
  role_template_id: string;
  role_name: string;
  effective_scopes: PermissionScope[];
  audit_entry_id: string;
  accepted_at: string;
}

export type AcceptInvitationResponse = ApiResponse<AcceptInvitationData>;

// INV-05 · GET /masjids/:masjid_id/staff
export interface StaffMember {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string;
  role_template_id: string;
  role_name: string;
  effective_scope_count: number;
  joined_at: string;
}

export type GetStaffResponse = ApiPaginatedResponse<StaffMember>;

export interface GetStaffQuery {
  page?: number;
  limit?: number;
  search?: string;
  role_template_id?: string;
}

// INV-06 · DELETE /masjids/:masjid_id/staff/:user_id
export interface RemoveStaffData {
  user_id: string;
  masjid_id: string;
  removed: true;
  audit_entry_id: string;
  removed_at: string;
}


//  * ─── PERM-08 · GET /masjids/:masjid_id/permissions/user/:user_id ─────────────
//  */
 
export interface UserEffectiveRoleTemplate {
  id:        string;
  name:      string;
  is_system: boolean;
}
 
export interface UserEffectivePermissions {
  user_id:           string;
  display_name:      string;
  role_template:     UserEffectiveRoleTemplate;
  effective_scopes:  PermissionScope[];
  granted_overrides: PermissionScope[] | null;
  revoked_overrides: PermissionScope[] | null;
  computed_at:       string;
}
 
export type GetUserEffectivePermissionsResponse = ApiResponse<UserEffectivePermissions>;

export type RemoveStaffResponse = ApiResponse<RemoveStaffData>;