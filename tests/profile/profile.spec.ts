import { test, expect } from '@playwright/test';

/**
 * Endpoints CONFIRMED against the real useProfile hook:
 *   GET   /api/profile   (Authorization: Bearer <session.accessToken>)
 *   PATCH /api/profile   (same auth header)
 * Error message priority on update failure: json.error ?? json.message ??
 * `HTTP ${status}`.
 *
 * SELECTOR NOTE: labels are now wired via htmlFor/id (see the page.tsx fix),
 * so every field below uses getByLabel() — no more placeholder/position
 * (.nth()) based targeting needed, including for the three password fields
 * in Security (each has a unique id: security-cur-password, etc.)
 */

const MOCK_PROFILE = {
  success: true,
  data: {
    first_name: 'Yusuf',
    last_name: 'Ibrahim',
    username: 'yusufibrahim',
    email: 'yusuf@example.com',
    gender: 'MALE',
    phone_number: { country_code: '1', number: '2125550100' },
    is_verified: true,
    profile_picture_url: null,
  },
};

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/profile', (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PROFILE) });
    });
    await page.goto('/profile');
  });

  // ── Header ─────────────────────────────────────────────────────
  test.describe('Header', () => {
    test('shows the name, username, and verified badge', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Yusuf Ibrahim' })).toBeVisible();
      await expect(page.getByText('@yusufibrahim')).toBeVisible();
      await expect(page.getByText('Verified')).toBeVisible();
    });

    test('shows initials avatar when there is no profile picture', async ({ page }) => {
      await expect(page.getByText('YI', { exact: true })).toBeVisible();
    });

    test('shows a loading state while the profile is being fetched', async ({ page }) => {
      await page.route('**/api/profile', async (route) => {
        if (route.request().method() !== 'GET') return route.continue();
        await new Promise((r) => setTimeout(r, 1000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PROFILE) });
      });
      await page.goto('/profile');

      await expect(page.getByRole('heading', { name: 'Loading…' })).toBeVisible();
    });

    test('shows an error state, hidden specifically for "unauthenticated"', async ({ page }) => {
      await page.route('**/api/profile', (route) => {
        if (route.request().method() !== 'GET') return route.continue();
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Server error' }) });
      });
      await page.goto('/profile');
      await expect(page.getByText('Failed to load profile')).toBeVisible();
      await expect(page.getByText('Server error')).toBeVisible();

      await page.route('**/api/profile', (route) => {
        if (route.request().method() !== 'GET') return route.continue();
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'unauthenticated' }) });
      });
      await page.goto('/profile');
      await expect(page.getByText('Failed to load profile')).not.toBeVisible();
    });
  });

  // ── Tab navigation ─────────────────────────────────────────────
  test.describe('Tab navigation', () => {
    test('defaults to Personal Information', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
    });

    test('switching tabs shows the corresponding section', async ({ page }) => {
      await page.getByRole('button', { name: 'Contact' }).click();
      await expect(page.getByRole('heading', { name: 'Contact & Location' })).toBeVisible();

      await page.getByRole('button', { name: 'Security' }).click();
      await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();

      await page.getByRole('button', { name: 'Activity' }).click();
      await expect(page.getByRole('heading', { name: 'Your Activity' })).toBeVisible();

      await page.getByRole('button', { name: 'Danger' }).click();
      await expect(page.getByRole('heading', { name: 'Danger Zone' })).toBeVisible();
    });
  });

  // ── Personal section ───────────────────────────────────────────
  test.describe('Personal section', () => {
    test('displays current values in view mode', async ({ page }) => {
      await expect(page.getByText('Yusuf', { exact: true })).toBeVisible();
      await expect(page.getByText('Ibrahim', { exact: true })).toBeVisible();
      await expect(page.getByText('@yusufibrahim')).toBeVisible();
      await expect(page.getByText('MALE')).toBeVisible();
    });

    test('Edit reveals editable fields pre-filled with current values', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit' }).first().click();

      await expect(page.getByLabel('First name')).toHaveValue('Yusuf');
      await expect(page.getByLabel('Last name')).toHaveValue('Ibrahim');
      await expect(page.getByLabel('Username')).toHaveValue('yusufibrahim');
      await expect(page.getByLabel('Gender')).toHaveValue('MALE');
    });

    test('saving sends the full payload including the required email field', async ({ page }) => {
      let requestBody: any = null;
      await page.route('**/api/profile', (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        requestBody = route.request().postDataJSON();
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { ...MOCK_PROFILE.data, first_name: 'Yousef' } }) });
      });

      await page.getByRole('button', { name: 'Edit' }).first().click();
      await page.getByLabel('First name').fill('Yousef');
      await page.getByRole('button', { name: 'Save changes' }).click();

      await expect.poll(() => requestBody?.first_name).toBe('Yousef');
      expect(requestBody.email).toBe('yusuf@example.com'); // required by backend even though unrelated to this form
    });

    test('Cancel discards changes and returns to view mode', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit' }).first().click();
      await page.getByLabel('First name').fill('Temporary Name');
      await page.getByRole('button', { name: 'Cancel' }).click();

      await expect(page.getByLabel('First name')).not.toBeVisible();
      await expect(page.getByText('Yusuf', { exact: true })).toBeVisible();
    });

    test('shows an update error message on failure (json.error takes priority over json.message)', async ({ page }) => {
      await page.route('**/api/profile', (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Username already taken', message: 'Generic failure' }) });
      });

      await page.getByRole('button', { name: 'Edit' }).first().click();
      await page.getByLabel('Username').fill('taken-name');
      await page.getByRole('button', { name: 'Save changes' }).click();

      await expect(page.getByText('Username already taken')).toBeVisible();
    });
  });

  // ── Contact section ────────────────────────────────────────────
  test.describe('Contact section', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Contact' }).click();
    });

    test('displays email and formatted phone number in view mode', async ({ page }) => {
      await expect(page.getByText('yusuf@example.com')).toBeVisible();
      await expect(page.getByText('+1 2125550100')).toBeVisible();
    });

    test('email is shown read-only in edit mode (no editable email field)', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit' }).click();

      await expect(page.getByText('Email (cannot be changed here)')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toHaveCount(0);
    });

    test('saving sends the updated phone number', async ({ page }) => {
      let requestBody: any = null;
      await page.route('**/api/profile', (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        requestBody = route.request().postDataJSON();
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: MOCK_PROFILE.data }) });
      });

      await page.getByRole('button', { name: 'Edit' }).click();
      await page.getByLabel('Phone number').fill('9995550199');
      await page.getByRole('button', { name: 'Save changes' }).click();

      await expect.poll(() => requestBody?.phone_number?.number).toBe('9995550199');
    });
  });

  // ── Security section ───────────────────────────────────────────
  test.describe('Security section', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Security' }).click();
      await page.getByRole('button', { name: 'Edit' }).click();
    });

    test('requires all three fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('All fields are required.')).toBeVisible();
    });

    test('rejects mismatched new/confirm passwords', async ({ page }) => {
      await page.getByLabel('Current password').fill('CurrentPass123');
      await page.getByLabel('New password').fill('NewPass123');
      await page.getByLabel('Confirm new password').fill('Different456');
      await page.getByRole('button', { name: 'Save changes' }).click();

      await expect(page.getByText('New passwords do not match.')).toBeVisible();
    });

    test('rejects a new password under 8 characters', async ({ page }) => {
      await page.getByLabel('Current password').fill('CurrentPass123');
      await page.getByLabel('New password').fill('short');
      await page.getByLabel('Confirm new password').fill('short');
      await page.getByRole('button', { name: 'Save changes' }).click();

      await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();
    });

    test('show/hide toggle reveals the current password field specifically', async ({ page }) => {
      await page.getByLabel('Current password').fill('CurrentPass123');
      await expect(page.getByLabel('Current password')).toHaveAttribute('type', 'password');

      await page.getByTestId('toggle-cur-password-visibility').click();
      await expect(page.getByLabel('Current password')).toHaveAttribute('type', 'text');
      // The other two fields remain untouched
      await expect(page.getByLabel('New password')).toHaveAttribute('type', 'password');
    });

    test('a valid submission returns to view mode', async ({ page }) => {
      await page.getByLabel('Current password').fill('CurrentPass123');
      await page.getByLabel('New password').fill('NewPassword123');
      await page.getByLabel('Confirm new password').fill('NewPassword123');
      await page.getByRole('button', { name: 'Save changes' }).click();

      await expect(page.getByLabel('Current password')).not.toBeVisible();
      await expect(page.getByText('••••••••••••')).toBeVisible();
    });
  });

  // ── Activity section ───────────────────────────────────────────
  test.describe('Activity section', () => {
    test('links to /dashboard/my-masjids', async ({ page }) => {
      await page.getByRole('button', { name: 'Activity' }).click();
      await expect(page.getByRole('link', { name: /view my masjids/i })).toHaveAttribute('href', '/dashboard/my-masjids');
    });
  });

  // ── Danger section ─────────────────────────────────────────────
  test.describe('Danger section', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Danger' }).click();
    });

    test('shows a confirmation step before allowing deletion', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete my account' }).click();
      await expect(page.getByText('Are you sure?')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Yes, delete' })).toBeVisible();
    });

    test('Cancel returns to the initial state', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete my account' }).click();
      await page.getByRole('button', { name: 'Cancel' }).click();

      await expect(page.getByText('Are you sure?')).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete my account' })).toBeVisible();
    });
  });
});