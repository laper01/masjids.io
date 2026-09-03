import { test, expect } from '@playwright/test';
import { waitForMosqueReady } from '../helpers/wait-for-mosque';

/**
 * URL: /announcement (singular) — confirmed against components/Sidebar.tsx
 * NAV_ITEMS entry: { label: "Announcement", href: "/announcement", ... }
 * (Previous version of this file used the plural `/announcements`, which
 * does not match the sidebar route.)
 *
 * API endpoint paths (/api/masjids/{id}/announcements, GET list/POST create,
 * PUT/{id} update, DELETE/{id} delete) are unaffected by this — those are
 * confirmed against the useAnnouncements hook and unrelated to the page URL.
 */

const MOCK_ANNOUNCEMENTS = {
  success: true,
  data: [
    {
      id: 'ann-1',
      category: 'urgent',
      title: 'Emergency Closure Notice',
      body: 'The masjid will be closed tomorrow due to maintenance.',
      published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'ann-2',
      category: 'jumuah',
      title: "Jumu'ah Reminder",
      body: 'Khutbah starts at 1:15 PM sharp this Friday.',
      published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ],
  metadata: { total_data: 2, total_page: 1, page: 1, limit: 10 },
};

test.describe('Announcements', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/masjids/*/announcements*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANNOUNCEMENTS) });
      } else {
        route.continue();
      }
    });
    await waitForMosqueReady(page, '/announcement');
  });

  // ── Page load ──────────────────────────────────────────────────
  test.describe('Page load', () => {
    test('displays announcements from the API', async ({ page }) => {
      await expect(page.getByTestId('announcement-card-ann-1')).toContainText('Emergency Closure Notice');
      await expect(page.getByTestId('announcement-card-ann-2')).toContainText("Jumu'ah Reminder");
    });

    test('shows loading skeletons before data arrives', async ({ page }) => {
      await page.route('**/api/masjids/*/announcements*', async (route) => {
        await new Promise((r) => setTimeout(r, 1000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ANNOUNCEMENTS) });
      });
      await page.goto('/announcement');
      await expect(page.getByTestId('skeleton-card').first()).toBeVisible();
    });

    test('shows empty state when there are no announcements', async ({ page }) => {
      await page.route('**/api/masjids/*/announcements*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [], metadata: { total_data: 0, total_page: 1, page: 1, limit: 10 } }),
        });
      });
      await page.goto('/announcement');

      await expect(page.getByTestId('announcements-empty-state')).toBeVisible();
    });

    test('shows an error banner with retry on fetch failure', async ({ page }) => {
      await page.route('**/api/masjids/*/announcements*', (route) => {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Server error' }) });
      });
      await page.goto('/announcement');

      await expect(page.getByTestId('announcements-error-banner')).toContainText('Server error');
      await expect(page.getByTestId('announcements-error-retry-btn')).toBeVisible();
    });
  });

  // ── Filtering ──────────────────────────────────────────────────
  test.describe('Filter bar', () => {
    test('filters announcements by category', async ({ page }) => {
      await page.getByTestId('filter-btn-jumuah').click();

      await expect(page.getByTestId('announcement-card-ann-2')).toBeVisible();
      await expect(page.getByTestId('announcement-card-ann-1')).not.toBeVisible();
    });

    test('"All" filter shows every announcement again', async ({ page }) => {
      await page.getByTestId('filter-btn-urgent').click();
      await expect(page.getByTestId('announcement-card-ann-1')).toBeVisible();
      await expect(page.getByTestId('announcement-card-ann-2')).not.toBeVisible();

      await page.getByTestId('filter-btn-all').click();
      await expect(page.getByTestId('announcement-card-ann-1')).toBeVisible();
      await expect(page.getByTestId('announcement-card-ann-2')).toBeVisible();
    });

    test('active filter button has aria-pressed=true', async ({ page }) => {
      await page.getByTestId('filter-btn-urgent').click();
      await expect(page.getByTestId('filter-btn-urgent')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('filter-btn-all')).toHaveAttribute('aria-pressed', 'false');
    });

    test('shows empty state when filter matches nothing', async ({ page }) => {
      await page.getByTestId('filter-btn-fundraising').click();
      await expect(page.getByTestId('announcements-empty-state')).toBeVisible();
    });
  });

  // ── Create (Composer) ────────────────────────────────────────────
  test.describe('Create announcement', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId('new-announcement-btn').click();
      await expect(page.getByTestId('composer-panel')).toBeVisible();
    });

    test('Publish button is disabled without a title', async ({ page }) => {
      await expect(page.getByTestId('composer-publish-btn')).toBeDisabled();
      await expect(page.getByTestId('composer-title-error')).toBeVisible();
    });

    test('character counter updates as the title is typed', async ({ page }) => {
      const value = 'Test Announcement';
      await page.getByTestId('composer-title-input').fill(value);
      await expect(page.getByText(`${value.length} / 120 chars`)).toBeVisible();
    });

    test('selecting a category highlights it', async ({ page }) => {
      const urgentBtn = page.getByTestId('composer-category-urgent');
      await urgentBtn.click();
      await expect(urgentBtn).toHaveAttribute('aria-pressed', 'true');
    });

    test('publishing sends the correct payload and closes the panel', async ({ page }) => {
      let requestBody: any = null;
      await page.route('**/api/masjids/*/announcements*', (route) => {
        if (route.request().method() === 'POST') {
          requestBody = route.request().postDataJSON();
          route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        } else {
          route.continue();
        }
      });

      await page.getByTestId('composer-title-input').fill('New Broadcast');
      await page.getByTestId('composer-body-input').fill('Details here.');
      await page.getByTestId('composer-publish-btn').click();

      await expect(page.getByTestId('composer-panel')).not.toBeVisible();
      expect(requestBody).toMatchObject({ title: 'New Broadcast', body: 'Details here.', category: 'general' });
    });

    test('Cancel closes the composer without publishing', async ({ page }) => {
      await page.getByTestId('composer-title-input').fill('Should not be sent');
      await page.getByTestId('composer-cancel-btn').click();

      await expect(page.getByTestId('composer-panel')).not.toBeVisible();
      await expect(page.getByText('Should not be sent')).not.toBeVisible();
    });
  });

  // ── Edit ───────────────────────────────────────────────────────
  test.describe('Edit announcement', () => {
    test('opens the editor pre-filled with the announcement\'s data', async ({ page }) => {
      await page.getByTestId('card-edit-btn-ann-1').click();

      await expect(page.getByTestId('editor-panel')).toBeVisible();
      await expect(page.getByTestId('editor-title-input')).toHaveValue('Emergency Closure Notice');
      await expect(page.getByTestId('editor-body-input')).toHaveValue(
        'The masjid will be closed tomorrow due to maintenance.'
      );
    });

    test('saving sends the update and closes the editor', async ({ page }) => {
      let requestMethod: string | null = null;
      await page.route('**/api/masjids/*/announcements/ann-1*', (route) => {
        requestMethod = route.request().method();
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await page.getByTestId('card-edit-btn-ann-1').click();
      await page.getByTestId('editor-title-input').fill('Updated Closure Notice');
      await page.getByTestId('editor-save-btn').click();

      await expect(page.getByTestId('editor-panel')).not.toBeVisible();
      expect(requestMethod).not.toBeNull();
    });

    test('Save is disabled if the title is cleared', async ({ page }) => {
      await page.getByTestId('card-edit-btn-ann-1').click();
      await page.getByTestId('editor-title-input').fill('');
      await expect(page.getByTestId('editor-save-btn')).toBeDisabled();
      await expect(page.getByTestId('editor-title-error')).toBeVisible();
    });
  });

  // ── Delete ───────────────────────────────────────────────────────
  test.describe('Delete announcement', () => {
    test('confirmation dialog shows the announcement title', async ({ page }) => {
      await page.getByTestId('card-delete-btn-ann-1').click();

      await expect(page.getByTestId('delete-modal')).toContainText('Delete Announcement?');
      await expect(page.getByTestId('delete-modal')).toContainText('Emergency Closure Notice');
    });

    test('Cancel closes the dialog without deleting', async ({ page }) => {
      await page.getByTestId('card-delete-btn-ann-1').click();
      await page.getByTestId('delete-modal-cancel-btn').click();

      await expect(page.getByTestId('delete-modal')).not.toBeVisible();
      await expect(page.getByTestId('announcement-card-ann-1')).toBeVisible();
    });

    test('confirming calls the delete API and removes the card', async ({ page }) => {
      let deleteCalled = false;
      await page.route('**/api/masjids/*/announcements/ann-1*', (route) => {
        if (route.request().method() === 'DELETE') {
          deleteCalled = true;
          route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        } else {
          route.continue();
        }
      });

      await page.getByTestId('card-delete-btn-ann-1').click();
      await page.getByTestId('delete-modal-confirm-btn').click();

      // DeleteModal has a ~1.4s artificial delay before calling onConfirm
      await expect(page.getByTestId('delete-modal-confirm-btn')).toContainText('Deleting...');
      await expect(page.getByTestId('delete-modal')).not.toBeVisible({ timeout: 5000 });
      expect(deleteCalled).toBe(true);
    });
  });

  // ── Pagination ───────────────────────────────────────────────────
  test.describe('Pagination', () => {
    test('shows correct result count summary', async ({ page }) => {
      await expect(page.getByTestId('pagination')).toContainText('Showing 1–2 of 2 results');
    });

    test('prev button is disabled on the first page', async ({ page }) => {
      await expect(page.getByTestId('pagination-prev-btn')).toBeDisabled();
    });

    test('next button is disabled when there is only one page', async ({ page }) => {
      await expect(page.getByTestId('pagination-next-btn')).toBeDisabled();
    });

    test('navigating to page 2 marks it active and reflects aria-current', async ({ page }) => {
      await page.route('**/api/masjids/*/announcements*', (route) => {
        const url = new URL(route.request().url());
        const requestedPage = url.searchParams.get('page') ?? '1';
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MOCK_ANNOUNCEMENTS.data,
            metadata: { total_data: 25, total_page: 3, page: Number(requestedPage), limit: 10 },
          }),
        });
      });
      await page.goto('/announcement');

      await page.getByTestId('pagination-page-btn-2').click();
      await expect(page.getByTestId('pagination-page-btn-2')).toHaveAttribute('aria-current', 'page');
    });
  });

  // ── New Announcement button ───────────────────────────────────────
  test.describe('Toolbar', () => {
    test('"New Announcement" button opens the composer', async ({ page }) => {
      await page.getByTestId('new-announcement-btn').click();
      await expect(page.getByTestId('composer-panel')).toBeVisible();
    });
  });
});