import { test, expect, type Page, type Route } from '@playwright/test';
import type { AnnouncementListItem, AnnouncementCategory } from '@/types/api';

/**
 * Newsroom (public announcements feed) tests — no auth required.
 * Placed under tests/public/ so it's picked up by the 'public'
 * Playwright project (no storageState). Both hooks used here
 * (getAnnouncements/getAnnouncementDetail) are documented [public] in
 * hooks/announcements/useAnnouncements.ts.
 *
 * Route assumed: /public-masjids/{masjidId}/news, inferred from the
 * router.push pattern inside the page (`/public-masjids/${masjidId}/news/${item.id}`
 * for detail navigation). Adjust MASJID_ID/BASE_URL if the real route
 * for the list page itself differs.
 *
 * Mocked endpoint (cross-checked against hooks/announcements/useAnnouncements.ts):
 *   - GET /api/masjids/:id/announcements   (ANN-02, paginated, category filter)
 */

const MASJID_ID = 'masjid-1';
const BASE_URL = `/public-masjids/${MASJID_ID}/news`;

function buildAnnouncement(overrides: Partial<AnnouncementListItem> = {}): AnnouncementListItem {
  return {
    id: overrides.id ?? 'ann-1',
    title: overrides.title ?? 'Friday Khutbah Schedule Update',
    body: overrides.body ?? 'This week\'s khutbah will be delivered by Sheikh Ahmad, covering the topic of patience in hardship.',
    category: overrides.category ?? 'general',
    media_url: overrides.media_url === undefined ? null : overrides.media_url,
    published_at: overrides.published_at ?? new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  };
}

function buildAnnouncementsResponse(
  data: AnnouncementListItem[],
  metadata: Partial<{ total_data: number; total_page: number; page: number; limit: number }> = {}
) {
  return {
    success: true,
    message: 'OK',
    data,
    metadata: {
      total_data: metadata.total_data ?? data.length,
      total_page: metadata.total_page ?? 1,
      page: metadata.page ?? 1,
      limit: metadata.limit ?? 10,
    },
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockAnnouncements(page: Page, handler: (route: Route, url: URL) => Promise<void>) {
  await page.route(`**/api/masjids/${MASJID_ID}/announcements?*`, async (route) => {
    const url = new URL(route.request().url());
    await handler(route, url);
  });
}

test.describe('Newsroom page (public)', () => {
  test('loads announcements feed and shows total count', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([
        buildAnnouncement({ id: 'ann-1', title: 'Friday Khutbah Schedule Update' }),
        buildAnnouncement({ id: 'ann-2', title: 'Ramadan Timetable Released', category: 'event' }),
      ], { total_data: 2 }));
    });

    await page.goto(BASE_URL);

    await expect(page.getByTestId('posts-feed')).toBeVisible();
    await expect(page.getByTestId('post-card-ann-1')).toBeVisible();
    await expect(page.getByTestId('post-card-ann-2')).toBeVisible();
    await expect(page.getByTestId('newsroom-total-count')).toHaveText('(2)');
  });

  test('shows urgent banner when an urgent announcement exists in the current page', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([
        buildAnnouncement({ id: 'ann-urgent', title: 'Emergency: Masjid Closed Today', category: 'urgent' }),
        buildAnnouncement({ id: 'ann-2', title: 'Weekly Update', category: 'general' }),
      ]));
    });

    await page.goto(BASE_URL);

    await expect(page.getByTestId('urgent-banner')).toBeVisible();
    await expect(page.getByTestId('urgent-banner-title')).toHaveText('Emergency: Masjid Closed Today');
  });

  test('does not show urgent banner when there is no urgent post', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([
        buildAnnouncement({ id: 'ann-1', category: 'general' }),
      ]));
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('urgent-banner')).toHaveCount(0);
  });

  test('clicking urgent banner "View Details" navigates to the announcement detail page', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([
        buildAnnouncement({ id: 'ann-urgent', title: 'Emergency Notice', category: 'urgent' }),
      ]));
    });
    // Detail page isn't the focus here; just confirm the client-side navigation target.
    await page.route(`**/public-masjids/${MASJID_ID}/news/ann-urgent`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Announcement Detail</body></html>' });
    });

    await page.goto(BASE_URL);
    await page.getByTestId('urgent-banner-view-details').click();

    await expect(page).toHaveURL(new RegExp(`/public-masjids/${MASJID_ID}/news/ann-urgent$`));
  });

  test('clicking a post card navigates to its detail page', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([
        buildAnnouncement({ id: 'ann-1', title: 'Friday Khutbah Schedule Update' }),
      ]));
    });
    await page.route(`**/public-masjids/${MASJID_ID}/news/ann-1`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Announcement Detail</body></html>' });
    });

    await page.goto(BASE_URL);
    await page.getByTestId('post-card-ann-1').getByTestId('post-card-read-more').click();

    await expect(page).toHaveURL(new RegExp(`/public-masjids/${MASJID_ID}/news/ann-1$`));
  });

  test('category filter sends the correct query param and updates results', async ({ page }) => {
    let lastUrl = '';
    await mockAnnouncements(page, async (route, url) => {
      lastUrl = url.toString();
      const isEventFilter = url.searchParams.get('category') === 'event';
      await fulfillJson(route, buildAnnouncementsResponse(
        isEventFilter
          ? [buildAnnouncement({ id: 'ann-event', title: 'Community Iftar Night', category: 'event' })]
          : [buildAnnouncement({ id: 'ann-1', category: 'general' }), buildAnnouncement({ id: 'ann-event', category: 'event' })]
      ));
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('post-card-ann-1')).toBeVisible();

    await page.getByTestId('filter-event').click();

    await expect.poll(() => lastUrl).toContain('category=event');
    await expect(page.getByTestId('filter-event')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('post-card-ann-event')).toBeVisible();
    await expect(page.getByTestId('post-card-ann-1')).not.toBeVisible();
  });

  test('"all posts" filter omits the category query param', async ({ page }) => {
    let lastUrl = '';
    await mockAnnouncements(page, async (route, url) => {
      lastUrl = url.toString();
      await fulfillJson(route, buildAnnouncementsResponse([buildAnnouncement({ id: 'ann-1' })]));
    });

    await page.goto(BASE_URL);
    await page.getByTestId('filter-general').click();
    await expect.poll(() => lastUrl).toContain('category=general');

    await page.getByTestId('filter-all').click();
    await expect.poll(() => lastUrl).not.toContain('category=');
  });

  test('shows empty state for a filtered category with no results, and can reset to all', async ({ page }) => {
    await mockAnnouncements(page, async (route, url) => {
      const isFundraising = url.searchParams.get('category') === 'fundraising';
      await fulfillJson(route, buildAnnouncementsResponse(
        isFundraising ? [] : [buildAnnouncement({ id: 'ann-1' })]
      ));
    });

    await page.goto(BASE_URL);
    await page.getByTestId('filter-fundraising').click();

    await expect(page.getByTestId('newsroom-empty-state')).toBeVisible();
    await expect(page.getByTestId('newsroom-empty-state')).toContainText('No fundraising announcements found');

    await page.getByTestId('empty-state-view-all').click();
    await expect(page.getByTestId('post-card-ann-1')).toBeVisible();
  });

  test('shows generic empty state when masjid has no announcements at all', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([]));
    });

    await page.goto(BASE_URL);

    await expect(page.getByTestId('newsroom-empty-state')).toBeVisible();
    await expect(page.getByTestId('newsroom-empty-state')).toContainText("hasn't posted any announcements yet");
    await expect(page.getByTestId('empty-state-view-all')).toHaveCount(0);
  });

  test('shows error state and can retry', async ({ page }) => {
    let callCount = 0;
    await mockAnnouncements(page, async (route) => {
      callCount += 1;
      if (callCount === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Failed to load announcements' }) });
      } else {
        await fulfillJson(route, buildAnnouncementsResponse([buildAnnouncement({ id: 'ann-1' })]));
      }
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('newsroom-error-state')).toContainText('Failed to load announcements');

    await page.getByTestId('newsroom-error-retry').click();
    await expect(page.getByTestId('post-card-ann-1')).toBeVisible();
    expect(callCount).toBe(2);
  });

  test('load more fetches next page and appends posts', async ({ page }) => {
    const urls: string[] = [];
    await mockAnnouncements(page, async (route, url) => {
      urls.push(url.toString());
      const pageParam = url.searchParams.get('page') ?? '1';
      if (pageParam === '2') {
        await fulfillJson(route, buildAnnouncementsResponse(
          [buildAnnouncement({ id: 'ann-3', title: 'Page 2 Announcement' })],
          { total_data: 3, total_page: 2, page: 2, limit: 2 }
        ));
      } else {
        await fulfillJson(route, buildAnnouncementsResponse(
          [buildAnnouncement({ id: 'ann-1' }), buildAnnouncement({ id: 'ann-2' })],
          { total_data: 3, total_page: 2, page: 1, limit: 2 }
        ));
      }
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('post-card-ann-2')).toBeVisible();
    await expect(page.getByTestId('load-more-button')).toBeVisible();

    await page.getByTestId('load-more-button').click();

    await expect(page.getByTestId('post-card-ann-3')).toBeVisible();
    // Previous page posts remain (append, not replace)
    await expect(page.getByTestId('post-card-ann-1')).toBeVisible();
    expect(urls.some((u) => u.includes('page=2'))).toBe(true);
  });

  test('shows end-of-feed message when there is no more page to load', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse(
        [buildAnnouncement({ id: 'ann-1' })],
        { total_data: 1, total_page: 1, page: 1, limit: 10 }
      ));
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('feed-end-message')).toBeVisible();
    await expect(page.getByTestId('load-more-button')).toHaveCount(0);
  });

  test('copy link button copies the announcement URL to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([buildAnnouncement({ id: 'ann-1' })]));
    });

    await page.goto(BASE_URL);
    await page.getByTestId('post-card-copy-link').click();

    await expect(page.getByTestId('post-card-copy-link')).toContainText('Copied!');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain(`/public-masjids/${MASJID_ID}/news/ann-1`);
  });

  test('copy link and share buttons do not trigger card navigation', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([buildAnnouncement({ id: 'ann-1' })]));
    });

    // Prevent the WhatsApp popup from actually opening a new tab/window during the test.
    await page.route('https://wa.me/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>WhatsApp</body></html>' });
    });

    await page.goto(BASE_URL);
    await page.getByTestId('post-card-share-whatsapp').click();

    // Still on the newsroom page — click was captured by the button, not the card.
    await expect(page).toHaveURL(new RegExp(`${BASE_URL}$`));
  });

  test('renders media image when announcement includes media_url', async ({ page }) => {
    await mockAnnouncements(page, async (route) => {
      await fulfillJson(route, buildAnnouncementsResponse([
        buildAnnouncement({ id: 'ann-1', media_url: 'https://example.com/event-flyer.jpg' }),
      ]));
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('post-card-ann-1').getByTestId('post-card-media')).toBeVisible();
  });
});