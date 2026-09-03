import { test, expect } from '@playwright/test';

test.describe('Masjid Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display masjid selector and switch active masjid', async ({ page }) => {
    await expect(page.getByTestId('mosque-selector')).toBeVisible();

    await page.getByTestId('mosque-selector').click();
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();

    await options.first().click();
    await expect(page.getByTestId('mosque-selector')).toContainText(await options.first().innerText());
  });

  test('should create a new event end to end (UI + backend persisted)', async ({ page, request }) => {
    const eventName = `Test Event ${Date.now()}`;

    await page.goto('/dashboard/events');
    await page.getByRole('button', { name: /add event|new event/i }).click();

    await page.getByLabel(/event name/i).fill(eventName);
    await page.getByLabel(/date/i).fill('2026-12-01');
    await page.getByRole('button', { name: /save|create/i }).click();

    await expect(page.getByText(eventName)).toBeVisible();

    // Cross-check directly against the backend (BFF proxy route) that it was persisted
    const response = await request.get('/api/events?search=' + encodeURIComponent(eventName));
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const found = body.data?.some((e: { event_name: string }) => e.event_name === eventName);
    expect(found).toBeTruthy();
  });
});
