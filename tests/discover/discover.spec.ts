import { test, expect, type Page, type Route } from '@playwright/test';
import type { MasjidApiItem, MasjidListResponse } from '@/types/masjid';

/**
 * Discover page tests — requires an authenticated admin session
 * (page is behind login, so this file MUST stay in the root `tests/`
 * dir, NOT under tests/public/ or tests/voting/, so it's picked up by
 * the 'admin' Playwright project which uses storageState:
 * playwright/.auth/admin.json).
 *
 * Mocked endpoints (cross-checked against source hooks):
 *   - GET /api/masjids                          → hooks/useMasjids.ts (list + pagination)
 *   - GET /api/masjids/:id/photo/cover           → hooks/masjid/useMasjidMedia.ts getCoverPhoto
 *   - GET /api/masjids/:id/facility              → hooks/masjid/useMasjidMedia.ts getFacility
 *   - GET /api/adhan                             → hooks/useAdhanList.ts (called for real
 *     because the session is authenticated here — unlike a true public/anon visitor,
 *     `status` will be "authenticated" so the hook actually fetches instead of
 *     short-circuiting to error: "unauthenticated")
 *
 * NOTE: types/media.ts and types/adhan.ts were not provided, so the
 * cover/facility/adhan response shapes below are inferred strictly from
 * field access in useMasjidMedia.ts / useAdhanList.ts. Adjust if the
 * real shape differs.
 */

const NYC_COORDS = { latitude: 40.7128, longitude: -74.006 };

function buildMasjid(overrides: Partial<MasjidApiItem> = {}): MasjidApiItem {
  return {
    id: overrides.id ?? 'masjid-1',
    name: overrides.name ?? 'Islamic Center of Testville',
    location: overrides.location ?? 'Testville',
    subDomain: overrides.subDomain ?? 'testville',
    is_verified: overrides.is_verified ?? true,
    latitude: overrides.latitude ?? 40.72,
    longitude: overrides.longitude ?? -74.0,
    version: overrides.version ?? 1,
    address: overrides.address ?? {
      address_line_1: '123 Main St',
      address_line_2: '',
      city: 'Testville',
      postal_code: '10001',
      country_code: 'US',
    },
    phone_number: overrides.phone_number ?? { country_code: '1', number: '5551234567' },
    prayer_times_configuration: overrides.prayer_times_configuration ?? {
      name: 'Default',
      method: 'MWL',
      fajr_angle: 18,
      isha_angle: 18,
      isha_interval: 0,
      asr_method: 'Standard',
      high_latitude_rule: 'MiddleOfTheNight',
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    },
  };
}

function buildListResponse(
  data: MasjidApiItem[],
  metadata: Partial<MasjidListResponse['metadata']> = {}
): MasjidListResponse {
  return {
    success: true,
    message: 'OK',
    data,
    metadata: {
      total_data: metadata.total_data ?? data.length,
      total_page: metadata.total_page ?? 1,
      page: metadata.page ?? 1,
      limit: metadata.limit ?? 12,
    },
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Mocks the per-card media endpoints (cover photo + facility) for any masjid id. */
async function mockMasjidMedia(page: Page) {
  await page.route('**/api/masjids/*/photo/cover', async (route) => {
    await fulfillJson(route, {
      success: true,
      message: 'OK',
      data: { cover_photo_url: 'https://example.com/cover.jpg' },
    });
  });

  await page.route('**/api/masjids/*/facility', async (route) => {
    await fulfillJson(route, {
      success: true,
      message: 'OK',
      data: {
        capacity: { total: 250 },
        services: ['Halal Food Nearby', 'Funeral Services', "Women's Prayer Area"],
        languages: ['English'],
      },
    });
  });
}

/**
 * Mocks GET /api/adhan. Because this test suite runs as an
 * authenticated admin (not anonymous), useAdhanList actually fires the
 * request instead of short-circuiting to "unauthenticated" — so this
 * must be mocked or every card falls back to whatever the real dev
 * server / backend returns.
 */
async function mockAdhanList(page: Page, files: Array<{ id: string; name: string; url: string }> = []) {
  await page.route('**/api/adhan?*', async (route) => {
    await fulfillJson(route, {
      success: true,
      message: 'OK',
      data: files,
      metadata: { total_data: files.length, total_page: 1, page: 1, limit: 5 },
    });
  });
}

test.describe('Discover page (authenticated admin)', () => {
  test.beforeEach(async ({ context }) => {
    // Grant geolocation by default; individual tests override as needed.
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(NYC_COORDS);
  });

  test('loads masjids with GPS enabled and shows distance-sorted results', async ({ page }) => {
    const requestUrls: string[] = [];
    await page.route('**/api/masjids?*', async (route) => {
      requestUrls.push(route.request().url());
      await fulfillJson(
        route,
        buildListResponse([
          buildMasjid({ id: 'm1', name: 'Masjid Al-Noor' }),
          buildMasjid({ id: 'm2', name: 'Masjid Al-Huda' }),
        ])
      );
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');

    await expect(page.getByTestId('location-banner')).toHaveAttribute('data-banner-state', 'active');
    await expect(page.getByTestId('masjids-grid')).toBeVisible();
    await expect(page.getByTestId('masjid-card-m1')).toBeVisible();
    await expect(page.getByTestId('masjid-card-m2')).toBeVisible();
    await expect(page.getByTestId('results-count')).toContainText('2 locations within 50 km');

    // GPS coords should have been forwarded on the initial fetch.
    expect(requestUrls[0]).toContain(`lat=${NYC_COORDS.latitude}`);
    expect(requestUrls[0]).toContain(`lon=${NYC_COORDS.longitude}`);
  });

  test('shows location error banner when GPS permission is denied', async ({ context, page }) => {
    await context.clearPermissions();

    await page.route('**/api/masjids?*', async (route) => {
      await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');

    await expect(page.getByTestId('location-banner')).toHaveAttribute('data-banner-state', 'error');
    await expect(page.getByTestId('location-banner')).toContainText(/denied|unavailable/i);
    await expect(page.getByTestId('results-count')).toContainText('Found 1 location');
  });

  test('searching by name sends the query param and re-renders results', async ({ page }) => {
    let lastUrl = '';
    await page.route('**/api/masjids?*', async (route) => {
      lastUrl = route.request().url();
      const isSearch = lastUrl.includes('name=Al-Noor');
      await fulfillJson(
        route,
        buildListResponse(
          isSearch
            ? [buildMasjid({ id: 'm1', name: 'Masjid Al-Noor' })]
            : [buildMasjid({ id: 'm1', name: 'Masjid Al-Noor' }), buildMasjid({ id: 'm2', name: 'Masjid Al-Huda' })]
        )
      );
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');
    await expect(page.getByTestId('masjids-grid')).toBeVisible();

    await page.getByTestId('search-name-input').fill('Al-Noor');
    await page.getByTestId('search-submit-button').click();

    await expect.poll(() => lastUrl).toContain('name=Al-Noor');
    await expect(page.getByTestId('masjid-card-m1')).toBeVisible();
    await expect(page.getByTestId('masjid-card-m2')).not.toBeVisible();
  });

  test('applying radius filter sends the new radius param', async ({ page }) => {
    let lastUrl = '';
    await page.route('**/api/masjids?*', async (route) => {
      lastUrl = route.request().url();
      await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');
    await expect(page.getByTestId('masjids-grid')).toBeVisible();

    await page.getByTestId('filter-radius-number-input').fill('120');
    await page.getByTestId('filter-apply-button').click();

    await expect.poll(() => lastUrl).toContain('radius=120');
    await expect(page.getByTestId('results-count')).toContainText('within 120 km');
  });

  test('reset filters clears name/location and refetches without them', async ({ page }) => {
    let lastUrl = '';
    await page.route('**/api/masjids?*', async (route) => {
      lastUrl = route.request().url();
      await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');
    await expect(page.getByTestId('masjids-grid')).toBeVisible();

    await page.getByTestId('search-name-input').fill('Something');
    await page.getByTestId('search-submit-button').click();
    await expect.poll(() => lastUrl).toContain('name=Something');

    await page.getByTestId('filter-reset-button').click();
    await expect.poll(() => lastUrl).not.toContain('name=Something');
    await expect(page.getByTestId('search-name-input')).toHaveValue('');
  });

  test('shows empty state and resets filters from it', async ({ page }) => {
    await page.route('**/api/masjids?*', async (route) => {
      await fulfillJson(route, buildListResponse([]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');

    await expect(page.getByTestId('masjids-empty-state')).toBeVisible();
    await page.getByTestId('empty-state-reset-button').click();
    // Reset just re-triggers a fetch; no crash / still on empty state is enough here.
    await expect(page.getByTestId('masjids-empty-state')).toBeVisible();
  });

  test('shows error state and retries on demand', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/masjids?*', async (route) => {
      callCount += 1;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Server error' }),
        });
      } else {
        await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
      }
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');

    await expect(page.getByTestId('masjids-error-state')).toBeVisible();
    await page.getByTestId('error-retry-button').click();

    await expect(page.getByTestId('masjids-grid')).toBeVisible();
    expect(callCount).toBe(2);
  });

  test('load more appends page 2 results', async ({ page }) => {
    const urls: string[] = [];
    await page.route('**/api/masjids?*', async (route) => {
      const url = route.request().url();
      urls.push(url);
      const params = new URL(url).searchParams;
      const pageParam = params.get('page') ?? '1';

      if (pageParam === '2') {
        await fulfillJson(
          route,
          buildListResponse([buildMasjid({ id: 'm3', name: 'Masjid Page 2' })], {
            total_data: 3,
            total_page: 2,
            page: 2,
            limit: 2,
          })
        );
      } else {
        await fulfillJson(
          route,
          buildListResponse(
            [buildMasjid({ id: 'm1', name: 'Masjid One' }), buildMasjid({ id: 'm2', name: 'Masjid Two' })],
            { total_data: 3, total_page: 2, page: 1, limit: 2 }
          )
        );
      }
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');
    await expect(page.getByTestId('masjid-card-m1')).toBeVisible();
    await expect(page.getByTestId('masjid-card-m2')).toBeVisible();

    await expect(page.getByTestId('load-more-button')).toBeVisible();
    await page.getByTestId('load-more-button').click();

    await expect(page.getByTestId('masjid-card-m3')).toBeVisible();
    expect(urls.some((u) => u.includes('page=2'))).toBe(true);
    // First page cards should still be present (append, not replace).
    await expect(page.getByTestId('masjid-card-m1')).toBeVisible();
  });

  test('mobile filter drawer opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.route('**/api/masjids?*', async (route) => {
      await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');
    await expect(page.getByTestId('masjids-grid')).toBeVisible();

    await page.getByTestId('mobile-filter-toggle').click();
    await expect(page.getByTestId('mobile-filter-drawer')).toBeVisible();
    await expect(page.getByTestId('filter-sidebar')).toBeVisible();

    await page.getByTestId('mobile-filter-close').click();
    await expect(page.getByTestId('mobile-filter-drawer')).not.toBeVisible();
  });

  test('view mode toggle switches active state between grid and map', async ({ page }) => {
    await page.route('**/api/masjids?*', async (route) => {
      await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');
    await expect(page.getByTestId('masjids-grid')).toBeVisible();

    await expect(page.getByTestId('view-mode-grid')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('view-mode-map')).toHaveAttribute('aria-pressed', 'false');

    await page.getByTestId('view-mode-map').click();

    await expect(page.getByTestId('view-mode-map')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('view-mode-grid')).toHaveAttribute('aria-pressed', 'false');
  });

  test('view profile button opens the public masjid page in a new tab', async ({ page, context }) => {
    await page.route('**/api/masjids?*', async (route) => {
      await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page);

    await page.goto('/discover');
    await expect(page.getByTestId('masjid-card-m1')).toBeVisible();

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('masjid-card-m1').getByTestId('masjid-card-view-profile').click(),
    ]);

    await expect(newPage).toHaveURL(/\/public-masjids\/m1$/);
  });

  test('adhan player shows empty state when masjid has no recordings', async ({ page }) => {
    await page.route('**/api/masjids?*', async (route) => {
      await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page, []); // no files

    await page.goto('/discover');
    await expect(page.getByTestId('masjid-card-m1')).toBeVisible();
    await expect(page.getByTestId('adhan-player-empty')).toBeVisible();
  });

  test('adhan player plays a recording and expands the list when multiple files exist', async ({ page }) => {
    await page.route('**/api/masjids?*', async (route) => {
      await fulfillJson(route, buildListResponse([buildMasjid({ id: 'm1' })]));
    });
    await mockMasjidMedia(page);
    await mockAdhanList(page, [
      { id: 'a1', name: 'Muezzin A', url: 'https://example.com/adhan-a.mp3' },
      { id: 'a2', name: 'Muezzin B', url: 'https://example.com/adhan-b.mp3' },
    ]);

    await page.goto('/discover');
    const card = page.getByTestId('masjid-card-m1');
    await expect(card.getByTestId('adhan-player')).toBeVisible();

    await card.getByTestId('adhan-list-toggle').click();
    await expect(card.getByTestId('adhan-list')).toBeVisible();
    await expect(card.getByTestId('adhan-list-item-1')).toContainText('Muezzin B');

    await card.getByTestId('adhan-list-item-1').click();
    await expect(card.getByTestId('adhan-play-toggle')).toHaveAttribute('aria-label', 'Play adhan');
  });
});