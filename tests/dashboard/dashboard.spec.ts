import { test, expect } from '@playwright/test';
import { waitForMosqueReady } from '../helpers/wait-for-mosque';

test.describe('Dashboard — Command Center', () => {
  test.beforeEach(async ({ page }) => {
    // Network-based wait (see helper) — more reliable under parallel
    // workers or a slow first dev-server compile than polling UI text alone.
    await waitForMosqueReady(page);
  });

  // ── KPI Row ────────────────────────────────────────────────────
  test.describe('KPI summary', () => {
    test('displays all four KPI cards with data', async ({ page }) => {
      await expect(page.getByTestId('kpi-card-community-size')).toBeVisible();
      await expect(page.getByTestId('kpi-card-revenue-vs-goal')).toBeVisible();
      await expect(page.getByTestId('kpi-card-governance')).toBeVisible();
      await expect(page.getByTestId('kpi-card-staff-activity')).toBeVisible();
    });

    test('shows loading state before summary data arrives', async ({ page }) => {
      // Delay the summary API so we can catch the "—" / loading state
      await page.route('**/api/**/dashboard/summary*', async (route) => {
        await new Promise((r) => setTimeout(r, 1000));
        await route.continue();
      });
      await waitForMosqueReady(page);
      await expect(page.getByText('—').first()).toBeVisible();
    });

    test('governance KPI reflects active election from summary', async ({ page }) => {
      await page.route('**/api/**/dashboard/summary*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: "ok",
            data: {
              community: { total_members: 1, verified_households: 1, growth_pct: 12 },
              revenue: { total_raised: 0, total_goal: 75008, progress_pct: 0, currency: "USD", days_remaining: null },
              staff: { total_staff: 1, active_today: 0 },
              governance: {
                has_active_election: true,
                active_election_id: "test-election-id",
                active_election_label: "Board Election 2026",
                ballots_cast: 42,
                participation_pct: 60,
              },
              campaigns: [],
              financial_chart: { period: "week", bars: null },
              donation_stats: { average_donation: 0, recurring_donors: 0, refunds_requested: 0, currency: "USD" },
            },
          }),
        });
      });
      await waitForMosqueReady(page);

      const governanceCard = page.getByTestId('kpi-card-governance');
      await expect(governanceCard.getByText('Active', { exact: true })).toBeVisible();
      await expect(governanceCard.getByText(/Board Election 2026 · 42 votes cast/)).toBeVisible();
    });

    test('governance KPI shows "No Election" when none is active', async ({ page }) => {
      const governanceCard = page.getByTestId('kpi-card-governance');
      // Real seeded test account has no active election
      await expect(governanceCard.getByText('No Election', { exact: true })).toBeVisible();
    });
  });

  // ── Quick Actions → all navigate (no modals anymore) ─────────────
  test.describe('Quick Actions', () => {
    test('"masjid management" navigates to /masjid-management', async ({ page }) => {
      await page.getByTestId('quick-action-masjid-management').click();
      await expect(page).toHaveURL(/\/masjid-management/);
    });

    test('"Broadcast Announcement" navigates to /announcements', async ({ page }) => {
      await page.getByTestId('quick-action-broadcast-announcement').click();
      await expect(page).toHaveURL(/\/announcement/);
    });

    test('"Invite New Staff" navigates to /users', async ({ page }) => {
      await page.getByTestId('quick-action-invite-new-staff').click();
      await expect(page).toHaveURL(/\/users/);
    });

    test('"Open Website Builder" navigates to /builder', async ({ page }) => {
      await page.getByTestId('quick-action-open-website-builder').click();
      await expect(page).toHaveURL(/\/builder/);
    });
  });

  // ── Navigation from dashboard sections ───────────────────────────
  test.describe('Section navigation', () => {
    test('Governance Monitor "VIEW ALL" navigates to /governance', async ({ page }) => {
      await page.getByTestId('governance-view-all').click();
      await expect(page).toHaveURL(/\/governance/);
    });

    test('Audit Log "VIEW ALL" navigates to /audit', async ({ page }) => {
      await page.getByTestId('audit-view-all').click();
      await expect(page).toHaveURL(/\/audit/);
    });
  });

  // ── Governance Monitor — Active Campaigns ────────────────────────
  test.describe('Governance Monitor — campaigns', () => {
    test('displays campaigns from summary with progress bars', async ({ page }) => {
      // Mocked — asserting against live production data here would make
      // this test break every time someone edits a campaign in the app.
      await page.route('**/api/**/dashboard/summary*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: "ok",
            data: {
              community: { total_members: 1, verified_households: 1, growth_pct: 12 },
              revenue: { total_raised: 0, total_goal: 75008, progress_pct: 0, currency: "USD", days_remaining: null },
              staff: { total_staff: 1, active_today: 0 },
              governance: { has_active_election: false, active_election_id: null, active_election_label: null, ballots_cast: 0, participation_pct: 0 },
              campaigns: [
                { id: "c1", title: "Ramadan Iftar Fund", progress_pct: 40, raised_amount: 4000, goal_amount: 10000, currency: "USD", status: "active" },
                { id: "c2", title: "New Roof Project", progress_pct: 100, raised_amount: 20000, goal_amount: 20000, currency: "USD", status: "closed" },
              ],
              financial_chart: { period: "week", bars: null },
              donation_stats: { average_donation: 0, recurring_donors: 0, refunds_requested: 0, currency: "USD" },
            },
          }),
        });
      });
      await waitForMosqueReady(page);

      await expect(page.getByText('Ramadan Iftar Fund')).toBeVisible();
      await expect(page.getByText('New Roof Project')).toBeVisible();
      await expect(page.getByText('Complete')).toBeVisible(); // status: closed badge
    });

    test('shows empty state when there are no campaigns', async ({ page }) => {
      await page.route('**/api/**/dashboard/summary*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: "ok",
            data: {
              community: { total_members: 0, verified_households: 0, growth_pct: 0 },
              revenue: { total_raised: 0, total_goal: 0, progress_pct: 0, currency: "USD", days_remaining: null },
              staff: { total_staff: 0, active_today: 0 },
              governance: { has_active_election: false, active_election_id: null, active_election_label: null, ballots_cast: 0, participation_pct: 0 },
              campaigns: [],
              financial_chart: { period: "week", bars: null },
              donation_stats: { average_donation: 0, recurring_donors: 0, refunds_requested: 0, currency: "USD" },
            },
          }),
        });
      });
      await waitForMosqueReady(page);

      await expect(page.getByText('No campaigns yet')).toBeVisible();
    });
  });

  // ── Audit Log ─────────────────────────────────────────────────────
  test.describe('Audit Log', () => {
    test('displays audit entries with actor, target, and scope', async ({ page }) => {
      // Mocked — same reasoning as campaigns above: live audit data changes
      // constantly (new invites, role changes), so we control the fixture.
      await page.route('**/permissions/audit-log*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: "Audit logs retrieved successfully",
            data: [{
              id: "entry-1",
              actor: { id: "u1", name: "test@masjids.io" },
              action: "ACCEPT",
              target_user: { id: "u1", name: "test@masjids.io" },
              scope: "STAFF_INVITATION",
              reason: "Accepted invitation for role: Comms Officer",
              timestamp: new Date().toISOString(),
            }],
            metadata: { total_data: 1, total_page: 1, page: 1, limit: 20 },
          }),
        });
      });
      await waitForMosqueReady(page);

      await expect(page.getByText(/STAFF_INVITATION/).first()).toBeVisible();
      await expect(page.getByText(/Accepted invitation for role: Comms Officer/)).toBeVisible();
    });

    test('shows empty state when there is no audit activity', async ({ page }) => {
      await page.route('**/permissions/audit-log*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: "Audit logs retrieved successfully",
            data: [],
            metadata: { total_data: 0, total_page: 1, page: 1, limit: 20 },
          }),
        });
      });
      await waitForMosqueReady(page);

      await expect(page.getByText('No audit activity yet')).toBeVisible();
    });

    test('handles unmapped action types with a default icon (no crash)', async ({ page }) => {
      await page.route('**/permissions/audit-log*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: "ok",
            data: [{
              id: "test-entry-1",
              actor: { id: "u1", name: "Test Actor" },
              action: "SOME_UNKNOWN_ACTION",
              target_user: { id: "u2", name: "Test Target" },
              scope: "TEST_SCOPE",
              reason: "Testing unmapped action",
              timestamp: new Date().toISOString(),
            }],
            metadata: { total_data: 1, total_page: 1, page: 1, limit: 20 },
          }),
        });
      });
      await waitForMosqueReady(page);

      await expect(page.getByText('Test Actor → Test Target')).toBeVisible();
      await expect(page.getByText('TEST_SCOPE')).toBeVisible();
    });
  });

  // ── Financial chart ───────────────────────────────────────────────
  test.describe('Financial chart', () => {
    test('switching period triggers a new summary fetch', async ({ page }) => {
      const requestPromise = page.waitForRequest((req) =>
        req.url().includes('/dashboard/summary') && req.url().includes('period=month')
      );
      await page.getByTestId('chart-period-month').click();
      await requestPromise;
    });

    test('shows empty state when bars is null', async ({ page }) => {
      // Real seeded account's financial_chart.bars is null
      await expect(page.getByText(/No revenue data yet for this period/)).toBeVisible();
    });

    test('renders bars when data is present', async ({ page }) => {
      await page.route('**/api/**/dashboard/summary*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: "ok",
            data: {
              community: { total_members: 1, verified_households: 1, growth_pct: 12 },
              revenue: { total_raised: 5000, total_goal: 75008, progress_pct: 6, currency: "USD", days_remaining: 30 },
              staff: { total_staff: 1, active_today: 0 },
              governance: { has_active_election: false, active_election_id: null, active_election_label: null, ballots_cast: 0, participation_pct: 0 },
              campaigns: [],
              financial_chart: {
                period: "week",
                bars: [
                  { label: "Mon", amount: 100 },
                  { label: "Tue", amount: 250 },
                  { label: "Wed", amount: 180 },
                ],
              },
              donation_stats: { average_donation: 50, recurring_donors: 3, refunds_requested: 0, currency: "USD" },
            },
          }),
        });
      });
      await waitForMosqueReady(page);

      // exact: true — without it, "Mon" also substring-matches the "Month"
      // period button and the "Governance Monitor" heading.
      await expect(page.getByText('Mon', { exact: true })).toBeVisible();
      await expect(page.getByText('Tue', { exact: true })).toBeVisible();
      await expect(page.getByText('Wed', { exact: true })).toBeVisible();
      await expect(page.getByText('No revenue data yet for this period')).not.toBeVisible();
    });
  });

  // ── Mosque context ────────────────────────────────────────────────
  test.describe('Mosque header', () => {
    test('displays active mosque name', async ({ page }) => {
      const defaultMosque = process.env.TEST_DEFAULT_MOSQUE || 'Islamic Center of America1';
      // The name legitimately renders in two places at once — the header
      // subtitle AND the MosqueSwitcher button label. .first() is fine here
      // since we're only confirming the name is shown, not which instance.
      await expect(page.getByText(defaultMosque).first()).toBeVisible();
    });
  });
});