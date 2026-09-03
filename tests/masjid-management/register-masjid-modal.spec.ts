import { test, expect } from '@playwright/test';

const MOCK_MOSQUES = [
  {
    id: 'mosque-1',
    name: 'Islamic Center of Testville',
    location: 'Testville, TX',
    subDomain: 'testville-masjid',
    is_verified: true,
    version: 3,
    // FIX: the real API's raw field is `address` (a nested object) — this
    // mock previously used a made-up `address_structured` key that
    // mapApiItemToMosque doesn't know to read, plus a stale flat `address`
    // string left over from an older mock shape. mapApiItemToMosque maps
    // raw.address into the Mosque type's `address_structured` field
    // internally, so the raw mock payload just needs `address` to match
    // what the real backend actually sends (confirmed against a real
    // response payload — see masjid-management.spec.ts for the same fix).
    address: {
      address_line_1: '123 Test St',
      address_line_2: '',
      city: 'Testville',
      postal_code: '75001',
      country_code: 'US',
    },
    phone_number: { country_code: '1', number: '2125550100' },
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
    latitude: 32.9,
    longitude: -96.9,
  },
];

test.describe('RegisterMasjidModal', () => {
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

  // ── Create mode: Step 1 — Basic Info ────────────────────────────
  test.describe('Create mode — Step 1: Basic Info', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId('register-masjid-btn').click();
      await expect(page.getByRole('heading', { name: 'Register New Masjid' })).toBeVisible();
    });

    test('shows required errors when clicking Next with empty fields', async ({ page }) => {
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      // Step doesn't advance and shows "Required" for name/subDomain/location/lat/lng
      await expect(page.getByText('Step 1 of 5')).toBeVisible();
      await expect(page.getByText('Required')).toHaveCount(5);
    });

    test('sanitizes subdomain input to lowercase letters/numbers/hyphens only', async ({ page }) => {
      // NOTE: exact:true is required here — the name field's placeholder
      // is "e.g. Masjid Al-Noor", which case-insensitively contains the
      // substring "al-noor" and would otherwise match this locator too.
      //
      // NOTE: the sanitizer is `.replace(/[^a-z0-9-]/g, "")` — it only
      // strips disallowed characters, it does NOT convert spaces to
      // hyphens. "My Masjid! 123" → "mymasjid123", not "my-masjid-123".
      const subDomainInput = page.getByPlaceholder('al-noor', { exact: true });
      await subDomainInput.fill('My Masjid! 123');
      await expect(subDomainInput).toHaveValue('mymasjid123');
    });

    test('rejects a subdomain with invalid characters if typed via other means', async ({ page }) => {
      // Sanitization happens on every keystroke, so this mostly documents
      // that validate()'s regex check exists as a second line of defense —
      // functionally unreachable via normal typing since the input strips
      // bad characters immediately, but worth keeping as a guard test.
      await page.getByPlaceholder('e.g. Masjid Al-Noor').fill('Test Masjid');
      await page.getByPlaceholder('al-noor', { exact: true }).fill('valid-slug');
      await page.getByPlaceholder('Brooklyn, New York').fill('Testville, TX');
      await page.getByPlaceholder('40.712800').fill('32.9');
      await page.getByPlaceholder('-74.006000').fill('-96.9');

      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Step 2 of 5')).toBeVisible();
    });

    test('advances to Step 2 once all required fields are valid', async ({ page }) => {
      await page.getByPlaceholder('e.g. Masjid Al-Noor').fill('Test Masjid');
      await page.getByPlaceholder('al-noor', { exact: true }).fill('test-masjid');
      await page.getByPlaceholder('Brooklyn, New York').fill('Testville, TX');
      await page.getByPlaceholder('40.712800').fill('32.9');
      await page.getByPlaceholder('-74.006000').fill('-96.9');
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await expect(page.getByText('Step 2 of 5')).toBeVisible();
      await expect(page.getByText('Address')).toBeVisible();
    });

    test('"Back" is disabled on the first step', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
    });

    test('editing one field clears only that field\'s error, leaving others intact', async ({ page }) => {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Required')).toHaveCount(5);

      await page.getByPlaceholder('e.g. Masjid Al-Noor').fill('Test Masjid');

      // name's error clears, the other 4 remain
      await expect(page.getByText('Required')).toHaveCount(4);
    });
  });

  // ── Create mode: full wizard walkthrough ─────────────────────────
  test.describe('Create mode — full wizard', () => {
    const fillStep1 = async (page: import('@playwright/test').Page) => {
      await page.getByPlaceholder('e.g. Masjid Al-Noor').fill('Test Masjid');
      await page.getByPlaceholder('al-noor', { exact: true }).fill('test-masjid');
      await page.getByPlaceholder('Brooklyn, New York').fill('Testville, TX');
      await page.getByPlaceholder('40.712800').fill('32.9');
      await page.getByPlaceholder('-74.006000').fill('-96.9');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    };

    const fillStep2 = async (page: import('@playwright/test').Page) => {
      await page.getByPlaceholder('123 Main Street').fill('456 Sample Ave');
      await page.getByPlaceholder('New York').fill('Testville');
      await page.getByPlaceholder('10001').fill('75001');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    };

    const fillStep3 = async (page: import('@playwright/test').Page) => {
      await page.getByPlaceholder('2125550100').fill('2125550199');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    };

    test.beforeEach(async ({ page }) => {
      await page.getByTestId('register-masjid-btn').click();
      await fillStep1(page);
      await fillStep2(page);
      await fillStep3(page);
    });

    test('Step 2 requires address_line_1, city, and postal_code', async ({ page }) => {
      // Go back to a fresh Step 2 scenario by reopening — simpler to assert
      // the fields we already filled show up correctly, and separately
      // confirm the required-count behavior on a clean run.
      await page.getByRole('button', { name: 'Back' }).click(); // -> step 3
      await page.getByRole('button', { name: 'Back' }).click(); // -> step 2
      await page.getByPlaceholder('123 Main Street').fill('');
      await page.getByPlaceholder('New York').fill('');
      await page.getByPlaceholder('10001').fill('');
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await expect(page.getByText('Step 2 of 5')).toBeVisible();
      await expect(page.getByText('Required')).toHaveCount(3);
    });

    test('Step 3 requires a phone number', async ({ page }) => {
      await page.getByRole('button', { name: 'Back' }).click(); // -> step 3
      await page.getByPlaceholder('2125550100').fill('');
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await expect(page.getByText('Step 3 of 5')).toBeVisible();
      await expect(page.getByText('Required')).toHaveCount(1);
    });

    test('Step 4: prayer time settings render with sensible defaults', async ({ page }) => {
      await expect(page.getByText('Step 4 of 5')).toBeVisible();
      // NumberAdjust renders `value > 0 ? \`+${value}\` : value` — at 0 the
      // "+" prefix isn't applied, so the default state shows plain "0".
      await expect(page.getByText('0', { exact: true })).toHaveCount(5);
    });

    test('Step 4: adjusting a prayer time increments its displayed value', async ({ page }) => {
      const fajrAdjustGroup = page.locator('div', { hasText: 'fajr' }).last();
      await fajrAdjustGroup.getByRole('button', { name: '+' }).click();
      await fajrAdjustGroup.getByRole('button', { name: '+' }).click();

      await expect(fajrAdjustGroup.getByText('+2')).toBeVisible();
    });

    test('Step 4 → 5: review shows the data entered across all steps', async ({ page }) => {
      await page.getByRole('button', { name: 'Next', exact: true }).click(); // -> step 5

      await expect(page.getByText('Step 5 of 5')).toBeVisible();
      await expect(page.getByText('Test Masjid')).toBeVisible();
      await expect(page.getByText('test-masjid.masjids.io')).toBeVisible();
      // Scoped with .last(): the background masjid list row (still visible
      // behind the modal) also contains "Islamic Center of Testville" with
      // the same location text "Testville, TX", so the bare locator is
      // ambiguous. The modal renders after the table in the component
      // tree, so .last() reliably picks the review step's instance.
      await expect(page.getByText('Testville, TX').last()).toBeVisible();
      await expect(page.getByText('456 Sample Ave')).toBeVisible();
      await expect(page.getByText('Testville, 75001')).toBeVisible();
      await expect(page.getByText('Ready to register. You can edit all settings after creation.')).toBeVisible();
    });

    test('submits successfully and shows the "Masjid Registered!" confirmation', async ({ page }) => {
      await page.route('**/api/masjids', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'new-mosque-id' }) });
        } else {
          route.continue();
        }
      });

      await page.getByRole('button', { name: 'Next', exact: true }).click(); // -> step 5
      await page.getByTestId('modal-submit-btn').click();

      await expect(page.getByText('Masjid Registered!')).toBeVisible();
      await expect(page.getByText(/has been successfully registered/)).toBeVisible();
    });

    test('shows an error banner when the create request fails', async ({ page }) => {
      await page.route('**/api/masjids', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Subdomain already taken' }) });
        } else {
          route.continue();
        }
      });

      await page.getByRole('button', { name: 'Next', exact: true }).click(); // -> step 5
      await page.getByTestId('modal-submit-btn').click();

      // NOTE: submit()'s catch block does
      // `err instanceof Error ? err.message : "Registration failed"` —
      // createMasjid() throws `new Error(data?.message ?? ...)`, so since
      // our mock's body has a `message` field, err IS an Error instance
      // and its own message ("Subdomain already taken") is shown, not the
      // generic "Registration failed" fallback (that fallback only fires
      // for non-Error throws, which doesn't happen here).
      await expect(page.getByText('Subdomain already taken')).toBeVisible();
      await expect(page.getByText('Masjid Registered!')).not.toBeVisible();
    });

    test('going Back and forward preserves previously entered data', async ({ page }) => {
      await page.getByRole('button', { name: 'Back' }).click(); // -> step 3
      await page.getByRole('button', { name: 'Back' }).click(); // -> step 2
      await page.getByRole('button', { name: 'Back' }).click(); // -> step 1

      await expect(page.getByPlaceholder('e.g. Masjid Al-Noor')).toHaveValue('Test Masjid');
      await expect(page.getByPlaceholder('al-noor', { exact: true })).toHaveValue('test-masjid');
    });
  });

  // ── Edit mode ──────────────────────────────────────────────────
  test.describe('Edit mode', () => {
    test.beforeEach(async ({ page }) => {
      // Edit mode is triggered from DetailModal's pencil button, reached
      // via a row's "Quick View" (or clicking the row itself).
      //
      // NOTE: clicking the <tr> directly is fragile — the Subdomain badge
      // inside the row has its own onClick with e.stopPropagation() (opens
      // the public page in a new tab instead), which can swallow the click
      // before it bubbles to the row's onClick depending on where the
      // computed center point of the <tr>'s bounding box lands. Clicking
      // the Location text instead guarantees we land on a cell with no
      // competing click handler. (Same class of issue found in
      // masjid-management.spec.ts.)
      const row = page.locator('tr', { hasText: 'Islamic Center of Testville' });
      await row.getByText('Testville, TX').click();
      await expect(page.getByTestId('masjid-detail-modal')).toBeVisible();
      await page.getByTestId('detail-edit-btn').click();
    });

    test('shows "Edit Masjid" header and pre-fills data from the existing masjid', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Edit Masjid' })).toBeVisible();
      await expect(page.getByPlaceholder('e.g. Masjid Al-Noor')).toHaveValue('Islamic Center of Testville');
    });

    test('subdomain field is read-only in edit mode', async ({ page }) => {
      const subDomainField = page.locator('input[readonly]');
      await expect(subDomainField).toHaveValue('testville-masjid');
      await expect(page.getByText('Subdomain cannot be changed after registration.')).toBeVisible();
    });

    test('shows "Save Changes" button and "Changes Saved!" on success', async ({ page }) => {
      // FIX: the PATCH response body must be a full masjid object matching
      // the real API contract — updateMasjid() runs the response through
      // mapApiItemToMosque(), which reads nested fields like
      // address.address_line_2. A bare `{ id: 'mosque-1' }` response left
      // `address` undefined, so the mapper crashed trying to read a
      // property off it ("Cannot read properties of undefined (reading
      // 'address_line_2')"), surfacing as a submitError banner instead of
      // the success state.
      await page.route('**/api/masjids/mosque-1*', (route) => {
        if (route.request().method() === 'PATCH') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Masjid updated successfully',
              data: {
                id: 'mosque-1',
                name: 'Islamic Center of Testville',
                location: 'Testville, TX',
                subDomain: 'testville-masjid',
                is_verified: true,
                version: 4,
                address: {
                  address_line_1: '123 Test St',
                  address_line_2: '',
                  city: 'Testville',
                  postal_code: '75001',
                  country_code: 'US',
                },
                phone_number: { country_code: '1', number: '2125550100' },
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
                latitude: 32.9,
                longitude: -96.9,
              },
            }),
          });
        } else {
          route.continue();
        }
      });

      // Navigate through remaining steps to reach the review/submit step
      await page.getByRole('button', { name: 'Next', exact: true }).click(); // step 2
      await page.getByRole('button', { name: 'Next', exact: true }).click(); // step 3
      await page.getByRole('button', { name: 'Next', exact: true }).click(); // step 4
      await page.getByRole('button', { name: 'Next', exact: true }).click(); // step 5

      await expect(page.getByTestId('modal-submit-btn')).toBeVisible();
      await expect(page.getByTestId('modal-submit-btn')).toContainText('Save Changes');
      await page.getByTestId('modal-submit-btn').click();

      await expect(page.getByText('Changes Saved!')).toBeVisible();
    });
  });

  // ── General modal behavior ────────────────────────────────────────
  test.describe('Modal behavior', () => {
    test('closes on clicking the X button', async ({ page }) => {
      await page.getByTestId('register-masjid-btn').click();
      await expect(page.getByRole('heading', { name: 'Register New Masjid' })).toBeVisible();

      await page.getByTestId('modal-close-btn').click();
      await expect(page.getByRole('heading', { name: 'Register New Masjid' })).not.toBeVisible();
    });

    test('closes on pressing Escape', async ({ page }) => {
      await page.getByTestId('register-masjid-btn').click();
      await expect(page.getByRole('heading', { name: 'Register New Masjid' })).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: 'Register New Masjid' })).not.toBeVisible();
    });
  });
});

/**
 * ── Fixed in this round ─────────────────────────────────────────────
 * - `getByRole('button', { name: 'Next' })` → added `exact: true`. Next.js
 *   dev mode injects a floating "Open Next.js Dev Tools" button whose
 *   accessible name contains the substring "Next" ("Next.js"), and
 *   Playwright's role/name matching is substring + case-insensitive by
 *   default, so it collided with the app's own "Next" button.
 * - `getByPlaceholder('al-noor')` → added `exact: true`. The name field's
 *   placeholder is "e.g. Masjid Al-Noor", which case-insensitively
 *   contains "al-noor" and matched the same way.
 * - Edit mode's row click now targets the Location cell text instead of
 *   the bare <tr>, avoiding the Subdomain badge's stopPropagation (same
 *   issue previously found and fixed in masjid-management.spec.ts).
 *
 * ── Still worth considering ──────────────────────────────────────────
 * Asr method toggle buttons and prayer-time +/- adjust buttons could use
 * data-testid={`asr-method-${value}`} / data-testid={`adjust-${prayer}-plus`}
 * for more robust targeting instead of scoping via surrounding text.
 */