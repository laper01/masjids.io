import { test as setup, expect } from '@playwright/test';
import path from 'path';

// ⚠️ MUST match the storageState path used by the 'admin' project in
// playwright.config.ts (`playwright/.auth/admin.json`). A mismatch here
// means the admin project silently reuses a stale/expired session file
// instead of the one this setup just created — which is exactly what
// caused "unauthenticated" errors despite this setup test passing.
const authFile = path.join(__dirname, '../playwright/.auth/admin.json');

/**
 * Logs in once via the real login UI and reuses the resulting session
 * (JWT stored in cookie/localStorage via getToken()) across all tests.
 * Adjust selectors/env vars to match your actual login form.
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'admin@masjids.io';
  const password = process.env.TEST_USER_PASSWORD || 'changeme';

  await page.goto('/login');

  // Using #id locators instead of getByLabel — the login page has an
  // unrelated "Send us an email" link whose aria-label also matches "email",
  // which breaks getByLabel('Email') under Playwright's strict mode.
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for a reliable post-login signal (adjust to your app)
  await expect(page).toHaveURL(/\/dashboard|\/admin/, { timeout: 15_000 });

  // The real mosque picker is the MosqueSwitcher button in the dashboard
  // header (aria-label: "Select a mosque" when none is active yet), which
  // opens MosqueSelectionModal (role="dialog"). The SIDEBAR item
  // "Masjids Management" is a DIFFERENT thing — a plain nav link to
  // /masjid-management — do not click it.
  const switcherButton = page.getByRole('button', { name: /select a mosque|switch mosque/i });
  if (await switcherButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await switcherButton.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // MosqueCard's aria-label is exactly "Select {name}, {location}" —
    // matching from real GET /api/masjids/me seed data for this test account.
    const defaultMosqueName = process.env.TEST_DEFAULT_MOSQUE || 'Islamic Center of America1';
    await modal.getByRole('button', { name: new RegExp(`^Select ${defaultMosqueName},`) }).click();

    // Modal closes ~260ms after selection (setTimeout in handleSelect)
    await expect(modal).not.toBeVisible({ timeout: 5_000 });

    // Switcher button label should now reflect the selected mosque
    await expect(
      page.getByRole('button', { name: new RegExp(`Switch mosque\\. Currently: ${defaultMosqueName}`) })
    ).toBeVisible({ timeout: 5_000 });
  }

  await page.context().storageState({ path: authFile });
});