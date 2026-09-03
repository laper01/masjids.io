import { test, expect } from '@playwright/test';

/**
 * MOCK_MOSQUES shape — matches the real GET /api/masjids/me contract
 * (confirmed against an actual response payload). The page reads
 * `prayer_times_configuration.adjustments` without optional chaining, so a
 * flat mock without that nested object crashed rendering entirely before
 * any row could render.
 */
const MOCK_MOSQUES = [
  {
    id: 'mosque-1',
    name: 'Islamic Center of Testville',
    location: 'Testville, TX',
    subDomain: 'testville-masjid',
    is_verified: true,
    latitude: 32.7555,
    longitude: -97.3308,
    version: 1,
    address: {
      address_line_1: '123 Test St',
      address_line_2: '',
      city: 'Testville',
      postal_code: '75001',
      country_code: 'US',
    },
    phone_number: {
      country_code: '1',
      number: '5551234567',
    },
    prayer_times_configuration: {
      name: 'Default',
      method: 'NORTH_AMERICA',
      fajr_angle: 15,
      isha_angle: 15,
      isha_interval: 0,
      asr_method: 'SHAFI_HANBALI_MALIKI',
      high_latitude_rule: 'MIDDLE_OF_THE_NIGHT',
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    },
  },
  {
    id: 'mosque-2',
    name: 'Downtown Musalla',
    location: 'Metropolis, NY',
    subDomain: 'downtown-musalla',
    is_verified: false,
    latitude: 40.7128,
    longitude: -74.006,
    version: 1,
    address: {
      address_line_1: '456 Sample Ave',
      address_line_2: '',
      city: 'Metropolis',
      postal_code: '10001',
      country_code: 'US',
    },
    phone_number: {
      country_code: '1',
      number: '5559876543',
    },
    prayer_times_configuration: {
      name: 'Default',
      method: 'NORTH_AMERICA',
      fajr_angle: 15,
      isha_angle: 15,
      isha_interval: 0,
      asr_method: 'SHAFI_HANBALI_MALIKI',
      high_latitude_rule: 'MIDDLE_OF_THE_NIGHT',
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    },
  },
];

test.describe('Masjid Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/masjid-management');
  });

  // ── List display ───────────────────────────────────────────────
  test.describe('Listing', () => {
    test('displays mosques from the API', async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: MOCK_MOSQUES }),
        });
      });
      await page.goto('/masjid-management');

      await expect(page.getByText('Islamic Center of Testville')).toBeVisible();
      await expect(page.getByText('Downtown Musalla')).toBeVisible();
      await expect(page.getByText('testville-masjid.masjids.io')).toBeVisible();
    });

    test('shows skeleton rows while loading', async ({ page }) => {
      await page.route('**/api/masjids/me*', async (route) => {
        await new Promise((r) => setTimeout(r, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: MOCK_MOSQUES }),
        });
      });
      await page.goto('/masjid-management');

      await expect(page.locator('tr.animate-pulse').first()).toBeVisible();
    });

    test('shows empty state when there are no mosques', async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: [] }),
        });
      });
      await page.goto('/masjid-management');

      await expect(page.getByText('No masjids yet')).toBeVisible();
      await expect(page.getByText('Register your first masjid to get started')).toBeVisible();
    });

    test('hides stats bar when there are no mosques', async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: [] }),
        });
      });
      await page.goto('/masjid-management');

      await expect(page.getByText('Total Masjids')).not.toBeVisible();
    });
  });

  // ── Error handling ─────────────────────────────────────────────
  // Business rule in page.tsx: `error && error !== "unauthenticated"` —
  // the "unauthenticated" error is deliberately swallowed (no banner),
  // any other error message shows the retry banner.
  //
  // ⚠️ KNOWN FAILING: "shows retry banner for a generic error" still fails
  // as of this revision. The 401 case passes, meaning the hook does surface
  // *some* error state correctly — but the exact string set for a generic
  // 500 is unconfirmed (may not be the raw `message` field from the JSON
  // body). Needs hooks/useMasjidsMe.ts (and possibly lib/apiFetch.ts) to
  // fix precisely instead of guessing.
  test.describe('Error banner', () => {
    test('shows retry banner for a generic error', async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Server error' }) });
      });
      await page.goto('/masjid-management');

      await expect(page.getByText(/server error/i)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    });

    test('does NOT show a banner when error is "unauthenticated"', async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'unauthenticated' }) });
      });
      await page.goto('/masjid-management');

      await expect(page.getByRole('button', { name: 'Retry' })).not.toBeVisible();
    });

    test('retry button triggers a new fetch', async ({ page }) => {
      let callCount = 0;
      await page.route('**/api/masjids/me*', (route) => {
        callCount++;
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Server error' }) });
      });
      await page.goto('/masjid-management');
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();

      const before = callCount;
      await page.getByRole('button', { name: 'Retry' }).click();
      await expect.poll(() => callCount).toBeGreaterThan(before);
    });
  });

  // ── Search & filter ────────────────────────────────────────────
  test.describe('Search', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: MOCK_MOSQUES }),
        });
      });
      await page.goto('/masjid-management');
    });

    test('filters by name', async ({ page }) => {
      await page.getByLabel('Search masjids').fill('Downtown');
      await expect(page.getByText('Downtown Musalla')).toBeVisible();
      await expect(page.getByText('Islamic Center of Testville')).not.toBeVisible();
    });

    test('filters by location', async ({ page }) => {
      await page.getByLabel('Search masjids').fill('Metropolis');
      await expect(page.getByText('Downtown Musalla')).toBeVisible();
      await expect(page.getByText('Islamic Center of Testville')).not.toBeVisible();
    });

    test('filters by subdomain', async ({ page }) => {
      await page.getByLabel('Search masjids').fill('testville-masjid');
      await expect(page.getByText('Islamic Center of Testville')).toBeVisible();
      await expect(page.getByText('Downtown Musalla')).not.toBeVisible();
    });

    test('shows "No masjids found" for a non-matching search', async ({ page }) => {
      await page.getByLabel('Search masjids').fill('zzz-nonexistent');
      await expect(page.getByText('No masjids found')).toBeVisible();
      await expect(page.getByText(/No results matching "zzz-nonexistent"/)).toBeVisible();
    });
  });

  // ── Row actions ────────────────────────────────────────────────
  // Menu trigger ("⋮") is a real <button> with no aria-label, so it's
  // targeted by position (`.last()` — View button renders first, then the
  // "⋮" trigger). The menu items themselves have an EXPLICIT `role="menuitem"`
  // on a <button> element (see ActionMenu.tsx), which overrides the
  // implicit `button` role in the accessibility tree — so `getByRole('button',
  // { name })` never matches them. Using the component's own
  // `data-testid="action-menu-item-{slug}"` instead, which is robust to
  // that role choice either way.
  test.describe('Row actions menu', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: MOCK_MOSQUES }),
        });
      });
      await page.goto('/masjid-management');
    });

    function firstRowMenuButton(page: import('@playwright/test').Page) {
      return page.locator('tr', { hasText: 'Islamic Center of Testville' }).getByRole('button').last();
    }

    test('opens action menu with all expected items', async ({ page }) => {
      await firstRowMenuButton(page).click();

      await expect(page.getByTestId('action-menu-item-quick-view')).toBeVisible();
      await expect(page.getByTestId('action-menu-item-manage-settings')).toBeVisible();
      await expect(page.getByTestId('action-menu-item-view-public-page')).toBeVisible();
      await expect(page.getByTestId('action-menu-item-prayer-times')).toBeVisible();
      await expect(page.getByTestId('action-menu-item-upload-cover-photo')).toBeVisible();
      await expect(page.getByTestId('action-menu-item-edit-facility')).toBeVisible();
      await expect(page.getByTestId('action-menu-item-delete-masjid')).toBeVisible();
    });

    test('clicking outside closes the menu', async ({ page }) => {
      await firstRowMenuButton(page).click();
      await expect(page.getByTestId('action-menu-item-quick-view')).toBeVisible();

      await page.mouse.click(10, 10);
      await expect(page.getByTestId('action-menu-item-quick-view')).not.toBeVisible();
    });

    test('"Quick View" opens the detail modal', async ({ page }) => {
      await firstRowMenuButton(page).click();
      await page.getByTestId('action-menu-item-quick-view').click();

      await expect(page.getByRole('heading', { name: 'Islamic Center of Testville' })).toBeVisible();
      await expect(page.getByTestId('detail-manage-btn')).toBeVisible();
    });

    test('"Manage Settings" navigates to the settings page', async ({ page }) => {
      await firstRowMenuButton(page).click();
      await page.getByTestId('action-menu-item-manage-settings').click();

      await expect(page).toHaveURL(/\/dashboard\/masjids\/mosque-1\/settings/);
    });
  });

  // ── Row hover "View" button ────────────────────────────────────
  test.describe('Row quick view button', () => {
    test('clicking "View" opens the detail modal', async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: MOCK_MOSQUES }),
        });
      });
      await page.goto('/masjid-management');

      const row = page.locator('tr', { hasText: 'Downtown Musalla' });
      // Button is opacity-0 until row hover — Playwright's click auto-hovers first.
      await row.getByRole('button', { name: /view/i }).click();

      await expect(page.getByRole('heading', { name: 'Downtown Musalla' })).toBeVisible();
    });

    test('clicking a row (not a button) also opens the detail modal', async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: MOCK_MOSQUES }),
        });
      });
      await page.goto('/masjid-management');

      // NOTE: clicking the <tr> itself lands at the geometric center of its
      // bounding box, which can fall on the Subdomain badge — that span has
      // its own onClick with e.stopPropagation() (it opens the public page
      // in a new tab instead), swallowing the click before it bubbles to
      // the row's onClick. Clicking the Location text instead guarantees
      // we land on a cell with no competing click handler.
      const row = page.locator('tr', { hasText: 'Downtown Musalla' });
      await row.getByText('Metropolis, NY').click();

      await expect(page.getByRole('heading', { name: 'Downtown Musalla' })).toBeVisible();
    });
  });

  // ── Delete flow ────────────────────────────────────────────────
  test.describe('Delete masjid', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/masjids/me*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: MOCK_MOSQUES }),
        });
      });
      await page.goto('/masjid-management');
    });

    test('confirm deletes the masjid and shows a success toast', async ({ page }) => {
      await page.route('**/api/masjids/mosque-2*', (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        } else {
          route.continue();
        }
      });

      const row = page.locator('tr', { hasText: 'Downtown Musalla' });
      await row.getByRole('button').last().click(); // "⋮" menu trigger
      await page.getByTestId('action-menu-item-delete-masjid').click();

      await expect(page.getByText('Delete Masjid?')).toBeVisible();
      await expect(page.getByTestId('confirm-delete-dialog').getByText('Downtown Musalla')).toBeVisible();

      await page.getByTestId('confirm-delete-confirm-btn').click();

      await expect(page.getByText('Downtown Musalla deleted')).toBeVisible();
    });

    test('cancel closes the dialog without deleting', async ({ page }) => {
      const row = page.locator('tr', { hasText: 'Downtown Musalla' });
      await row.getByRole('button').last().click();
      await page.getByTestId('action-menu-item-delete-masjid').click();

      await expect(page.getByText('Delete Masjid?')).toBeVisible();
      await page.getByTestId('confirm-delete-cancel-btn').click();

      await expect(page.getByText('Delete Masjid?')).not.toBeVisible();
      await expect(row.getByText('Downtown Musalla')).toBeVisible(); // still in the list
    });

    test('shows an error toast when delete fails', async ({ page }) => {
      await page.route('**/api/masjids/mosque-2*', (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Failed to delete masjid' }) });
        } else {
          route.continue();
        }
      });

      const row = page.locator('tr', { hasText: 'Downtown Musalla' });
      await row.getByRole('button').last().click();
      await page.getByTestId('action-menu-item-delete-masjid').click();
      await page.getByTestId('confirm-delete-confirm-btn').click();

      await expect(page.getByText(/failed to delete masjid/i)).toBeVisible();
    });
  });

  // ── Register / Refresh ─────────────────────────────────────────
  test.describe('Toolbar actions', () => {
    test('"Register Masjid" button is present and clickable', async ({ page }) => {
      // RegisterMasjidModal internals aren't available yet — this only
      // confirms the trigger works without erroring. Expand once that
      // component's source is available.
      await page.getByRole('button', { name: 'Register Masjid' }).click();
    });

    test('refresh button triggers a new fetch of the mosque list', async ({ page }) => {
      let callCount = 0;
      await page.route('**/api/masjids/me*', (route) => {
        callCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'ok', data: MOCK_MOSQUES }),
        });
      });
      await page.goto('/masjid-management');
      await expect.poll(() => callCount).toBeGreaterThan(0);

      const before = callCount;
      await page.getByTitle('Refresh list').click();
      await expect.poll(() => callCount).toBeGreaterThan(before);
    });
  });
});