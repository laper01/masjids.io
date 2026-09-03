import { test, expect, type Page, type Route } from '@playwright/test';
import type {
  ElectionListItem,
  ElectionDetail,
  ElectionCandidatesData,
  BallotStatusData,
  TurnoutData,
  CastBallotData,
  VoterPositionView,
  ElectionStatus,
} from '@/types/elections';

/**
 * Public election / voting page tests — member role (project 'member',
 * storageState: playwright/.auth/member.json). This file MUST stay under
 * tests/voting/ to be picked up by that project's testMatch regex.
 *
 * Route: app/(public)/public-masjids/[id]/elections/page.tsx → `(public)`
 * is a Next.js route group and does NOT appear in the URL, so the page
 * is assumed to live at /public-masjids/{masjidId}/elections. Adjust
 * MASJID_ID/URL below if the real route differs.
 *
 * Mocked endpoints (cross-checked against hooks/elections/useElections.ts):
 *   - GET  /api/masjids/:id/elections?page=1&limit=50        (VB-05 list, no status filter)
 *   - GET  /api/masjids/:id/elections/:electionId             (VB-06 detail)
 *   - GET  /api/masjids/:id/elections/:electionId/candidates  (VB-07 voter view)
 *   - GET  /api/masjids/:id/elections/:electionId/ballot-status (VB-08)
 *   - GET  /api/masjids/:id/elections/:electionId/turnout     (VB-02, polled every 30s —
 *     tests only assert the initial call, not the poll interval)
 *   - POST /api/masjids/:id/elections/:electionId/ballot      (VB-01 cast ballot)
 */

const MASJID_ID = 'masjid-1';
const BASE_URL = `/public-masjids/${MASJID_ID}/elections`;

function buildElection(overrides: Partial<ElectionListItem> = {}): ElectionListItem {
  return {
    election_id: overrides.election_id ?? 'elec-1',
    slate_id: overrides.slate_id ?? 'slate-1',
    label: overrides.label ?? '2026 Board Election',
    status: overrides.status ?? 'active',
    positions_count: overrides.positions_count ?? 1,
    eligible_voters: overrides.eligible_voters ?? 200,
    ballots_cast: overrides.ballots_cast ?? 80,
    participation_pct: overrides.participation_pct ?? 40,
    voting_deadline: overrides.voting_deadline ?? '2026-12-31T23:59:59.000Z',
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  };
}

function buildElectionDetail(overrides: Partial<ElectionDetail> = {}): ElectionDetail {
  return {
    election_id: overrides.election_id ?? 'elec-1',
    slate_id: overrides.slate_id ?? 'slate-1',
    label: overrides.label ?? '2026 Board Election',
    status: overrides.status ?? 'active',
    eligible_voters: overrides.eligible_voters ?? 200,
    ballots_cast: overrides.ballots_cast ?? 80,
    participation_pct: overrides.participation_pct ?? 40,
    voting_deadline: overrides.voting_deadline ?? '2026-12-31T23:59:59.000Z',
    time_remaining_s: overrides.time_remaining_s ?? 86400,
    ballot_integrity: overrides.ballot_integrity ?? 'active',
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    positions: overrides.positions ?? [
      { position_id: 'pos-1', position_name: 'Chairperson', role_bundle: 'executive_admin', candidate_count: 2, ballots_for_position: 80 },
    ],
  };
}

function buildPosition(overrides: Partial<VoterPositionView> = {}): VoterPositionView {
  return {
    position_id: overrides.position_id ?? 'pos-1',
    position_name: overrides.position_name ?? 'Chairperson',
    candidates: overrides.candidates ?? [
      { candidate_id: 'cand-1', name: 'Ahmad Fauzi', bio: 'Serving the community for 10 years.' },
      { candidate_id: 'cand-2', name: 'Siti Aminah', bio: 'Focused on youth programs.' },
    ],
  };
}

function buildCandidatesData(overrides: Partial<ElectionCandidatesData> = {}): ElectionCandidatesData {
  return {
    election_id: overrides.election_id ?? 'elec-1',
    label: overrides.label ?? '2026 Board Election',
    voting_deadline: overrides.voting_deadline ?? '2026-12-31T23:59:59.000Z',
    positions: overrides.positions ?? [buildPosition()],
  };
}

function buildBallotStatus(overrides: Partial<BallotStatusData> = {}): BallotStatusData {
  return {
    election_id: overrides.election_id ?? 'elec-1',
    has_voted: overrides.has_voted ?? false,
    voted_at: overrides.voted_at ?? null,
    verification_hash: overrides.verification_hash ?? null,
  };
}

function buildTurnoutData(overrides: Partial<TurnoutData> = {}): TurnoutData {
  return {
    participation_pct: overrides.participation_pct ?? 40,
    ballots_cast: overrides.ballots_cast ?? 80,
    eligible_voters: overrides.eligible_voters ?? 200,
    remaining_voters: overrides.remaining_voters ?? 120,
    active_sessions: overrides.active_sessions ?? 5,
    avg_vote_seconds: overrides.avg_vote_seconds ?? 45,
    time_remaining_s: overrides.time_remaining_s ?? 86400,
    delta_pct_1hr: overrides.delta_pct_1hr ?? 2,
    ballot_integrity: overrides.ballot_integrity ?? 'active',
    refreshed_at: overrides.refreshed_at ?? new Date().toISOString(),
  };
}

function buildCastBallotData(overrides: Partial<CastBallotData> = {}): CastBallotData {
  return {
    ballot_id: overrides.ballot_id ?? 'ballot-1',
    verification_hash: overrides.verification_hash ?? 'a1b2c3d4e5f6',
    status: 'cast',
    cast_at: overrides.cast_at ?? new Date().toISOString(),
    session_closed: overrides.session_closed ?? false,
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockElectionsList(page: Page, elections: ElectionListItem[]) {
  await page.route(`**/api/masjids/${MASJID_ID}/elections?*`, async (route) => {
    await fulfillJson(route, { data: elections, pagination: { page: 1, limit: 50, total: elections.length } });
  });
}

async function mockElectionDetail(page: Page, electionId: string, detail: ElectionDetail) {
  await page.route(`**/api/masjids/${MASJID_ID}/elections/${electionId}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await fulfillJson(route, { success: true, message: 'OK', data: detail });
  });
}

async function mockCandidates(page: Page, electionId: string, data: ElectionCandidatesData) {
  await page.route(`**/api/masjids/${MASJID_ID}/elections/${electionId}/candidates`, async (route) => {
    await fulfillJson(route, { success: true, message: 'OK', data });
  });
}

async function mockBallotStatus(page: Page, electionId: string, data: BallotStatusData) {
  await page.route(`**/api/masjids/${MASJID_ID}/elections/${electionId}/ballot-status`, async (route) => {
    await fulfillJson(route, { success: true, message: 'OK', data });
  });
}

async function mockTurnout(page: Page, electionId: string, data: TurnoutData) {
  await page.route(`**/api/masjids/${MASJID_ID}/elections/${electionId}/turnout`, async (route) => {
    await fulfillJson(route, { success: true, message: 'OK', data });
  });
}

async function mockCastBallot(page: Page, electionId: string, data: CastBallotData) {
  await page.route(`**/api/masjids/${MASJID_ID}/elections/${electionId}/ballot`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await fulfillJson(route, { success: true, message: 'OK', data });
  });
}

/** Wires up the standard happy-path mocks for a single active election. */
async function mockActiveElectionFlow(page: Page, opts: {
  electionId?: string;
  ballotStatus?: Partial<BallotStatusData>;
  electionDetail?: Partial<ElectionDetail>;
  candidates?: Partial<ElectionCandidatesData>;
} = {}) {
  const electionId = opts.electionId ?? 'elec-1';
  await mockElectionsList(page, [buildElection({ election_id: electionId })]);
  await mockElectionDetail(page, electionId, buildElectionDetail({ election_id: electionId, ...opts.electionDetail }));
  await mockCandidates(page, electionId, buildCandidatesData({ election_id: electionId, ...opts.candidates }));
  await mockBallotStatus(page, electionId, buildBallotStatus(opts.ballotStatus));
  await mockTurnout(page, electionId, buildTurnoutData());
  return electionId;
}

test.describe('Public election voting page (authenticated member)', () => {
  test('loads elections, auto-selects active one, and shows candidates', async ({ page }) => {
    await mockActiveElectionFlow(page);

    await page.goto(BASE_URL);

    await expect(page.getByTestId('election-title')).toHaveText('2026 Board Election');
    await expect(page.getByTestId('election-status-label')).toHaveText('Live Election');
    await expect(page.getByTestId('turnout-strip')).toBeVisible();
    await expect(page.getByTestId('position-block-pos-1')).toBeVisible();
    await expect(page.getByTestId('candidate-card-cand-1')).toBeVisible();
    await expect(page.getByTestId('candidate-card-cand-2')).toBeVisible();
  });

  test('shows empty state when there are no elections', async ({ page }) => {
    await mockElectionsList(page, []);
    await page.goto(BASE_URL);
    await expect(page.getByTestId('no-elections-state')).toBeVisible();
  });

  test('shows no-candidates state when election has no positions yet', async ({ page }) => {
    const electionId = 'elec-1';
    await mockElectionsList(page, [buildElection({ election_id: electionId, positions_count: 0 })]);
    await mockElectionDetail(page, electionId, buildElectionDetail({ election_id: electionId, positions: [] }));
    await mockCandidates(page, electionId, buildCandidatesData({ election_id: electionId, positions: [] }));
    await mockBallotStatus(page, electionId, buildBallotStatus());
    await mockTurnout(page, electionId, buildTurnoutData());

    await page.goto(BASE_URL);
    await expect(page.getByTestId('no-candidates-state')).toBeVisible();
  });

  test('select candidate then cast ballot shows receipt and marks position voted', async ({ page }) => {
    const electionId = await mockActiveElectionFlow(page);

    let requestBody: any = null;
    await mockCastBallot(page, electionId, buildCastBallotData({ verification_hash: 'hash-xyz-123' }));
    page.on('request', (req) => {
      if (req.url().includes('/ballot') && req.method() === 'POST') {
        requestBody = req.postDataJSON();
      }
    });

    await page.goto(BASE_URL);
    const card = page.getByTestId('candidate-card-cand-1');
    await card.click(); // select

    const voteButton = card.getByTestId('candidate-vote-button');
    await expect(voteButton).toHaveText('Cast Secure Vote');
    await voteButton.click();

    await expect(page.getByTestId('ballot-receipt')).toBeVisible();
    await expect(page.getByTestId('ballot-verification-hash')).toHaveText('hash-xyz-123');
    await expect(page.getByTestId('position-voted-badge')).toBeVisible();
    await expect(card.getByTestId('candidate-voted-overlay')).toHaveText('Vote Cast');

    expect(requestBody).toMatchObject({
      position_id: 'pos-1',
      candidate_id: 'cand-1',
      election_id: electionId,
    });
  });

  test('already-voted member sees disabled candidates and "Already Voted" state', async ({ page }) => {
    await mockActiveElectionFlow(page, {
      ballotStatus: { has_voted: true, voted_at: '2026-07-01T10:00:00.000Z', verification_hash: 'prev-hash-1' },
    });

    await page.goto(BASE_URL);

    await expect(page.getByTestId('voting-status-banner')).toContainText('already been recorded');
    const card = page.getByTestId('candidate-card-cand-1');
    await expect(card.getByTestId('candidate-voted-overlay')).toHaveText('Already Voted');
    await expect(card.getByTestId('candidate-vote-button')).toBeDisabled();
    await expect(page.getByTestId('ballot-receipt')).toBeVisible();
  });

  test('frozen election shows frozen banner and disables voting', async ({ page }) => {
    await mockActiveElectionFlow(page, {
      electionDetail: { status: 'frozen' },
    });
    // election list item status should also reflect frozen for the chip, but
    // detail drives isFrozen/isClosed derivation used for disabling voting
    await page.goto(BASE_URL);

    await expect(page.getByTestId('frozen-banner')).toBeVisible();
    const card = page.getByTestId('candidate-card-cand-1');
    await card.click();
    await expect(card.getByTestId('candidate-vote-button')).toBeDisabled();
  });

  test('closed election shows closed banner and "Election Closed" button label', async ({ page }) => {
    await mockActiveElectionFlow(page, {
      electionDetail: { status: 'closed' },
    });

    await page.goto(BASE_URL);

    await expect(page.getByTestId('closed-banner')).toBeVisible();
    const card = page.getByTestId('candidate-card-cand-1');
    await expect(card.getByTestId('candidate-vote-button')).toHaveText('Election Closed');
    await expect(card.getByTestId('candidate-vote-button')).toBeDisabled();
  });

  test('switching between elections in the list reloads detail and candidates', async ({ page }) => {
    const electionA = buildElection({ election_id: 'elec-a', label: 'Board Election A', status: 'active' });
    const electionB = buildElection({ election_id: 'elec-b', label: 'Board Election B', status: 'closed', participation_pct: 100 });

    await mockElectionsList(page, [electionA, electionB]);
    await mockElectionDetail(page, 'elec-a', buildElectionDetail({ election_id: 'elec-a', label: 'Board Election A', status: 'active' }));
    await mockElectionDetail(page, 'elec-b', buildElectionDetail({ election_id: 'elec-b', label: 'Board Election B', status: 'closed' }));
    await mockCandidates(page, 'elec-a', buildCandidatesData({
      election_id: 'elec-a',
      positions: [buildPosition({ position_id: 'pos-a', candidates: [{ candidate_id: 'cand-a1', name: 'Candidate A1', bio: 'Bio A1' }] })],
    }));
    await mockCandidates(page, 'elec-b', buildCandidatesData({
      election_id: 'elec-b',
      positions: [buildPosition({ position_id: 'pos-b', candidates: [{ candidate_id: 'cand-b1', name: 'Candidate B1', bio: 'Bio B1' }] })],
    }));
    await mockBallotStatus(page, 'elec-a', buildBallotStatus());
    await mockBallotStatus(page, 'elec-b', buildBallotStatus());
    await mockTurnout(page, 'elec-a', buildTurnoutData());
    await mockTurnout(page, 'elec-b', buildTurnoutData());

    await page.goto(BASE_URL);
    await expect(page.getByTestId('election-title')).toHaveText('Board Election A');
    await expect(page.getByTestId('candidate-card-cand-a1')).toBeVisible();

    await page.getByTestId('election-list-card-elec-b').click();

    await expect(page.getByTestId('election-title')).toHaveText('Board Election B');
    await expect(page.getByTestId('candidate-card-cand-b1')).toBeVisible();
    await expect(page.getByTestId('closed-banner')).toBeVisible();
  });

  test('shows error banner and can be dismissed', async ({ page }) => {
    await page.route(`**/api/masjids/${MASJID_ID}/elections?*`, async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Failed to load elections' }) });
    });

    await page.goto(BASE_URL);

    await expect(page.getByTestId('election-error-banner')).toBeVisible();
    await page.getByTestId('error-dismiss-button').click();
    await expect(page.getByTestId('election-error-banner')).not.toBeVisible();
  });
});