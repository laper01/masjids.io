"use client";

/**
 * app/(public)/public-masjids/[id]/elections/page.tsx
 * VB-05 · VB-06 · VB-07 · VB-08 · VB-01 · VB-02
 *
 * Loads ALL elections (active, closed, frozen) — no status filter.
 * Member can browse all elections, vote on active ones.
 *
 * Candidate cards now show a plain-English reason under the vote button
 * whenever it's disabled (already voted, election frozen/closed, still
 * submitting, or nothing selected yet) instead of leaving the user to
 * guess why they can't vote.
 */

import { use, useEffect, useCallback, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useElections } from "@/hooks/elections/useElections";

import type {
  ElectionListItem,
  ElectionDetail,
  ElectionCandidatesData,
  VoterPositionView,
  CandidateVoterView,
  BallotStatusData,
  TurnoutData,
  CastBallotData,
  ElectionStatus,
} from "@/types/elections";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeRemaining(secs: number | null): string {
  if (!secs || secs <= 0) return "Closed";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function formatDeadline(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ★ Turns raw API error text into a plain-English explanation. The
// voter_not_eligible case in particular reads as a generic 403 unless
// we translate it — this makes clear *why* the vote was rejected and
// what the user can do about it.
//
// `type` is the machine-readable error code apiFetch now attaches to
// thrown errors (e.g. "voter_not_eligible") when the API provides one —
// prefer matching on that over the human-readable text, since the text
// can change without notice.
function humanizeVoteError(raw: string | null, type?: string): string {
  if (type === "voter_not_eligible") {
    return "You're not eligible to vote in this election — only active, verified members of this masjid can vote. If you believe this is a mistake, contact the masjid admin.";
  }
  if (!raw) return "Something went wrong while casting your vote. Please try again.";
  if (/not eligible|not an active member/i.test(raw)) {
    return "You're not eligible to vote in this election — only active, verified members of this masjid can vote. If you believe this is a mistake, contact the masjid admin.";
  }
  if (/already voted|duplicate/i.test(raw)) {
    return "You've already voted for this position.";
  }
  if (/frozen/i.test(raw)) {
    return "Voting is currently paused for this election.";
  }
  if (/closed/i.test(raw)) {
    return "This election is closed and no longer accepting votes.";
  }
  return raw;
}

// ★ Plain-English reason the vote button is disabled — shown under the
// button so the user isn't left guessing why they can't cast a vote.
function getVoteDisabledReason({
  hasVoted, alreadyVoted, isSubmitting, isFrozen, isClosed, isSelected,
}: {
  hasVoted: boolean; alreadyVoted: boolean; isSubmitting: boolean;
  isFrozen: boolean; isClosed: boolean; isSelected: boolean;
}): string | null {
  if (hasVoted || alreadyVoted) return "You've already voted for this position.";
  if (isFrozen) return "Voting is paused — this election has been frozen by an administrator.";
  if (isClosed) return "This election is closed and no longer accepting votes.";
  if (isSubmitting) return "Submitting your vote…";
  if (!isSelected) return "Tap this candidate to select them, then confirm your vote.";
  return null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function ElectionStatusChip({ status }: { status: ElectionStatus }) {
  const map: Record<ElectionStatus, string> = {
    active: "bg-emerald-50 text-emerald-700",
    frozen: "bg-red-50 text-red-600",
    closed: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      data-testid="election-status-chip"
      data-status={status}
      className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

// ─── Turnout strip — VB-02 ───────────────────────────────────────────────────
function TurnoutStrip({ data }: { data: TurnoutData | null }) {
  if (!data) return null;
  const pct = Math.round(data.participation_pct);
  return (
    <div data-testid="turnout-strip" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-600">Live Turnout</span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span data-testid="turnout-count" className="text-[10px] text-emerald-600 font-semibold">
            {data.ballots_cast.toLocaleString()} / {data.eligible_voters.toLocaleString()} voted
          </span>
        </div>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-gradient-to-r from-[#003527] to-[#064e3b] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Participation",  value: `${pct}%` },
          { label: "Active Sessions",value: String(data.active_sessions) },
          { label: "↑ Last Hour",    value: `+${data.delta_pct_1hr}%` },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-sm font-extrabold text-[#003527]" style={{ fontFamily: "Manrope, sans-serif" }}>{s.value}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Candidate card — VB-01 ───────────────────────────────────────────────────
function CandidateCard({
  candidate, position, isSelected, hasVoted, isSubmitting, alreadyVoted, isFrozen, isClosed,
  onSelect, onCast,
}: {
  candidate: CandidateVoterView; position: VoterPositionView;
  isSelected: boolean; hasVoted: boolean; isSubmitting: boolean;
  alreadyVoted: boolean; isFrozen: boolean; isClosed: boolean;
  onSelect: () => void; onCast: (candidateId: string, positionId: string) => void;
}) {
  const disabled = hasVoted || alreadyVoted || isSubmitting || isFrozen || isClosed;
  const buttonDisabled = disabled || !isSelected;
  const disabledReason = getVoteDisabledReason({
    hasVoted, alreadyVoted, isSubmitting, isFrozen, isClosed, isSelected,
  });

  return (
    <div
      data-testid={`candidate-card-${candidate.candidate_id}`}
      onClick={() => !disabled && onSelect()}
      className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer
        ${isSelected && !disabled ? "border-[#064e3b] shadow-md bg-emerald-50/30"
          : disabled ? "border-slate-100 opacity-60 cursor-not-allowed"
          : "border-slate-100 hover:border-emerald-200 hover:-translate-y-1"}`}>
      {/* Avatar */}
      <div className="relative overflow-hidden h-44 bg-gradient-to-br from-[#003527] to-[#064e3b] flex items-center justify-center">
        <span className="text-4xl font-bold text-white/30">
          {candidate.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </span>
        {isSelected && !disabled && (
          <div className="absolute inset-0 bg-[#064e3b]/20 flex items-center justify-center">
            <div className="bg-white rounded-full p-2 shadow-lg">
              <span className="material-symbols-outlined text-[#064e3b] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          </div>
        )}
        {(hasVoted || alreadyVoted) && (
          <div className="absolute inset-0 bg-[#064e3b]/10 flex items-center justify-center">
            <span data-testid="candidate-voted-overlay" className="bg-white/90 text-[#064e3b] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              {alreadyVoted ? "Already Voted" : "Vote Cast"}
            </span>
          </div>
        )}
        {isFrozen && <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center"><span data-testid="candidate-frozen-overlay" className="bg-red-600/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Ballot Frozen</span></div>}
        {isClosed && <div className="absolute inset-0 bg-slate-800/20 flex items-center justify-center"><span data-testid="candidate-closed-overlay" className="bg-slate-800/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Election Closed</span></div>}
      </div>
      <div className="p-5 bg-white">
        <span className="text-[9px] text-[#064e3b] font-bold uppercase tracking-widest">{position.position_name}</span>
        <h4 data-testid="candidate-name" className="font-bold text-slate-800 mt-0.5 mb-0.5" style={{ fontFamily: "Manrope, sans-serif" }}>{candidate.name}</h4>
        <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">{candidate.bio}</p>
        <button
          data-testid="candidate-vote-button"
          title={disabledReason ?? undefined}
          aria-label={disabledReason ?? "Cast secure vote"}
          onClick={(e) => { e.stopPropagation(); if (!disabled && isSelected) onCast(candidate.candidate_id, position.position_id); }}
          disabled={buttonDisabled}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all
            ${hasVoted || alreadyVoted ? "bg-emerald-50 text-emerald-700 cursor-default"
              : isFrozen ? "bg-red-50 text-red-400 cursor-not-allowed"
              : isClosed ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : isSelected ? "bg-gradient-to-r from-[#003527] to-[#064e3b] text-white hover:opacity-90 active:scale-95"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
          {isSubmitting && isSelected ? "Submitting…"
            : hasVoted || alreadyVoted ? "✓ Vote Cast"
            : isClosed ? "Election Closed"
            : isSelected ? "Cast Secure Vote"
            : "Select to Vote"}
        </button>
        {/* ★ Human-readable reason the button is disabled */}
        {disabledReason && (
          <p
            data-testid="candidate-vote-disabled-reason"
            className={`text-[10px] mt-2 text-center leading-relaxed ${
              isFrozen ? "text-red-500" : isClosed ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {disabledReason}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Election list card — VB-05 ───────────────────────────────────────────────
function ElectionListCard({
  election, isActive, onClick,
}: {
  election: ElectionListItem; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      data-testid={`election-list-card-${election.election_id}`}
      data-selected={isActive}
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-5 border transition-all
      ${isActive ? "border-[#064e3b]/30 bg-emerald-50/30 shadow-sm" : "border-slate-100 bg-white hover:border-[#064e3b]/20 hover:shadow-sm"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-bold text-[#131b2e]" style={{ fontFamily: "Manrope, sans-serif" }}>{election.label}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {election.positions_count} position{election.positions_count !== 1 ? "s" : ""}
            {" · "}{election.ballots_cast.toLocaleString()} votes cast
            {election.voting_deadline && ` · Due ${formatDeadline(election.voting_deadline)}`}
          </p>
        </div>
        <ElectionStatusChip status={election.status} />
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#064e3b] rounded-full" style={{ width: `${election.participation_pct}%` }} />
      </div>
      <p className="text-[9px] text-slate-400 mt-1 text-right">{election.participation_pct}% turnout</p>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PublicElectionPage({ params }: PageProps) {
  const { id: masjidId } = use(params);
  const { data: session } = useSession();

  const {
    elections, electionDetail, electionCandidates, ballotStatus,
    castBallotResult, turnout, loading, error,
    getElections, getElectionDetail, getElectionCandidates,
    getBallotStatus, castBallot, getTurnout,
    clearError, clearBallotResult,
  } = useElections();

  // ── Local state ────────────────────────────────────────────────────────────
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [selections,         setSelections]         = useState<Record<string, string>>({});
  const [submittingPos,      setSubmittingPos]       = useState<string | null>(null);
  const [votedPositions,     setVotedPositions]     = useState<Record<string, CastBallotData>>({});
  // ★ Per-position error shown inline near the vote button, so a failed
  // vote (e.g. voter_not_eligible) is visible right where the user acted —
  // not just in the global banner at the top of a long page.
  const [castErrors,         setCastErrors]         = useState<Record<string, string>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  // VB-05: ALL elections — no status filter
  const electionList: ElectionListItem[]     = (elections?.data ?? []) as ElectionListItem[];
  const detail:       ElectionDetail | null  = (electionDetail?.data   as ElectionDetail          | null) ?? null;
  const candidates:   ElectionCandidatesData | null = (electionCandidates?.data as ElectionCandidatesData | null) ?? null;
  const ballot:       BallotStatusData | null       = (ballotStatus?.data       as BallotStatusData       | null) ?? null;
  const turnoutData:  TurnoutData | null            = (turnout?.data            as TurnoutData            | null) ?? null;

  const activeElectionId = selectedElectionId ?? electionList.find((e) => e.status === "active")?.election_id ?? electionList[0]?.election_id ?? null;

  const isFrozen     = detail?.status === "frozen";
  const isClosed     = detail?.status === "closed";
  const isActive     = detail?.status === "active";
  const alreadyVoted = ballot?.has_voted ?? false;
  const positions: VoterPositionView[] = candidates?.positions ?? [];
  const latestReceipt = castBallotResult?.data as CastBallotData | undefined;

  const totalPositions = positions.length;
  const votedCount     = Object.keys(votedPositions).length;
  const allVotesCast   = totalPositions > 0 && votedCount === totalPositions;

  // ── VB-05: load ALL elections (no status filter) ──────────────────────────
  useEffect(() => {
    getElections(masjidId, { page: 1, limit: 50 });
  }, [masjidId, getElections]);

  // Auto-select first election
  useEffect(() => {
    if (electionList.length > 0 && !selectedElectionId) {
      const first = electionList.find((e) => e.status === "active") ?? electionList[0];
      setSelectedElectionId(first.election_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionList]);

  // ── VB-06: detail ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeElectionId) return;
    getElectionDetail(masjidId, activeElectionId);
  }, [masjidId, activeElectionId, getElectionDetail]);

  // ── VB-07: candidates ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeElectionId) return;
    getElectionCandidates(masjidId, activeElectionId);
  }, [masjidId, activeElectionId, getElectionCandidates]);

  // ── VB-08: ballot status ──────────────────────────────────────────────────
  useEffect(() => {
    if (!activeElectionId) return;
    getBallotStatus(masjidId, activeElectionId);
  }, [masjidId, activeElectionId, getBallotStatus]);

  // ── VB-02: 30s turnout poll ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeElectionId) return;
    getTurnout(masjidId, activeElectionId);
    pollRef.current = setInterval(() => getTurnout(masjidId, activeElectionId), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [masjidId, activeElectionId, getTurnout]);

  // Reset per-session voted state when switching elections
  useEffect(() => {
    setSelections({});
    setVotedPositions({});
    setCastErrors({});
    clearBallotResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeElectionId]);

  // ── VB-01: cast ballot ────────────────────────────────────────────────────
  const handleCastBallot = useCallback(async (candidateId: string, positionId: string) => {
    if (!activeElectionId || isFrozen || isClosed) return;
    setSubmittingPos(positionId);
    setCastErrors((prev) => {
      if (!(positionId in prev)) return prev;
      const next = { ...prev };
      delete next[positionId];
      return next;
    });
    try {
      const sessionToken = (session as any)?.accessToken ?? "";
      const data = await castBallot(masjidId, activeElectionId, {
        position_id:   positionId,
        candidate_id:  candidateId,
        session_token: sessionToken,
      });
      setVotedPositions((prev) => ({ ...prev, [positionId]: data.data }));
    } catch (err) {
      // ★ castBallot throws on failure, so the message comes straight from
      // the caught error — no shared/global state to race against.
      const raw = err instanceof Error ? err.message : null;
      const type = (err as { type?: string } | undefined)?.type;
      setCastErrors((prev) => ({ ...prev, [positionId]: humanizeVoteError(raw, type) }));
    } finally {
      setSubmittingPos(null);
    }
  }, [masjidId, activeElectionId, isFrozen, isClosed, castBallot, session]);

  const handleSelectCandidate = useCallback((positionId: string, candidateId: string) => {
    if (votedPositions[positionId] || alreadyVoted) return;
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  }, [votedPositions, alreadyVoted]);

  const handleSelectElection = useCallback((id: string) => {
    setSelectedElectionId(id);
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }`}</style>

      <div data-testid="election-page" className="min-h-screen bg-[#f6f7fb] pb-24 lg:pb-10" style={{ fontFamily: "DM Sans, sans-serif" }}>
        <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">

          {/* Error */}
          {error && (
            <div data-testid="election-error-banner" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-base">error</span>
              <p className="flex-1 text-sm text-red-700">{error}</p>
              <button data-testid="error-dismiss-button" onClick={clearError} className="text-xs font-bold text-red-500 hover:underline shrink-0">Dismiss</button>
            </div>
          )}

          {/* Frozen / Closed banners */}
          {isFrozen && (
            <div data-testid="frozen-banner" className="flex items-center gap-3 bg-red-600 text-white rounded-xl px-5 py-4">
              <span className="material-symbols-outlined text-red-200">warning</span>
              <p className="text-sm font-semibold">This election has been temporarily frozen. Voting is paused.</p>
            </div>
          )}
          {isClosed && (
            <div data-testid="closed-banner" className="flex items-center gap-3 bg-slate-800 text-white rounded-xl px-5 py-4">
              <span className="material-symbols-outlined text-slate-300">lock</span>
              <p className="text-sm font-semibold">This election is closed. Results are being certified.</p>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isActive && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                )}
                <span data-testid="election-status-label" className="font-bold text-xs uppercase tracking-widest" style={{ fontFamily: "Manrope, sans-serif", color: isFrozen ? "#dc2626" : isClosed ? "#475569" : "#047857" }}>
                  {loading && !detail ? "Loading…" : isFrozen ? "Election Frozen" : isClosed ? "Election Closed" : isActive ? "Live Election" : "Election"}
                </span>
              </div>
              <h1 data-testid="election-title" className="text-4xl md:text-5xl font-extrabold text-[#003527] tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                {loading && !detail
                  ? <span className="inline-block w-72 h-12 bg-slate-200 rounded-lg animate-pulse" />
                  : (detail?.label ?? "Elections")}
              </h1>
              {detail?.voting_deadline && (
                <p className="text-slate-500 text-sm mt-2">
                  {isClosed ? "Closed" : "Voting closes"}{" "}
                  <span className="font-semibold text-[#003527]">{formatDeadline(detail.voting_deadline)}</span>
                  {isActive && detail.time_remaining_s !== null && (
                    <span className="ml-2 text-emerald-600 font-semibold">({formatTimeRemaining(detail.time_remaining_s)} remaining)</span>
                  )}
                </p>
              )}
            </div>
            <div data-testid="voting-status-banner" className={`px-5 py-3 rounded-xl flex items-center gap-3 shadow-md text-sm font-medium ${alreadyVoted || allVotesCast ? "bg-emerald-600 text-white" : "bg-[#064e3b] text-emerald-100"}`}>
              <span className="material-symbols-outlined text-emerald-300">{alreadyVoted || allVotesCast ? "how_to_vote" : "verified_user"}</span>
              {alreadyVoted ? "Your ballot has already been recorded."
                : allVotesCast ? `All ${totalPositions} position${totalPositions > 1 ? "s" : ""} voted.`
                : isClosed ? "Election closed — results pending."
                : isFrozen ? "Voting temporarily paused."
                : `${totalPositions} position${totalPositions !== 1 ? "s" : ""} · Select a candidate to vote`}
            </div>
          </div>

          {/* VB-05: All elections list */}
          {electionList.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">All Elections — VB-05</p>
              <div data-testid="elections-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {electionList.map((e: ElectionListItem) => (
                  <ElectionListCard key={e.election_id} election={e}
                    isActive={e.election_id === activeElectionId}
                    onClick={() => handleSelectElection(e.election_id)} />
                ))}
              </div>
            </div>
          )}

          {/* VB-02: Live Turnout */}
          {isActive && <TurnoutStrip data={turnoutData} />}

          {/* Loading skeleton */}
          {loading && positions.length === 0 && (
            <div data-testid="positions-loading-skeleton" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border-2 border-slate-100 overflow-hidden animate-pulse">
                  <div className="h-44 bg-slate-100" />
                  <div className="p-5 space-y-3"><div className="h-4 bg-slate-100 rounded w-3/4" /><div className="h-3 bg-slate-100 rounded w-1/2" /><div className="h-9 bg-slate-100 rounded-xl" /></div>
                </div>
              ))}
            </div>
          )}

          {/* VB-07: Positions + candidates */}
          {positions.length > 0 && positions.map((position) => {
            const posVoted         = !!votedPositions[position.position_id];
            const posReceipt       = votedPositions[position.position_id];
            const isSubmitting     = submittingPos === position.position_id;
            const selectedCandidateId = selections[position.position_id] ?? null;

            return (
              <div key={position.position_id} data-testid={`position-block-${position.position_id}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Candidate cards */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 data-testid="position-name" className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>{position.position_name}</h3>
                      <p className="text-slate-500 text-sm">{position.candidates.length} candidate{position.candidates.length !== 1 ? "s" : ""}{isActive && " — select one to cast your secure ballot"}</p>
                    </div>
                    {(posVoted || alreadyVoted)
                      ? <span data-testid="position-voted-badge" className="bg-[#064e3b] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">✓ Voted</span>
                      : isClosed
                      ? <span data-testid="position-closed-badge" className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Closed</span>
                      : isActive && detail?.voting_deadline
                      ? <span data-testid="position-time-left-badge" className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">{formatTimeRemaining(detail.time_remaining_s)} left</span>
                      : null}
                  </div>

                  {/* ★ Inline vote error — shown right where the user clicked vote */}
                  {castErrors[position.position_id] && (
                    <div
                      data-testid={`position-vote-error-${position.position_id}`}
                      role="alert"
                      className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6"
                    >
                      <span className="material-symbols-outlined text-red-500 text-base mt-0.5">error</span>
                      <p className="flex-1 text-sm text-red-700 leading-relaxed">{castErrors[position.position_id]}</p>
                      <button
                        data-testid={`position-vote-error-dismiss-${position.position_id}`}
                        onClick={() => setCastErrors((prev) => {
                          const next = { ...prev };
                          delete next[position.position_id];
                          return next;
                        })}
                        aria-label="Dismiss"
                        className="text-red-400 hover:text-red-600 shrink-0"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  )}

                  <div data-testid="candidates-grid" className={`grid gap-5 ${position.candidates.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {position.candidates.map((candidate: CandidateVoterView) => (
                      <CandidateCard key={candidate.candidate_id}
                        candidate={candidate} position={position}
                        isSelected={selectedCandidateId === candidate.candidate_id}
                        hasVoted={posVoted} isSubmitting={isSubmitting}
                        alreadyVoted={alreadyVoted} isFrozen={isFrozen} isClosed={isClosed}
                        onSelect={() => handleSelectCandidate(position.position_id, candidate.candidate_id)}
                        onCast={handleCastBallot} />
                    ))}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                  {/* VB-06 stats */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-5" style={{ fontFamily: "Manrope, sans-serif" }}>Governance Stats</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                          <span>Eligible Voters</span>
                          <span>{(turnoutData?.eligible_voters ?? detail?.eligible_voters ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#064e3b] rounded-full transition-all duration-700" style={{ width: `${turnoutData?.participation_pct ?? detail?.participation_pct ?? 0}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{Math.round(turnoutData?.participation_pct ?? detail?.participation_pct ?? 0)}% Participation Rate</p>
                      </div>
                      {detail?.voting_deadline && (
                        <div className="p-3 bg-blue-50 rounded-xl">
                          <p className="text-xs font-medium text-slate-600">
                            {isClosed ? "Closed on" : "Voting Deadline"}:{" "}
                            <span className="font-bold text-slate-800">{formatDeadline(detail.voting_deadline)}</span>
                          </p>
                        </div>
                      )}
                      {detail?.ballot_integrity && (
                        <div className={`p-3 rounded-xl flex items-center gap-2 ${detail.ballot_integrity === "active" ? "bg-emerald-50" : detail.ballot_integrity === "warning" ? "bg-amber-50" : "bg-red-50"}`}>
                          <span className={`material-symbols-outlined text-base ${detail.ballot_integrity === "active" ? "text-emerald-600" : detail.ballot_integrity === "warning" ? "text-amber-600" : "text-red-600"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {detail.ballot_integrity === "active" ? "verified_user" : "warning"}
                          </span>
                          <p className="text-xs font-medium text-slate-700 capitalize">Integrity: <span className="font-bold">{detail.ballot_integrity}</span></p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VB-01 receipt */}
                  {(posReceipt || latestReceipt || alreadyVoted) && (
                    <div data-testid="ballot-receipt" className="relative overflow-hidden rounded-2xl p-6 text-white shadow-md" style={{ background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)" }}>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-emerald-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          <span className="text-[10px] font-bold tracking-widest uppercase">Vote Confirmed</span>
                        </div>
                        <h4 className="text-sm font-bold mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Ballot Successfully Cast</h4>
                        <p className="text-[11px] text-emerald-200/80 mb-3">{position.position_name}</p>
                        {(posReceipt?.verification_hash ?? latestReceipt?.verification_hash ?? ballot?.verification_hash) && (
                          <div data-testid="ballot-verification-hash" className="bg-black/20 p-2 rounded-lg text-[9px] font-mono break-all text-emerald-100/70">
                            {posReceipt?.verification_hash ?? latestReceipt?.verification_hash ?? ballot?.verification_hash}
                          </div>
                        )}
                        {(posReceipt?.cast_at ?? latestReceipt?.cast_at) && (
                          <p className="text-[9px] text-emerald-300/60 mt-2">
                            Cast at {new Date(posReceipt?.cast_at ?? latestReceipt?.cast_at ?? "").toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {alreadyVoted && ballot?.voted_at && !posReceipt && !latestReceipt && (
                          <p className="text-[9px] text-emerald-300/60 mt-2">Previously voted at {new Date(ballot.voted_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                        )}
                      </div>
                      <div className="absolute -bottom-4 -right-4 opacity-10">
                        <span className="material-symbols-outlined" style={{ fontSize: "100px" }}>check_circle</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {!loading && electionList.length === 0 && (
            <div data-testid="no-elections-state" className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <span className="material-symbols-outlined text-slate-300 text-5xl mb-3 block">how_to_vote</span>
              <p className="text-slate-500 text-sm font-medium">No elections found for this mosque.</p>
              <p className="text-slate-400 text-xs mt-1">Check back closer to the election period.</p>
            </div>
          )}

          {/* No candidates state (election exists but no positions yet) */}
          {!loading && electionList.length > 0 && positions.length === 0 && activeElectionId && (
            <div data-testid="no-candidates-state" className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <span className="material-symbols-outlined text-slate-300 text-5xl mb-3 block">ballot</span>
              <p className="text-slate-500 text-sm font-medium">No candidates have been registered for this election yet.</p>
            </div>
          )}

        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-3 bg-white/90 backdrop-blur-xl border-t border-slate-100 shadow-lg z-50">
        {[
          { icon: "home",        label: "Home",    active: false },
          { icon: "how_to_vote", label: "Vote",    active: true  },
          { icon: "leaderboard", label: "Results", active: false },
          { icon: "person",      label: "Profile", active: false },
        ].map((item) => (
          <button key={item.label} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${item.active ? "bg-emerald-50 text-[#064e3b]" : "text-slate-400"}`}>
            <span className="material-symbols-outlined text-[1.4rem]">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}