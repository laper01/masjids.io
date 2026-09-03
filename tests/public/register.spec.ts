import { test, expect } from '@playwright/test';

/**
 * Targets the public registration page — runs in the 'public' project
 * (no storageState/session needed, this is a pre-auth page).
 *
 * SELECTOR NOTE: uses #id locators, matching the ids added to page.tsx
 * (firstName, lastName, username, email, phoneNumber, countryCode, gender,
 * password, confirm_password). Earlier attempts using getByPlaceholder()
 * broke because Playwright's placeholder matching is case-insensitive and
 * substring-based by default — searching "John" also matched "johndoe123"
 * (contains "john"), and "Doe" also matched it (contains "doe"). Using
 * getByLabel() was considered too, but "Password*" is itself a substring
 * of "Confirm Password*" (the Field component appends "*" directly to the
 * label text for required fields), so that has the same collision problem.
 * #id sidesteps both issues entirely.
 */
test.describe('Register Community', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  const fillValidForm = async (page: import('@playwright/test').Page, overrides: Record<string, string> = {}) => {
    const values = {
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe123',
      email: 'john.doe@masjids.io',
      phoneNumber: '2125550100',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      ...overrides,
    };
    await page.locator('#firstName').fill(values.firstName);
    await page.locator('#lastName').fill(values.lastName);
    await page.locator('#username').fill(values.username);
    await page.locator('#email').fill(values.email);
    await page.locator('#phoneNumber').fill(values.phoneNumber);
    await page.getByTestId('gender-select').selectOption('MALE');
    await page.locator('#password').fill(values.password);
    await page.locator('#confirm_password').fill(values.confirmPassword);
  };

  // ── Rendering ──────────────────────────────────────────────────
  test.describe('Rendering', () => {
    test('displays all form fields', async ({ page }) => {
      await expect(page.locator('#firstName')).toBeVisible();
      await expect(page.locator('#lastName')).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#phoneNumber')).toBeVisible();
      await expect(page.getByTestId('country-code-select')).toBeVisible();
      await expect(page.getByTestId('gender-select')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#confirm_password')).toBeVisible();
      await expect(page.getByTestId('register-submit-btn')).toBeVisible();
    });

    test('link to login is present', async ({ page }) => {
      // getByRole matching is case-insensitive by default, which made this
      // also match the navbar's "Sign In" (capital I) link. exact: true
      // makes the match case-sensitive too, isolating the form's "Sign in".
      await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login');
    });
  });

  // ── Validation ─────────────────────────────────────────────────
  test.describe('Validation', () => {
    test('shows required errors for every field on empty submit', async ({ page }) => {
      await page.getByTestId('register-submit-btn').click();

      await expect(page.getByText('Required').first()).toBeVisible();
      await expect(page.getByText('Required')).toHaveCount(7);
      await expect(page.getByText('Please select a gender')).toBeVisible();
    });

    test('username: rejects too short and invalid characters', async ({ page }) => {
      await page.locator('#username').fill('ab');
      await page.getByTestId('register-submit-btn').click();
      await expect(page.getByTestId('username-error')).toContainText('Must be 4-20 characters');

      await page.locator('#username').fill('john doe!');
      await page.getByTestId('register-submit-btn').click();
      await expect(page.getByTestId('username-error')).toContainText('Letters and numbers only');
    });

    test('email: rejects invalid format', async ({ page }) => {
      await page.locator('#email').fill('not-an-email');
      await page.getByTestId('register-submit-btn').click();
      await expect(page.getByTestId('email-error')).toContainText('Invalid email address');
    });

    test('password: rejects under 8 characters', async ({ page }) => {
      await page.locator('#password').fill('short');
      await page.getByTestId('register-submit-btn').click();
      await expect(page.getByTestId('password-error')).toContainText('At least 8 characters');
    });

    test('confirm password: rejects mismatch', async ({ page }) => {
      await page.locator('#password').fill('SecurePass123');
      await page.locator('#confirm_password').fill('DifferentPass456');
      await page.getByTestId('register-submit-btn').click();
      await expect(page.getByTestId('confirm_password-error')).toContainText('Passwords must match');
    });

    test('clears a field-specific error as soon as the user edits that field', async ({ page }) => {
      await page.getByTestId('register-submit-btn').click();
      await expect(page.getByText('Required')).toHaveCount(7);

      await page.locator('#firstName').fill('John');

      // firstName's error clears, but the others remain untouched
      await expect(page.getByText('Required')).toHaveCount(6);
      await expect(page.getByTestId('firstName-error')).not.toBeVisible();
    });
  });

  // ── Successful submission ───────────────────────────────────────
  test.describe('Successful submission', () => {
    test('shows the success screen with the submitted email', async ({ page }) => {
      await page.route('**/api/auth/register', (route) => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await fillValidForm(page, { email: 'newuser@masjids.io' });
      await page.getByTestId('register-submit-btn').click();

      await expect(page.getByTestId('register-success-screen')).toBeVisible();
      await expect(page.getByText('newuser@masjids.io')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Go to Login' })).toHaveAttribute('href', '/login');
    });

    test('sends the phone number formatted as +{countryCode}{number}', async ({ page }) => {
      let requestBody: any = null;
      await page.route('**/api/auth/register', (route) => {
        requestBody = route.request().postDataJSON();
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await fillValidForm(page, { phoneNumber: '2125550100' });
      await page.getByTestId('register-submit-btn').click();

      await expect(page.getByTestId('register-success-screen')).toBeVisible();
      expect(requestBody.phoneNumber).toBe('+12125550100'); // default country code is "1" (US)
    });
  });

  // ── Submission errors ────────────────────────────────────────────
  test.describe('Submission errors', () => {
    test('shows the server-provided error message on failure', async ({ page }) => {
      await page.route('**/api/auth/register', (route) => {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: { detail: 'Username already taken' } }),
        });
      });

      await fillValidForm(page);
      await page.getByTestId('register-submit-btn').click();

      await expect(page.getByTestId('register-submit-error')).toContainText('Username already taken');
      await expect(page.getByTestId('register-success-screen')).not.toBeVisible();
    });

    test('falls back to a generic message when the server gives no detail', async ({ page }) => {
      await page.route('**/api/auth/register', (route) => {
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) });
      });

      await fillValidForm(page);
      await page.getByTestId('register-submit-btn').click();

      await expect(page.getByTestId('register-submit-error')).toContainText('Registration failed. Please try again.');
    });

    test('shows the submit button in a loading state while submitting', async ({ page }) => {
      await page.route('**/api/auth/register', async (route) => {
        await new Promise((r) => setTimeout(r, 1500));
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await fillValidForm(page);
      const submitBtn = page.getByTestId('register-submit-btn');
      await submitBtn.click();

      await expect(page.getByText('Registering…')).toBeVisible();
      await expect(submitBtn).toBeDisabled();
    });
  });
});