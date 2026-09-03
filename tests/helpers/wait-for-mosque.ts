import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Waits until MosqueContext has finished hydrating an active mosque.
 *
 * Why network-based, not just "wait for text to disappear":
 * Polling for UI text only detects the SYMPTOM (text still on screen)
 * after render has already happened — under CPU contention (many
 * parallel workers) or a slow first Next.js dev compile, render can lag
 * behind the actual data being ready, making a UI-text wait borderline
 * on tight timeouts. Waiting for the underlying GET /masjids/me response
 * is a direct signal from the source of truth, so it's ready the moment
 * the data exists — before or after render finishes.
 *
 * We still keep the UI-text check as a fallback/confirmation, since some
 * routes might not need to make that HTTP call at all (fully cached).
 */
export async function waitForMosqueReady(page: Page, url: string = '/dashboard') {
  const masjidsResponsePromise = page
    .waitForResponse(
      (res) => res.url().includes('/masjids/me') && res.request().method() === 'GET',
      { timeout: 20_000 }
    )
    .catch(() => null); // don't hard-fail if the call never fires (e.g. cached elsewhere)

  await page.goto(url);
  await masjidsResponsePromise;

  // Fallback confirmation — by now the UI should reflect a selected mosque.
  await expect(page.getByText('No mosque selected')).not.toBeVisible({ timeout: 15_000 });
}