/**
 * hooks/elections/useElections.ts
 *
 * Client-side data-fetching hook for the full Election module.
 * Covers: GOV-01 · ELS-01–08 · VB-01–08 · ARC-01–03
 *
 * ─── Admin actions (elections:manage / elections:read) ───────────────────────
 *   Slate Management:
 *     - getSlates(masjidId, query)                      ELS-06 GET
 *     - getSlateDetail(masjidId, slateId)               ELS-07 GET
 *     - createSlate(masjidId, payload)                  ELS-01 POST
 *     - addPosition(masjidId, slateId, payload)         ELS-02 POST
 *     - getPositionDetail(masjidId, slateId, posId)     ELS-08 GET
 *     - updatePosition(masjidId, slateId, posId, body)  ELS-03 PUT
 *     - setCandidates(masjidId, slateId, posId, ids)    ELS-04 PUT
 *     - lockSlate(masjidId, slateId, payload)           ELS-05 POST
 *     - mapElectionRole(masjidId, posId, payload)       GOV-01 PUT
 *
 *   Election Monitoring:
 *     - getElections(masjidId, query)                   VB-05  GET
 *     - getElectionDetail(masjidId, electionId)         VB-06  GET
 *     - getTurnout(masjidId, electionId)                VB-02  GET
 *     - notifyNonVoters(masjidId, electionId, payload)  VB-03  POST
 *     - emergencyStop(masjidId, electionId, payload)    VB-04  POST
 *
 *   Archives:
 *     - getArchive(masjidId, query)                     ARC-01 GET
 *     - getArchiveStats(masjidId)                       ARC-02 GET
 *     - getAnnualReport(masjidId, query)                ARC-03 GET
 *
 * ─── Member/Voter actions (elections:vote) ───────────────────────────────────
 *     - getElectionCandidates(masjidId, electionId)     VB-07  GET
 *     - getBallotStatus(masjidId, electionId)           VB-08  GET
 *     - castBallot(masjidId, electionId, payload)       VB-01  POST
 *
 * FIX (this revision):
 *   Several optimistic-update callbacks assumed that once a parent state
 *   slice (e.g. `prev.slates`, `prev.elections`) was truthy, its nested
 *   `data` array and `pagination` object were guaranteed to exist and be
 *   well-formed. If a fetch resolved with an unexpected shape (missing
 *   `data`, `data` not an array, missing `pagination`), spreading/mapping
 *   over it threw "X.data is not iterable" or similar. Fixed in:
 *     - createSlate  (prev.slates.data spread + pagination.total access)
 *     - lockSlate    (prev.slates.data.map)
 *     - emergencyStop (prev.elections.data.map)
 *   All now guard with Array.isArray() and safe fallbacks before touching
 *   nested fields.
 *
 * FIX (this revision, part 2):
 *   castBallot previously reused the SAME shared `loading`/`error` state
 *   slice as every other action in this hook (getElections, getTurnout's
 *   30s poll, etc). This caused a visible race: a failed vote would set
 *   `error`, which the caller's global error banner would render for one
 *   frame, before the caller cleared it a moment later to show its own
 *   inline message — a "flash and disappear" banner. Worse, since the
 *   30s turnout poll (getTurnout) also resets `error: null` on every
 *   successful poll, a cast-vote error could be silently wiped out by an
 *   unrelated background poll.
 *
 *   castBallot now has its own dedicated `castingBallot` / `castBallotError`
 *   state, completely decoupled from the shared `loading`/`error` used by
 *   every other action. It also now THROWS on failure (instead of quietly
 *   returning null) so callers can get the error message directly from a
 *   try/catch at the call site — no reading of shared state, no stale
 *   closures, no race conditions.
 */

"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { ApiErrorResponse } from "@/types/api";
import type {
  // Slates
  GetSlatesResponse, GetSlatesQuery,
  GetSlateDetailResponse,
  CreateSlateResponse, CreateSlateRequest,
  CreatePositionResponse, CreatePositionRequest,
  GetPositionDetailResponse,
  UpdatePositionResponse, UpdatePositionRequest,
  SetCandidatesResponse,
  LockSlateResponse, LockSlateRequest,
  // Role mapping
  MapElectionRoleResponse, MapElectionRoleRequest,
  // Elections
  GetElectionsResponse, GetElectionsQuery,
  GetElectionDetailResponse,
  GetTurnoutResponse,
  NotifyNonVotersResponse, NotifyNonVotersRequest,
  EmergencyStopResponse, EmergencyStopRequest,
  // Voter
  GetElectionCandidatesResponse,
  GetBallotStatusResponse,
  CastBallotResponse, CastBallotRequest,
  // Archive
  GetArchiveResponse, GetArchiveQuery,
  GetArchiveStatsResponse,
  GetAnnualReportResponse, GetAnnualReportQuery,
  // Shared
  SlateDetail,
  ElectionDetail,
} from "@/types/elections";

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface ElectionsState {
  // Slate management
  slates: GetSlatesResponse | null;
  slateDetail: GetSlateDetailResponse | null;
  positionDetail: GetPositionDetailResponse | null;

  // Election monitoring
  elections: GetElectionsResponse | null;
  electionDetail: GetElectionDetailResponse | null;
  turnout: GetTurnoutResponse | null;

  // Voter
  electionCandidates: GetElectionCandidatesResponse | null;
  ballotStatus: GetBallotStatusResponse | null;
  castBallotResult: CastBallotResponse | null;
  // ★ Dedicated cast-ballot state — never shares the global loading/error
  // slice, so a vote failure can't be raced or silently cleared by an
  // unrelated action (e.g. the 30s turnout poll).
  castingBallot: boolean;
  castBallotError: string | null;

  // Archive
  archive: GetArchiveResponse | null;
  archiveStats: GetArchiveStatsResponse | null;
  annualReport: GetAnnualReportResponse | null;

  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildQueryString(params: object): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useElections() {
  const [state, setState] = useState<ElectionsState>({
    slates: null,
    slateDetail: null,
    positionDetail: null,
    elections: null,
    electionDetail: null,
    turnout: null,
    electionCandidates: null,
    ballotStatus: null,
    castBallotResult: null,
    castingBallot: false,
    castBallotError: null,
    archive: null,
    archiveStats: null,
    annualReport: null,
    loading: false,
    error: null,
  });

  const startLoading = () =>
    setState((prev) => ({ ...prev, loading: true, error: null }));

  const setError = (message: string) =>
    setState((prev) => ({ ...prev, loading: false, error: message }));

  // ─────────────────────────────────────────────────────────────────────────
  // SLATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  // ELS-06: GET slates list
  const getSlates = useCallback(
    async (masjidId: string, query: GetSlatesQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query);
        const data = await apiFetch<GetSlatesResponse>(
          `/api/masjids/${masjidId}/elections/slate${qs}`
        );
        setState((prev) => ({ ...prev, slates: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch slates.");
        return null;
      }
    },
    []
  );

  // ELS-07: GET slate detail
  const getSlateDetail = useCallback(
    async (masjidId: string, slateId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetSlateDetailResponse>(
          `/api/masjids/${masjidId}/elections/slate/${slateId}`
        );
        setState((prev) => ({ ...prev, slateDetail: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch slate detail.");
        return null;
      }
    },
    []
  );

  // ELS-01: POST create slate
  const createSlate = useCallback(
    async (masjidId: string, payload: Omit<CreateSlateRequest, "masjid_id">) => {
      startLoading();
      try {
        const data = await apiFetch<CreateSlateResponse>(
          `/api/masjids/${masjidId}/elections/slate`,
          { method: "POST", body: JSON.stringify({ ...payload, masjid_id: masjidId }) }
        );
        // Optimistically prepend to slates list.
        // Guard: prev.slates may be truthy but its `data`/`pagination`
        // fields may be missing or malformed (e.g. first-ever create
        // before a successful getSlates call resolved with the expected
        // shape). Never assume prev.slates.data is an array.
        setState((prev) => {
          const prevItems = Array.isArray(prev.slates?.data) ? prev.slates!.data : [];
          const prevTotal = prev.slates?.pagination?.total ?? prevItems.length;

          return {
            ...prev,
            loading: false,
            error: null,
            slates: prev.slates
              ? {
                  ...prev.slates,
                  data: [data.data, ...prevItems],
                  pagination: { ...prev.slates.pagination, total: prevTotal + 1 },
                }
              : ({
                  ...(data as unknown as GetSlatesResponse),
                  data: [data.data],
                } as GetSlatesResponse),
          };
        });
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create slate.");
        return null;
      }
    },
    []
  );

  // ELS-02: POST add position to slate
  const addPosition = useCallback(
    async (masjidId: string, slateId: string, payload: CreatePositionRequest) => {
      startLoading();
      try {
        const data = await apiFetch<CreatePositionResponse>(
          `/api/masjids/${masjidId}/elections/slate/${slateId}/positions`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        // Optimistically add position to slateDetail
        setState((prev) => {
          if (!prev.slateDetail) return { ...prev, loading: false, error: null };
          const current = prev.slateDetail.data as SlateDetail;
          const prevPositions = Array.isArray(current?.positions) ? current.positions : [];
          return {
            ...prev,
            loading: false,
            error: null,
            slateDetail: {
              ...prev.slateDetail,
              data: {
                ...current,
                positions: [
                  ...prevPositions,
                  {
                    position_id: data.data.position_id,
                    position_name: data.data.position_name,
                    role_bundle: data.data.role_bundle,
                    status: data.data.status,
                    term_start: payload.term_start,
                    term_end: payload.term_end,
                    candidate_count: 0,
                    candidates: [],
                  },
                ],
              },
            },
          };
        });
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add position.");
        return null;
      }
    },
    []
  );

  // ELS-08: GET position detail
  const getPositionDetail = useCallback(
    async (masjidId: string, slateId: string, positionId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetPositionDetailResponse>(
          `/api/masjids/${masjidId}/elections/slate/${slateId}/positions/${positionId}`
        );
        setState((prev) => ({ ...prev, positionDetail: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch position detail.");
        return null;
      }
    },
    []
  );

  // ELS-03: PUT update position
  const updatePosition = useCallback(
    async (masjidId: string, slateId: string, positionId: string, payload: UpdatePositionRequest) => {
      startLoading();
      try {
        const data = await apiFetch<UpdatePositionResponse>(
          `/api/masjids/${masjidId}/elections/slate/${slateId}/positions/${positionId}`,
          { method: "PUT", body: JSON.stringify(payload) }
        );
        // Patch slateDetail positions list
        setState((prev) => {
          if (!prev.slateDetail) return { ...prev, loading: false, error: null, slateDetail: null };
          const current = prev.slateDetail.data as SlateDetail;
          const prevPositions = Array.isArray(current?.positions) ? current.positions : [];
          return {
            ...prev,
            loading: false,
            error: null,
            slateDetail: {
              ...prev.slateDetail,
              data: {
                ...current,
                positions: prevPositions.map((p) =>
                  p.position_id === positionId
                    ? { ...p, position_name: data.data.position_name, role_bundle: data.data.role_bundle, status: data.data.status }
                    : p
                ),
              },
            },
          };
        });
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update position.");
        return null;
      }
    },
    []
  );

  // ELS-04: PUT set candidates
  const setCandidates = useCallback(
    async (masjidId: string, slateId: string, positionId: string, candidateUserIds: string[]) => {
      startLoading();
      try {
        const data = await apiFetch<SetCandidatesResponse>(
          `/api/masjids/${masjidId}/elections/slate/${slateId}/positions/${positionId}/candidates`,
          { method: "PUT", body: JSON.stringify({ candidate_user_ids: candidateUserIds }) }
        );
        // Patch slate positions with updated candidates
        setState((prev) => {
          if (!prev.slateDetail) return { ...prev, loading: false, error: null, slateDetail: null };
          const current = prev.slateDetail.data as SlateDetail;
          const prevPositions = Array.isArray(current?.positions) ? current.positions : [];
          return {
            ...prev,
            loading: false,
            error: null,
            slateDetail: {
              ...prev.slateDetail,
              data: {
                ...current,
                positions: prevPositions.map((p) =>
                  p.position_id === positionId
                    ? { ...p, candidates: data.data.candidates, candidate_count: data.data.candidate_count, status: data.data.status }
                    : p
                ),
              },
            },
          };
        });
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set candidates.");
        return null;
      }
    },
    []
  );

  // ELS-05: POST lock slate
  const lockSlate = useCallback(
    async (masjidId: string, slateId: string, payload: LockSlateRequest) => {
      startLoading();
      try {
        const data = await apiFetch<LockSlateResponse>(
          `/api/masjids/${masjidId}/elections/slate/${slateId}/lock`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        // Patch slate status in both lists.
        // Guard: prev.slates may be truthy with a non-array `data`.
        setState((prev) => {
          const slatesUpdated = prev.slates
            ? {
                ...prev.slates,
                data: (Array.isArray(prev.slates.data) ? prev.slates.data : []).map((s) =>
                  s.slate_id === slateId ? { ...s, status: "locked" as const, locked_at: data.data.locked_at } : s
                ),
              }
            : null;

          return {
            ...prev,
            loading: false,
            error: null,
            slates: slatesUpdated,
            slateDetail: prev.slateDetail
              ? { ...prev.slateDetail, data: { ...(prev.slateDetail.data as SlateDetail), status: "locked" as const } }
              : null,
          };
        });
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to lock slate.");
        return null;
      }
    },
    []
  );

  // GOV-01: PUT map election position to role template
  const mapElectionRole = useCallback(
    async (masjidId: string, positionId: string, payload: MapElectionRoleRequest) => {
      startLoading();
      try {
        const data = await apiFetch<MapElectionRoleResponse>(
          `/api/masjids/${masjidId}/elections/positions/${positionId}/role-mapping`,
          { method: "PUT", body: JSON.stringify(payload) }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to map election role.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ELECTION MONITORING (Admin)
  // ─────────────────────────────────────────────────────────────────────────

  // VB-05: GET elections list
  const getElections = useCallback(
    async (masjidId: string, query: GetElectionsQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query);
        const data = await apiFetch<GetElectionsResponse>(
          `/api/masjids/${masjidId}/elections${qs}`
        );
        setState((prev) => ({ ...prev, elections: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch elections.");
        return null;
      }
    },
    []
  );

  // VB-06: GET election detail
  const getElectionDetail = useCallback(
    async (masjidId: string, electionId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetElectionDetailResponse>(
          `/api/masjids/${masjidId}/elections/${electionId}`
        );
        setState((prev) => ({ ...prev, electionDetail: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch election detail.");
        return null;
      }
    },
    []
  );

  // VB-02: GET live turnout
  const getTurnout = useCallback(
    async (masjidId: string, electionId: string) => {
      // Silent refresh — don't show global loading spinner for polls, and
      // don't touch the shared `error` field either (a background poll
      // succeeding shouldn't wipe out an unrelated error another action
      // just surfaced).
      try {
        const data = await apiFetch<GetTurnoutResponse>(
          `/api/masjids/${masjidId}/elections/${electionId}/turnout`
        );
        setState((prev) => ({ ...prev, turnout: data }));
        return data;
      } catch (err) {
        // Non-blocking — turnout poll failures should not disrupt the UI
        console.warn("[getTurnout] polling error:", err instanceof Error ? err.message : err);
        return null;
      }
    },
    []
  );

  // VB-03: POST notify non-voters
  const notifyNonVoters = useCallback(
    async (masjidId: string, electionId: string, payload: NotifyNonVotersRequest) => {
      startLoading();
      try {
        const data = await apiFetch<NotifyNonVotersResponse>(
          `/api/masjids/${masjidId}/elections/${electionId}/notify-nonvoters`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send non-voter notifications.");
        return null;
      }
    },
    []
  );

  // VB-04: POST emergency stop
  const emergencyStop = useCallback(
    async (masjidId: string, electionId: string, payload: EmergencyStopRequest) => {
      startLoading();
      try {
        const data = await apiFetch<EmergencyStopResponse>(
          `/api/masjids/${masjidId}/elections/${electionId}/emergency-stop`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        // Patch election status → frozen.
        // Guard: prev.elections may be truthy with a non-array `data`.
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          elections: prev.elections
            ? {
                ...prev.elections,
                data: (Array.isArray(prev.elections.data) ? prev.elections.data : []).map((e) =>
                  e.election_id === electionId ? { ...e, status: "frozen" as const } : e
                ),
              }
            : null,
          electionDetail: prev.electionDetail
            ? { ...prev.electionDetail, data: { ...(prev.electionDetail.data as ElectionDetail), status: "frozen" as const } }
            : null,
        }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to execute emergency stop.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // VOTER ACTIONS (Member)
  // ─────────────────────────────────────────────────────────────────────────

  // VB-07: GET election candidates (voter view)
  const getElectionCandidates = useCallback(
    async (masjidId: string, electionId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetElectionCandidatesResponse>(
          `/api/masjids/${masjidId}/elections/${electionId}/candidates`
        );
        setState((prev) => ({ ...prev, electionCandidates: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch election candidates.");
        return null;
      }
    },
    []
  );

  // VB-08: GET ballot status
  const getBallotStatus = useCallback(
    async (masjidId: string, electionId: string) => {
      startLoading();
      try {
        const data = await apiFetch<GetBallotStatusResponse>(
          `/api/masjids/${masjidId}/elections/${electionId}/ballot-status`
        );
        setState((prev) => ({ ...prev, ballotStatus: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch ballot status.");
        return null;
      }
    },
    []
  );

  // VB-01: POST cast ballot
  //
  // ★ Uses its own castingBallot/castBallotError state — never the shared
  // loading/error slice — so a failed vote can't race with, or be wiped
  // out by, any other action (like the 30s turnout poll). It also THROWS
  // on failure (instead of quietly returning null) so the caller can get
  // the exact error message straight from a try/catch, with zero risk of
  // reading stale or already-cleared state.
  const castBallot = useCallback(
    async (masjidId: string, electionId: string, payload: Omit<CastBallotRequest, "election_id">) => {
      setState((prev) => ({ ...prev, castingBallot: true, castBallotError: null }));
      try {
        const data = await apiFetch<CastBallotResponse>(
          `/api/masjids/${masjidId}/elections/${electionId}/ballot`,
          { method: "POST", body: JSON.stringify({ ...payload, election_id: electionId }) }
        );
        // Mark ballot status as voted
        setState((prev) => ({
          ...prev,
          castingBallot: false,
          castBallotError: null,
          castBallotResult: data,
          ballotStatus: prev.ballotStatus
            ? {
                ...prev.ballotStatus,
                data: {
                  ...prev.ballotStatus.data,
                  has_voted: true,
                  voted_at: data.data.cast_at,
                  verification_hash: data.data.verification_hash,
                },
              }
            : null,
        }));
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to cast ballot.";
        setState((prev) => ({ ...prev, castingBallot: false, castBallotError: message }));
        throw err instanceof Error ? err : new Error(message);
      }
    },
    []
  );

  const clearCastBallotError = useCallback(
    () => setState((prev) => ({ ...prev, castBallotError: null })),
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ARCHIVES
  // ─────────────────────────────────────────────────────────────────────────

  // ARC-01: GET archive
  const getArchive = useCallback(
    async (masjidId: string, query: GetArchiveQuery = {}) => {
      startLoading();
      try {
        const qs = buildQueryString(query);
        const data = await apiFetch<GetArchiveResponse>(
          `/api/masjids/${masjidId}/elections/archive${qs}`
        );
        setState((prev) => ({ ...prev, archive: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch election archive.");
        return null;
      }
    },
    []
  );

  // ARC-02: GET archive stats
  const getArchiveStats = useCallback(async (masjidId: string) => {
    startLoading();
    try {
      const data = await apiFetch<GetArchiveStatsResponse>(
        `/api/masjids/${masjidId}/elections/archive/stats`
      );
      setState((prev) => ({ ...prev, archiveStats: data, loading: false, error: null }));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch archive stats.");
      return null;
    }
  }, []);

  // ARC-03: GET annual report
  const getAnnualReport = useCallback(
    async (masjidId: string, query: GetAnnualReportQuery) => {
      startLoading();
      try {
        const qs = buildQueryString(query);
        const data = await apiFetch<GetAnnualReportResponse>(
          `/api/masjids/${masjidId}/elections/archive/annual-report${qs}`
        );
        setState((prev) => ({ ...prev, annualReport: data, loading: false, error: null }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate annual report.");
        return null;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────

  const clearError = useCallback(() => setState((prev) => ({ ...prev, error: null })), []);
  const clearSlateDetail = useCallback(() => setState((prev) => ({ ...prev, slateDetail: null })), []);
  const clearElectionDetail = useCallback(() => setState((prev) => ({ ...prev, electionDetail: null })), []);
  const clearBallotResult = useCallback(() => setState((prev) => ({ ...prev, castBallotResult: null })), []);
  const clearAnnualReport = useCallback(() => setState((prev) => ({ ...prev, annualReport: null })), []);

  return {
    // State
    slates: state.slates,
    slateDetail: state.slateDetail,
    positionDetail: state.positionDetail,
    elections: state.elections,
    electionDetail: state.electionDetail,
    turnout: state.turnout,
    electionCandidates: state.electionCandidates,
    ballotStatus: state.ballotStatus,
    castBallotResult: state.castBallotResult,
    castingBallot: state.castingBallot,
    castBallotError: state.castBallotError,
    archive: state.archive,
    archiveStats: state.archiveStats,
    annualReport: state.annualReport,
    loading: state.loading,
    error: state.error,

    // Slate Management (Admin)
    getSlates, getSlateDetail, createSlate,
    addPosition, getPositionDetail, updatePosition,
    setCandidates, lockSlate, mapElectionRole,

    // Election Monitoring (Admin)
    getElections, getElectionDetail,
    getTurnout, notifyNonVoters, emergencyStop,

    // Voter Actions (Member)
    getElectionCandidates, getBallotStatus, castBallot, clearCastBallotError,

    // Archives (Admin)
    getArchive, getArchiveStats, getAnnualReport,

    // Utils
    clearError, clearSlateDetail, clearElectionDetail,
    clearBallotResult, clearAnnualReport,
  };
}