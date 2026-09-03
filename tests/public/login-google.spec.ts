import { test, expect } from '@playwright/test';

/**
 * These tests target the LOGIN PAGE itself — must run in the 'public'
 * project (no storageState/session preloaded).
 *
 * SCOPE NOTE: we don't drive a real Google account through Google's actual
 * consent screen — that's a third-party flow outside our app. We DO test
 * our own app's behavior around it: trigger, loading state, and error
 * handling before/around that hand-off.
 */
test.describe('Login — Google sign-in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the Google sign-in button with correct label', async ({ page }) => {
    const googleBtn = page.getByRole('button', { name: 'Continue with Google' });
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();
  });

  test('shows a loading state and disables both auth buttons while redirecting', async ({ page }) => {
    // ROOT CAUSE (found via error-context.md's accessibility snapshot):
    // the button's accessible NAME swaps from "Continue with Google" to
    // "Redirecting…" once isGoogleLoading is true — same <button> element,
    // different label text. A locator bound to the original name no longer
    // matches anything once that swap happens, which is why every earlier
    // attempt (network mocking, tight timeouts, etc.) kept reporting
    // "element(s) not found" — the button was there and disabled the whole
    // time; our locator just stopped matching it. Match either name.
    const googleBtn = page.getByRole('button', { name: /Continue with Google|Redirecting/ });
    await googleBtn.click();

    await expect(page.getByText('Redirecting…')).toBeVisible();
    await expect(googleBtn).toBeDisabled();
    await expect(page.getByRole('button', { name: /sign in/i, exact: false })).toBeDisabled();
  });

  test('CSRF fetch failure results in a redirect back to the login page', async ({ page }) => {
    // Originally assumed this would reject signIn()'s promise and trigger
    // our own try/catch (setError("Failed to sign in with Google...")).
    // In practice, NextAuth handles this failure INTERNALLY via a redirect
    // back to the sign-in page with callbackUrl — it does not propagate a
    // rejection to the caller. That means the app's catch block/custom
    // error message is likely unreachable for this failure mode (it may
    // still fire for other cases, e.g. a synchronous config error before
    // any fetch happens). Testing the actual observed behavior instead.
    await page.route('**/api/auth/csrf**', (route) => route.abort());

    await page.getByRole('button', { name: 'Continue with Google' }).click();

    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });

  test('does not show a stale error banner on initial page load', async ({ page }) => {
    await expect(page.getByText(/failed to sign in/i)).not.toBeVisible();
  });

  test('clicking Google sign-in while email form is submitting does not double-fire', async ({ page }) => {
    await page.route('**/api/auth/callback/credentials**', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    await page.locator('#email').fill('test@masjids.io');
    await page.locator('#password').fill('whatever');
    await page.getByRole('button', { name: /sign in/i, exact: false }).click();

    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
  });
});