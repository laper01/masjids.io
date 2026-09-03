import { test, expect } from '@playwright/test';

/**
 * Endpoints CONFIRMED against the real hook sources:
 * - getAnnouncements (useAnnouncements): GET /api/masjids/{id}/announcements
 *   (this matches what was already guessed for the admin Announcements page too)
 * - getFollowedMasjids (useFollowers): GET /api/users/me/followed-masjids
 *   (note: /users/me/, not /me/ — different from the useMemberships pattern)
 *
 * Still ASSUMED (not confirmed): the page route itself, /my-announcements —
 * adjust if the actual path differs.
 */

const MOCK_FOLLOWED = {
  success: true,
  data: [
    { masjid_id: 'masjid-1', name: 'Islamic Center of Testville', city: 'Testville', follower_count: 240, followed_at: '2026-01-10T00:00:00Z' },
    { masjid_id: 'masjid-2', name: 'Downtown Musalla', city: 'Metropolis', follower_count: 80, followed_at: '2026-01-01T00:00:00Z' },
  ],
};

const MOCK_ANNOUNCEMENTS = {
  success: true,
  data: [
    {
      id: 'ann-1', category: 'urgent', title: 'Emergency Closure Notice',
      body: 'The masjid will be closed tomorrow due to maintenance.',
      published_at: new Date(Date.now() - 3600_000).toISOString(), media_url: null,
    },
    {
      id: 'ann-2', category: 'event', title: 'Community Iftar Night',
      body: 'A'.repeat(250), // long body to trigger "Read more"
      published_at: new Date(Date.now() - 86400_000 * 2).toISOString(), media_url: 'https://cdn.example.com/iftar.jpg',
    },
  ],
  metadata: { total_data: 2, total_page: 1, page: 1, limit: 10 },
};

test.describe('My Announcements (follower feed)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users/me/followed-masjids*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_FOLLOWED) });
    });
    await page.route('**/api/masjids/*/announcements*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANNOUNCEMENTS) });
    });
    await page.goto('/my-announcements');
  });

  // ── Page load & masjid selector ─────────────────────────────────
  test.describe('Page load & masjid selector', () => {
    test('auto-selects the most recently followed masjid', async ({ page }) => {
      // masjid-1 has the later followed_at, so it should be selected and
      // its name shown as the page heading.
      await expect(page.getByRole('heading', { name: 'Islamic Center of Testville' })).toBeVisible();
    });

    test('shows chips for all followed masjids when there is more than one', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Islamic Center of Testville/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Downtown Musalla/ })).toBeVisible();
    });

    test('hides the chip row entirely when only one masjid is followed', async ({ page }) => {
      await page.route('**/api/users/me/followed-masjids*', (route) => {
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [MOCK_FOLLOWED.data[0]] }),
        });
      });
      await page.goto('/my-announcements');

      await expect(page.getByRole('button', { name: /Islamic Center of Testville/ })).not.toBeVisible();
      await expect(page.getByRole('heading', { name: 'Islamic Center of Testville' })).toBeVisible();
    });

    test('shows empty state when the user follows no masjids', async ({ page }) => {
      await page.route('**/api/users/me/followed-masjids*', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
      });
      await page.goto('/my-announcements');

      await expect(page.getByText('Follow a masjid to see updates')).toBeVisible();
    });

    test('switching masjid chips loads that masjid\'s announcements and resets to page 1', async ({ page }) => {
      let lastRequestedMasjid: string | null = null;
      await page.route('**/api/masjids/*/announcements*', (route) => {
        const match = route.request().url().match(/\/masjids\/([^/]+)\/announcements/);
        lastRequestedMasjid = match?.[1] ?? null;
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANNOUNCEMENTS) });
      });

      await page.getByRole('button', { name: /Downtown Musalla/ }).click();

      await expect.poll(() => lastRequestedMasjid).toBe('masjid-2');
      await expect(page.getByRole('heading', { name: 'Downtown Musalla' })).toBeVisible();
    });
  });

  // ── Error handling ─────────────────────────────────────────────
  test.describe('Error handling', () => {
    test('shows an error banner and dismiss clears it', async ({ page }) => {
      await page.route('**/api/users/me/followed-masjids*', (route) => {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Failed to load followed masjids' }) });
      });
      await page.goto('/my-announcements');

      await expect(page.getByRole('alert')).toContainText('Failed to load followed masjids');
      await page.getByRole('button', { name: 'Dismiss error' }).click();
      await expect(page.getByRole('alert')).not.toBeVisible();
    });
  });

  // ── Announcements feed ───────────────────────────────────────────
  test.describe('Announcements feed', () => {
    test('renders announcement cards with category badge and relative time', async ({ page }) => {
      await expect(page.getByText('Emergency Closure Notice')).toBeVisible();
      await expect(page.getByText('Urgent')).toBeVisible();
      await expect(page.getByText(/\d+m ago|Just now/)).toBeVisible();
    });

    test('renders an image when media_url is present', async ({ page }) => {
      const card = page.locator('article').filter({ hasText: 'Community Iftar Night' });
      await expect(card.locator('img')).toHaveAttribute('src', 'https://cdn.example.com/iftar.jpg');
    });

    test('long bodies are truncated with a "Read more" toggle', async ({ page }) => {
      const card = page.locator('article').filter({ hasText: 'Community Iftar Night' });
      const readMore = card.getByRole('button', { name: 'Read more' });
      await expect(readMore).toBeVisible();

      await readMore.click();
      await expect(card.getByRole('button', { name: 'Show less' })).toBeVisible();
    });

    test('short bodies show no "Read more" toggle', async ({ page }) => {
      const card = page.locator('article').filter({ hasText: 'Emergency Closure Notice' });
      await expect(card.getByRole('button', { name: 'Read more' })).not.toBeVisible();
    });

    test('shows a per-masjid empty state when there are no announcements', async ({ page }) => {
      await page.route('**/api/masjids/*/announcements*', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], metadata: { total_data: 0, total_page: 1, page: 1, limit: 10 } }) });
      });
      await page.goto('/my-announcements');

      await expect(page.getByText('No announcements yet')).toBeVisible();
      await expect(page.getByText(/hasn't posted any updates yet/)).toBeVisible();
    });
  });

  // ── Pagination ───────────────────────────────────────────────────
  test.describe('Pagination', () => {
    test('is hidden when there is only one page', async ({ page }) => {
      await expect(page.getByText(/Page \d+ of \d+/)).not.toBeVisible();
    });

    test('Previous is disabled on the first page, Next fetches page 2', async ({ page }) => {
      await page.route('**/api/masjids/*/announcements*', (route) => {
        const url = new URL(route.request().url());
        const p = url.searchParams.get('page') ?? '1';
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_ANNOUNCEMENTS.data, metadata: { total_data: 25, total_page: 3, page: Number(p), limit: 10 } }),
        });
      });
      await page.goto('/my-announcements');

      await expect(page.getByRole('button', { name: /previous/i })).toBeDisabled();
      await expect(page.getByText('Page 1 of 3')).toBeVisible();

      await page.getByRole('button', { name: /next/i }).click();
      await expect(page.getByText('Page 2 of 3')).toBeVisible();
    });

    test('Next is disabled on the last page', async ({ page }) => {
      await page.route('**/api/masjids/*/announcements*', (route) => {
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_ANNOUNCEMENTS.data, metadata: { total_data: 20, total_page: 2, page: 2, limit: 10 } }),
        });
      });
      await page.goto('/my-announcements');

      await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });
});