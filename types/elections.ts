/**
 * types/elections.ts
 * UWS Phase 1 — Election Module Types
 * Covers: GOV-01/02 · ELS-01–08 · VB-01–08 · ARC-01–03
 *
 * Response shapes follow two patterns — note: Election module uses a
 * non-standard pagination shape { pagination: { page, limit, total } }
 * for list endpoints instead of the global ApiPaginatedResponse envelope.
 */

import type { ApiResponse, UserRef } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type SlateStatus = "open" | "locked";

export type PositionStatus = "pending_draft" | "active_setup" | "locked";

export type ElectionStatus = "active" | "frozen" | "closed";

export type BallotIntegrity = "active" | "warning" | "compromised";

export type RoleBundle =
  | "executive_admin"
  | "treasurer"
  | "secretary"
  | "general_council_member";

export type PositionType =
  | "executive_board"
  | "trustees"
  | "shura_council"
  | "all";

export type ArchiveStatus = "certified" | "all";

export type ReportFormat = "pdf" | "csv" | "json";

export type NotificationTemplate =
  | "gentle_reminder"
  | "last_chance"
  | "deadline_today";

export type NotificationChannel = "mobile_push" | "sms";

export type EmergencyStopReason =
  | "suspected_fraud"
  | "technical_failure"
  | "admin_request";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED EMBEDDED SHAPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateRef {
  user_id: string;
  name: string;
}

export interface ElectionPagination {
  page: number;
  limit: number;
  total: number;
}

export interface ElectionListEnvelope<T> {
  data: T[];
  pagination: ElectionPagination;
}

// ─────────────────────────────────────────────────────────────────────────────
// GOV-01 — Role Mapping
// PUT /masjids/:masjid_id/elections/positions/:id/role-mapping
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// ELS-01 — Create Slate
// POST /masjids/:masjid_id/elections/slate
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateSlateRequest {
  term_start: number;
  term_end: number;
  label: string;
  masjid_id: string;
}

export interface SlateData {
  slate_id: string;
  label: string;
  term_start: number;
  term_end: number;
  status: SlateStatus;
  position_count?: number;
  locked_at?: string | null;
  created_at: string;
}

export type CreateSlateResponse = ApiResponse<SlateData>;

// ─────────────────────────────────────────────────────────────────────────────
// ELS-02 — Add Position
// POST /masjids/:masjid_id/elections/slate/:slate_id/positions
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePositionRequest {
  position_name: string;
  role_bundle: RoleBundle;
  term_start: number;
  term_end: number;
}

export interface PositionData {
  position_id: string;
  slate_id: string;
  position_name: string;
  role_bundle: RoleBundle;
  status: PositionStatus;
  candidate_count: number;
  created_at?: string;
  updated_at?: string;
}

export type CreatePositionResponse = ApiResponse<PositionData>;

// ─────────────────────────────────────────────────────────────────────────────
// ELS-03 — Update Position
// PUT /masjids/:masjid_id/elections/slate/:slate_id/positions/:position_id
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdatePositionRequest {
  position_name?: string;
  role_bundle?: RoleBundle;
  term_start?: number;
  term_end?: number;
}

export interface UpdatePositionData {
  position_id: string;
  position_name: string;
  role_bundle: RoleBundle;
  status: PositionStatus;
  updated_at: string;
}

export type UpdatePositionResponse = ApiResponse<UpdatePositionData>;

// ─────────────────────────────────────────────────────────────────────────────
// ELS-04 — Set Candidates
// PUT /masjids/:masjid_id/elections/slate/:slate_id/positions/:position_id/candidates
// ─────────────────────────────────────────────────────────────────────────────

export interface SetCandidatesRequest {
  candidate_user_ids: string[];
}

export interface SetCandidatesData {
  position_id: string;
  candidate_count: number;
  candidates: CandidateRef[];
  status: PositionStatus;
  updated_at: string;
}

export type SetCandidatesResponse = ApiResponse<SetCandidatesData>;

// ─────────────────────────────────────────────────────────────────────────────
// ELS-05 — Lock Slate
// POST /masjids/:masjid_id/elections/slate/:slate_id/lock
// ─────────────────────────────────────────────────────────────────────────────

export interface LockSlateRequest {
  deadline_days: number;
  confirm_lock: true;
}

export interface LockSlateData {
  slate_id: string;
  status: "locked";
  positions_locked: number;
  voting_deadline: string;
  locked_at: string;
  audit_event_id: string;
}

export type LockSlateResponse = ApiResponse<LockSlateData>;

// ─────────────────────────────────────────────────────────────────────────────
// ELS-06 — List All Slates
// GET /masjids/:masjid_id/elections/slate
// ─────────────────────────────────────────────────────────────────────────────

export type SlateStatusFilter = "open" | "locked" | "all";

export interface GetSlatesResponse {
  data: SlateData[];
  pagination: ElectionPagination;
}

export interface GetSlatesQuery {
  page?: number;
  limit?: number;
  status?: SlateStatusFilter;
}

// ─────────────────────────────────────────────────────────────────────────────
// ELS-07 — Get Slate Detail
// GET /masjids/:masjid_id/elections/slate/:slate_id
// ─────────────────────────────────────────────────────────────────────────────

export interface SlatePositionDetail {
  position_id: string;
  position_name: string;
  role_bundle: RoleBundle;
  status: PositionStatus;
  term_start: number;
  term_end: number;
  candidate_count: number;
  candidates: CandidateRef[];
}

export interface SlateDetail {
  slate_id: string;
  label: string;
  term_start: number;
  term_end: number;
  status: SlateStatus;
  locked_at: string | null;
  created_at: string;
  positions: SlatePositionDetail[];
}

export type GetSlateDetailResponse = ApiResponse<SlateDetail>;

// ─────────────────────────────────────────────────────────────────────────────
// ELS-08 — Get Single Position Detail
// GET /masjids/:masjid_id/elections/slate/:slate_id/positions/:position_id
// ─────────────────────────────────────────────────────────────────────────────

export interface PositionDetail {
  position_id: string;
  slate_id: string;
  position_name: string;
  role_bundle: RoleBundle;
  status: PositionStatus;
  term_start: number;
  term_end: number;
  candidate_count: number;
  candidates: CandidateRef[];
  created_at: string;
  updated_at: string;
}

export type GetPositionDetailResponse = ApiResponse<PositionDetail>;

// ─────────────────────────────────────────────────────────────────────────────
// VB-01 — Cast Secure Ballot
// POST /masjids/:masjid_id/elections/:election_id/ballot
// ─────────────────────────────────────────────────────────────────────────────

export interface CastBallotRequest {
  election_id: string;
  position_id: string;
  candidate_id: string;
  session_token: string;
}

export interface CastBallotData {
  ballot_id: string;
  verification_hash: string;
  status: "cast";
  cast_at: string;
  session_closed: boolean;
}

export type CastBallotResponse = ApiResponse<CastBallotData>;

// ─────────────────────────────────────────────────────────────────────────────
// VB-02 — Live Turnout Stats
// GET /masjids/:masjid_id/elections/:election_id/turnout
// ─────────────────────────────────────────────────────────────────────────────

export interface TurnoutData {
  participation_pct: number;
  ballots_cast: number;
  eligible_voters: number;
  remaining_voters: number;
  active_sessions: number;
  avg_vote_seconds: number;
  time_remaining_s: number;
  delta_pct_1hr: number;
  ballot_integrity: BallotIntegrity;
  refreshed_at: string;
}

export type GetTurnoutResponse = ApiResponse<TurnoutData>;

// ─────────────────────────────────────────────────────────────────────────────
// VB-03 — Notify Non-Voters
// POST /masjids/:masjid_id/elections/:election_id/notify-nonvoters
// ─────────────────────────────────────────────────────────────────────────────

export interface NotifyNonVotersRequest {
  message_template: NotificationTemplate;
  channel?: NotificationChannel;
}

export interface NotifyNonVotersData {
  job_id: string;
  recipients: number;
  status: "queued";
  estimated_eta_s: number;
  queued_at: string;
}

export type NotifyNonVotersResponse = ApiResponse<NotifyNonVotersData>;

// ─────────────────────────────────────────────────────────────────────────────
// VB-04 — Emergency Stop
// POST /masjids/:masjid_id/elections/:election_id/emergency-stop
// ─────────────────────────────────────────────────────────────────────────────

export interface EmergencyStopRequest {
  reason: EmergencyStopReason;
  initiated_by: string;
}

export interface EmergencyStopData {
  election_id: string;
  status: "frozen";
  sessions_killed: number;
  frozen_at: string;
  audit_event: string;
}

export type EmergencyStopResponse = ApiResponse<EmergencyStopData>;

// ─────────────────────────────────────────────────────────────────────────────
// VB-05 — List All Elections
// GET /masjids/:masjid_id/elections
// ─────────────────────────────────────────────────────────────────────────────

export type ElectionStatusFilter = "active" | "frozen" | "closed" | "all";

export interface ElectionListItem {
  election_id: string;
  slate_id: string;
  label: string;
  status: ElectionStatus;
  positions_count: number;
  eligible_voters: number;
  ballots_cast: number;
  participation_pct: number;
  voting_deadline: string;
  created_at: string;
}

export interface GetElectionsResponse {
  data: ElectionListItem[];
  pagination: ElectionPagination;
}

export interface GetElectionsQuery {
  page?: number;
  limit?: number;
  status?: ElectionStatusFilter;
}

// ─────────────────────────────────────────────────────────────────────────────
// VB-06 — Get Election Detail
// GET /masjids/:masjid_id/elections/:election_id
// ─────────────────────────────────────────────────────────────────────────────

export interface ElectionPositionSummary {
  position_id: string;
  position_name: string;
  role_bundle: RoleBundle;
  candidate_count: number;
  ballots_for_position: number;
}

export interface ElectionDetail {
  election_id: string;
  slate_id: string;
  label: string;
  status: ElectionStatus;
  eligible_voters: number;
  ballots_cast: number;
  participation_pct: number;
  voting_deadline: string;
  time_remaining_s: number | null;
  ballot_integrity: BallotIntegrity;
  created_at: string;
  positions: ElectionPositionSummary[];
}

export type GetElectionDetailResponse = ApiResponse<ElectionDetail>;

// ─────────────────────────────────────────────────────────────────────────────
// VB-07 — Election Candidates (Voter View)
// GET /masjids/:masjid_id/elections/:election_id/candidates
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateVoterView {
  candidate_id: string;
  name: string;
  bio: string;
}

export interface VoterPositionView {
  position_id: string;
  position_name: string;
  candidates: CandidateVoterView[];
}

export interface ElectionCandidatesData {
  election_id: string;
  label: string;
  voting_deadline: string;
  positions: VoterPositionView[];
}

export type GetElectionCandidatesResponse = ApiResponse<ElectionCandidatesData>;

// ─────────────────────────────────────────────────────────────────────────────
// VB-08 — My Ballot Status
// GET /masjids/:masjid_id/elections/:election_id/ballot-status
// ─────────────────────────────────────────────────────────────────────────────

export interface BallotStatusData {
  election_id: string;
  has_voted: boolean;
  voted_at: string | null;
  verification_hash: string | null;
}

export type GetBallotStatusResponse = ApiResponse<BallotStatusData>;

// ─────────────────────────────────────────────────────────────────────────────
// ARC-01 — Query Election Archive
// GET /masjids/:masjid_id/elections/archive
// ─────────────────────────────────────────────────────────────────────────────

export interface ArchiveResult {
  term_period: string;
  position: string;
  position_type: string;
  winner_id: string;
  winner_name: string;
  votes_cast: number;
  eligible: number;
  participation: number;
  status: "certified";
  role_mapped: boolean;
}

export interface GetArchiveResponse {
  total_records: number;
  page: number;
  per_page: number;
  results: ArchiveResult[];
}

export interface GetArchiveQuery {
  year_from?: number;
  year_to?: number;
  position_type?: PositionType;
  status?: ArchiveStatus;
  page?: number;
  per_page?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARC-02 — Archive Summary Stats
// GET /masjids/:masjid_id/elections/archive/stats
// ─────────────────────────────────────────────────────────────────────────────

export interface ArchiveStatsData {
  total_elections: number;
  total_elected_members: number;
  avg_participation_pct: number;
  terms_on_record: number;
  year_range: {
    from: number;
    to: number;
  };
}

export type GetArchiveStatsResponse = ApiResponse<ArchiveStatsData>;

// ─────────────────────────────────────────────────────────────────────────────
// ARC-03 — Generate Annual Report
// GET /masjids/:masjid_id/elections/archive/annual-report
// ─────────────────────────────────────────────────────────────────────────────

export interface AnnualReportData {
  job_id: string;
  year: number;
  format: ReportFormat;
  status: "generating" | "cached";
  poll_url: string;
  download_url?: string;  // present when status=cached
  queued_at: string;
}

export type GetAnnualReportResponse = ApiResponse<AnnualReportData>;

export interface GetAnnualReportQuery {
  year: number;
  format?: ReportFormat;
}
export interface SlateResponse {
  slate_id: string;
  masjid_id: string;
  label: string;
  term_start: number;
  term_end: number;
  status: "draft" | "locked";
  candidates_count: number;
  positions_count: number;
  created_at: string;
  locked_at: string | null;
}

export interface CreateSlateRequest {
  label: string;
  term_start: number;
  term_end: number;
}