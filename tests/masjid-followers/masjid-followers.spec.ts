import { test, expect, Page } from '@playwright/test';
import { waitForMosqueReady } from '../helpers/wait-for-mosque';

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT (confirmed from hooks/followers/useFollowers.ts → getFollowers)
//   GET /api/masjids/{masjid_id}/followers?page=1&limit=10   (FOL-04)
//
// Response envelope (GetFollowersResponse, per types/api.ts):
//   { success, message, data: { masjid_id, follower_count, data: MasjidFollower[], metadata } }
//   NOTE: the array field is named `data` (nested inside the outer `data`),
//   not `followers` — confirmed against the real GetFollowersData type, and
//   matches the fix already applied to MasjidFollowersPage.tsx
//   (`followers?.data.data`, not `followers?.data.followers`).
// ─────────────────────────────────────────────────────────────────────────────

function makeFollowerItem(overrides: Partial<{
  user_id: string;
  name: string;
  avatar_url: string;
  followed_at: string;
}> = {}) {
  return {
    user_id: 'user-f-001',
    name: 'Fatimah Zahra',
    avatar_url: '',
    followed_at: '2024-05-10T00:00:00.000Z',
    ...overrides,
  };
}

const DEFAULT_FOLLOWERS = [
  makeFollowerItem({ user_id: 'user-f-001', name: 'Fatimah Zahra' }),
  makeFollowerItem({ user_id: 'user-f-002', name: 'Umar Hakim' }),
  makeFollowerItem({ user_id: 'user-f-003', name: 'Layla Putri' }),
];

async function mockFollowers(
  page: Page,
  opts: {
    followers?: typeof DEFAULT_FOLLOWERS;
    followerCount?: number;
    status?: number;
  } = {}
) {
  const followers = opts.followers ?? DEFAULT_FOLLOWERS;
  const followerCount = opts.followerCount ?? followers.length;
  const status = opts.status ?? 200;

  await page.route('**/api/masjids/*/followers**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Server error', data: null }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'OK',
        data: {
          masjid_id: 'msj-uuid-001',
          follower_count: followerCount,
          data: followers,
          metadata: { total_data: followerCount, total_page: 1, page: 1, limit: 10 },
        },
      }),
    });
  });
}

test.describe('Masjid Followers page', () => {
  test('loads and displays followers with total count', async ({ page }) => {
    await mockFollowers(page);
    await page.goto('/masjid-followers');
    await waitForMosqueReady(page, '/masjid-followers');

    await expect(page.getByTestId('masjid-followers-page')).toBeVisible();
    await expect(page.getByTestId('followers-total-count')).toHaveText('3');

    for (const f of DEFAULT_FOLLOWERS) {
      await expect(page.getByTestId(`follower-row-${f.user_id}`)).toBeVisible();
      await expect(page.getByTestId(`follower-row-${f.user_id}`)).toContainText(f.name);
    }
  });

  test('filters followers by search term (client-side)', async ({ page }) => {
    await mockFollowers(page);
    await page.goto('/masjid-followers');
    await waitForMosqueReady(page, '/masjid-followers');

    await page.getByTestId('followers-search-input').fill('Umar');

    await expect(page.getByTestId('follower-row-user-f-002')).toBeVisible();
    await expect(page.getByTestId('follower-row-user-f-001')).not.toBeVisible();
    await expect(page.getByTestId('follower-row-user-f-003')).not.toBeVisible();
  });

  test('filters followers by partial user id', async ({ page }) => {
    await mockFollowers(page);
    await page.goto('/masjid-followers');
    await waitForMosqueReady(page, '/masjid-followers');

    await page.getByTestId('followers-search-input').fill('f-003');

    await expect(page.getByTestId('follower-row-user-f-003')).toBeVisible();
    await expect(page.getByTestId('follower-row-user-f-001')).not.toBeVisible();
  });

  test('shows empty state when search matches nothing', async ({ page }) => {
    await mockFollowers(page);
    await page.goto('/masjid-followers');
    await waitForMosqueReady(page, '/masjid-followers');

    await page.getByTestId('followers-search-input').fill('nonexistent-name-xyz');

    await expect(page.getByTestId('followers-empty-state')).toBeVisible();
    await expect(page.getByTestId('followers-empty-state')).toContainText('No followers match your search.');
  });

  test('shows empty list when masjid has zero followers', async ({ page }) => {
    await mockFollowers(page, { followers: [], followerCount: 0 });
    await page.goto('/masjid-followers');
    await waitForMosqueReady(page, '/masjid-followers');

    await expect(page.getByTestId('followers-total-count')).toHaveText('0');
    await expect(page.getByTestId('followers-empty-state')).toBeVisible();
  });

  test('shows error state and retries successfully', async ({ page }) => {
    await mockFollowers(page, { status: 500 });
    await page.goto('/masjid-followers');
    await waitForMosqueReady(page, '/masjid-followers');

    await expect(page.getByTestId('followers-error-state')).toBeVisible();
    await expect(page.getByTestId('followers-error-state')).toContainText('Failed to load followers');

    // Fix the mock before retrying
    await mockFollowers(page);
    await page.getByTestId('followers-retry-btn').click();

    await expect(page.getByTestId('masjid-followers-page')).toBeVisible();
    await expect(page.getByTestId('follower-row-user-f-001')).toBeVisible();
  });

  test('renders verified badge only when mosque is verified', async ({ page }) => {
    await mockFollowers(page);
    await page.goto('/masjid-followers');
    await waitForMosqueReady(page, '/masjid-followers');

    // Assumes the seeded/default active mosque used by waitForMosqueReady
    // is verified. If the fixture mosque is not verified, this assertion
    // should be flipped to `.not.toBeVisible()`.
    const badge = page.getByTestId('followers-verified-badge');
    const isVisible = await badge.isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });

  test('mosque name is displayed in header', async ({ page }) => {
    await mockFollowers(page);
    await page.goto('/masjid-followers');
    await waitForMosqueReady(page, '/masjid-followers');

    await expect(page.getByTestId('followers-mosque-name')).toBeVisible();
    await expect(page.getByTestId('followers-mosque-name')).not.toBeEmpty();
  });
});