import { test, expect } from '@playwright/test';

/**
 * CONTRACT test — hits the REAL /dashboard/summary and /permissions/audit-log
 * endpoints and checks only the SHAPE/TYPE of the response, not specific values.
 *
 * This is what catches API drift (renamed/removed/retyped fields) that a
 * mocked UI test (dashboard.spec.ts) would never notice, since that test's
 * mock keeps matching its own hardcoded shape regardless of what the real
 * API does. This file is the one responsible for catching that drift.
 *
 * If this test fails: the real API's response shape changed — go update
 * the TypeScript type AND the UI code that reads it.
 * If dashboard.spec.ts fails: the UI's rendering logic broke for a given
 * (possibly hypothetical) input — go fix the component.
 */
test.describe('API contract — /dashboard/summary', () => {
  test('response matches expected shape and field types', async ({ request }) => {
    const masjidId = process.env.TEST_MASJID_ID;
    test.skip(!masjidId, 'TEST_MASJID_ID not set in .env — skipping contract test');

    const response = await request.get(`/api/masjids/${masjidId}/dashboard/summary?period=week`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    expect(body).toMatchObject({
      success: expect.any(Boolean),
      message: expect.any(String),
      data: {
        community: {
          total_members: expect.any(Number),
          verified_households: expect.any(Number),
          growth_pct: expect.any(Number),
        },
        revenue: {
          total_raised: expect.any(Number),
          total_goal: expect.any(Number),
          progress_pct: expect.any(Number),
          currency: expect.any(String),
          // days_remaining can be a number OR null — checked separately below
        },
        staff: {
          total_staff: expect.any(Number),
          active_today: expect.any(Number),
        },
        governance: {
          has_active_election: expect.any(Boolean),
          ballots_cast: expect.any(Number),
          participation_pct: expect.any(Number),
          // active_election_id / active_election_label can be string OR null
        },
        campaigns: expect.any(Array),
        financial_chart: {
          period: expect.any(String),
          // bars can be an Array OR null — checked separately below
        },
        donation_stats: {
          average_donation: expect.any(Number),
          recurring_donors: expect.any(Number),
          refunds_requested: expect.any(Number),
          currency: expect.any(String),
        },
      },
    });

    // Nullable fields — assert type is EITHER the expected type or null,
    // not a specific value, since real data varies.
    expect(
      body.data.revenue.days_remaining === null || typeof body.data.revenue.days_remaining === 'number'
    ).toBe(true);
    expect(
      body.data.financial_chart.bars === null || Array.isArray(body.data.financial_chart.bars)
    ).toBe(true);
    expect(
      body.data.governance.active_election_id === null || typeof body.data.governance.active_election_id === 'string'
    ).toBe(true);

    // If there ARE campaigns, check each one's shape (not specific titles/values)
    for (const campaign of body.data.campaigns) {
      expect(campaign).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        progress_pct: expect.any(Number),
        raised_amount: expect.any(Number),
        goal_amount: expect.any(Number),
        currency: expect.any(String),
        status: expect.any(String),
      });
    }
  });
});

test.describe('API contract — /permissions/audit-log', () => {
  test('response matches expected shape and field types', async ({ request }) => {
    const masjidId = process.env.TEST_MASJID_ID;
    test.skip(!masjidId, 'TEST_MASJID_ID not set in .env — skipping contract test');

    const response = await request.get(`/api/masjids/${masjidId}/permissions/audit-log`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    expect(body).toMatchObject({
      success: expect.any(Boolean),
      message: expect.any(String),
      data: expect.any(Array),
      metadata: {
        total_data: expect.any(Number),
        total_page: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
      },
    });

    // Check the shape of each entry, not its specific content
    for (const entry of body.data) {
      expect(entry).toMatchObject({
        id: expect.any(String),
        actor: { id: expect.any(String), name: expect.any(String) },
        action: expect.any(String),
        target_user: { id: expect.any(String), name: expect.any(String) },
        scope: expect.any(String),
        timestamp: expect.any(String),
      });
      // reason is optional/nullable
      expect(
        entry.reason === undefined || entry.reason === null || typeof entry.reason === 'string'
      ).toBe(true);
    }
  });
});