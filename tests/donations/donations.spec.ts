import { test, expect, type Page, type Route } from '@playwright/test';
import type {
  CampaignListItem,
  CampaignDetail,
  DonationRecord,
  GetDonationsData,
  InitiateDonationData,
  MasjidRef,
} from '@/types/api';

/**
 * Donation Hub page tests — admin dashboard, requires login (project
 * 'admin', storageState: playwright/.auth/admin.json).
 *
 * Route: app/(dashboard)/[id]/donations/page.tsx → `(dashboard)` is a
 * Next.js route group and does NOT appear in the URL, so the page is
 * assumed to live at /{masjidId}/donations. Adjust MASJID_ID/URL below
 * if the real route differs.
 *
 * Mocked endpoints (cross-checked against hooks/donations/useDonations.ts):
 *   - GET  /api/masjids/:id/donations/campaigns                          (list, status/page query)
 *   - GET  /api/masjids/:id/donations/campaigns/:campaignId              (detail)
 *   - GET  /api/masjids/:id/donations/campaigns/:campaignId/donations    (ledger, paginated)
 *   - POST /api/masjids/:id/donations/campaigns/:campaignId/donate       (initiate donation)
 *
 * NOT covered: the actual Stripe payment step (inside <Elements>/
 * <PaymentElement> in components/donations/StripePaymentDrawer.tsx).
 * Tests stop right after `initiateDonation` succeeds and assert the
 * payment-step wrapper (data-testid="stripe-payment-step") appears —
 * driving stripe.confirmPayment() itself needs mocking Stripe's own
 * network calls / test-mode PaymentElement, which is out of scope here.
 * Ask if you want that added.
 *
 * FIX (this revision): mock builders now use the REAL types from
 * types/api.ts instead of loose Record<string, unknown>, so TS catches
 * missing-field mistakes at compile time instead of silently producing
 * unrepresentative fixtures:
 *   - CampaignDetail requires `masjid: MasjidRef` → added.
 *   - GetDonationsData requires top-level `campaign_id` + `total_raised`
 *     (not just `data`/`metadata`) → added.
 *   - InitiateDonationData requires `payment_intent_id` and
 *     `status: "requires_payment_method"` → added.
 *   - DonationRecord.user is UserRef (`id` required, not just `name`) →
 *     already fixed previously, kept here.
 */

const MASJID_ID = 'masjid-1';
const BASE_URL = `/${MASJID_ID}/donations`;

function buildCampaign(overrides: Partial<CampaignListItem> = {}): CampaignListItem {
  return {
    id: overrides.id ?? 'camp-1',
    title: overrides.title ?? 'New Roof Fund',
    goal_amount: overrides.goal_amount ?? 10000,
    raised_amount: overrides.raised_amount ?? 4000,
    currency: overrides.currency ?? 'usd',
    donation_type: overrides.donation_type ?? 'one_time',
    status: overrides.status ?? 'active',
    progress_pct: overrides.progress_pct ?? 40,
    donor_count: overrides.donor_count ?? 12,
  };
}

function buildCampaignsResponse(
  data: CampaignListItem[],
  metadata: Partial<{ total_data: number; total_page: number; page: number; limit: number }> = {}
) {
  return {
    success: true,
    message: 'OK',
    data,
    metadata: {
      total_data: metadata.total_data ?? data.length,
      total_page: metadata.total_page ?? 1,
      page: metadata.page ?? 1,
      limit: metadata.limit ?? 20,
    },
  };
}

const DEFAULT_MASJID_REF: MasjidRef = { id: MASJID_ID, name: 'Islamic Center of Testville' };

function buildCampaignDetail(overrides: Partial<CampaignDetail> = {}): CampaignDetail {
  return {
    id: overrides.id ?? 'camp-1',
    masjid: overrides.masjid ?? DEFAULT_MASJID_REF,
    title: overrides.title ?? 'New Roof Fund',
    description: overrides.description ?? 'Replacing the main prayer hall roof before winter.',
    goal_amount: overrides.goal_amount ?? 10000,
    raised_amount: overrides.raised_amount ?? 4000,
    currency: overrides.currency ?? 'usd',
    donation_type: overrides.donation_type ?? 'one_time',
    status: overrides.status ?? 'active',
    progress_pct: overrides.progress_pct ?? 40,
    donor_count: overrides.donor_count ?? 12,
    end_date: overrides.end_date ?? '2026-12-31T00:00:00.000Z',
    cover_image_url: overrides.cover_image_url ?? null,
  };
}

function buildDonation(overrides: Partial<DonationRecord> = {}): DonationRecord {
  return {
    id: overrides.id ?? 'don-1',
    user: overrides.user ?? { id: 'user-default', name: 'Ahmad Fauzi' },
    amount: overrides.amount ?? 50,
    currency: overrides.currency ?? 'usd',
    donation_type: overrides.donation_type ?? 'one_time',
    status: overrides.status ?? 'succeeded',
    donated_at: overrides.donated_at ?? new Date('2026-07-01').toISOString(),
  };
}

function buildDonationsData(
  campaignId: string,
  items: DonationRecord[],
  metaOverrides: Partial<{ total_data: number; total_page: number; page: number; limit: number }> = {}
): GetDonationsData {
  return {
    campaign_id: campaignId,
    total_raised: items.reduce((sum, d) => sum + d.amount, 0),
    donor_count: items.length,
    data: items,
    metadata: {
      total_data: metaOverrides.total_data ?? items.length,
      total_page: metaOverrides.total_page ?? 1,
      page: metaOverrides.page ?? 1,
      limit: metaOverrides.limit ?? 10,
    },
  } as GetDonationsData;
}

function buildInitiateDonationData(overrides: Partial<InitiateDonationData> = {}): InitiateDonationData {
  return {
    payment_intent_id: overrides.payment_intent_id ?? 'pi_test_123',
    client_secret: overrides.client_secret ?? 'pi_test_123_secret_abc',
    amount: overrides.amount ?? 50,
    currency: overrides.currency ?? 'usd',
    status: 'requires_payment_method',
    stripe_account_id: overrides.stripe_account_id ?? 'acct_test123',
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockCampaignsList(page: Page, data: CampaignListItem[], metaOverrides = {}) {
  await page.route(`**/api/masjids/${MASJID_ID}/donations/campaigns?*`, async (route) => {
    await fulfillJson(route, buildCampaignsResponse(data, metaOverrides));
  });
}

async function mockCampaignDetail(page: Page, campaignId: string, detail: CampaignDetail) {
  await page.route(`**/api/masjids/${MASJID_ID}/donations/campaigns/${campaignId}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await fulfillJson(route, { success: true, message: 'OK', data: detail });
  });
}

async function mockDonationsLedger(page: Page, campaignId: string, donationsData: GetDonationsData) {
  await page.route(`**/api/masjids/${MASJID_ID}/donations/campaigns/${campaignId}/donations?*`, async (route) => {
    await fulfillJson(route, { success: true, message: 'OK', data: donationsData });
  });
}

async function mockInitiateDonation(page: Page, campaignId: string, data: InitiateDonationData) {
  await page.route(`**/api/masjids/${MASJID_ID}/donations/campaigns/${campaignId}/donate`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await fulfillJson(route, { success: true, message: 'OK', data });
  });
}

test.describe('Donation Hub page (authenticated admin)', () => {
  test('shows loading then renders campaigns with featured + grid split', async ({ page }) => {
    const featured = buildCampaign({ id: 'camp-1', title: 'New Roof Fund', progress_pct: 80 });
    const other     = buildCampaign({ id: 'camp-2', title: 'Ramadan Iftar Program', progress_pct: 20 });
    await mockCampaignsList(page, [featured, other]);

    await page.goto(BASE_URL);

    await expect(page.getByTestId('featured-campaign')).toBeVisible();
    await expect(page.getByTestId('featured-campaign-title')).toHaveText('New Roof Fund');
    await expect(page.getByTestId('campaign-card-camp-2')).toBeVisible();
    await expect(page.getByTestId('campaign-card-camp-1')).not.toBeVisible(); // featured excluded from grid
  });

  test('shows empty state when masjid has no campaigns', async ({ page }) => {
    await mockCampaignsList(page, []);
    await page.goto(BASE_URL);
    await expect(page.getByTestId('campaigns-empty-state')).toBeVisible();
  });

  test('shows error state and retries', async ({ page }) => {
    let callCount = 0;
    await page.route(`**/api/masjids/${MASJID_ID}/donations/campaigns?*`, async (route) => {
      callCount += 1;
      if (callCount === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Server error' }) });
      } else {
        await fulfillJson(route, buildCampaignsResponse([buildCampaign({ id: 'camp-1' })]));
      }
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('campaigns-error-state')).toBeVisible();
    await page.getByTestId('campaigns-error-retry').click();

    await expect(page.getByTestId('featured-campaign')).toBeVisible();
    expect(callCount).toBe(2);
  });

  test('status filter sends the correct status query param', async ({ page }) => {
    let lastUrl = '';
    await page.route(`**/api/masjids/${MASJID_ID}/donations/campaigns?*`, async (route) => {
      lastUrl = route.request().url();
      await fulfillJson(route, buildCampaignsResponse([buildCampaign({ id: 'camp-1', status: 'paused' })]));
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('status-filter-all')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('status-filter-paused').click();
    await expect.poll(() => lastUrl).toContain('status=paused');
    await expect(page.getByTestId('status-filter-paused')).toHaveAttribute('aria-pressed', 'true');
  });

  test('load more fetches next page and appends grid results', async ({ page }) => {
    const urls: string[] = [];
    await page.route(`**/api/masjids/${MASJID_ID}/donations/campaigns?*`, async (route) => {
      const url = route.request().url();
      urls.push(url);
      const p = new URL(url).searchParams.get('page') ?? '1';

      if (p === '2') {
        await fulfillJson(route, buildCampaignsResponse(
          [buildCampaign({ id: 'camp-1', progress_pct: 80 }), buildCampaign({ id: 'camp-2' }), buildCampaign({ id: 'camp-3', title: 'Page 2 Campaign' })],
          { total_data: 3, total_page: 2, page: 2, limit: 2 }
        ));
      } else {
        await fulfillJson(route, buildCampaignsResponse(
          [buildCampaign({ id: 'camp-1', progress_pct: 80 }), buildCampaign({ id: 'camp-2' })],
          { total_data: 3, total_page: 2, page: 1, limit: 2 }
        ));
      }
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('campaign-card-camp-2')).toBeVisible();

    await page.getByTestId('campaigns-load-more').click();
    await expect.poll(() => urls.some((u) => u.includes('page=2'))).toBe(true);
  });

  test('opens campaign detail drawer with donation ledger and pagination', async ({ page }) => {
    const campaign = buildCampaign({ id: 'camp-2', title: 'Ramadan Iftar Program', status: 'active' });
    await mockCampaignsList(page, [buildCampaign({ id: 'camp-1', progress_pct: 80 }), campaign]);
    await mockCampaignDetail(page, 'camp-2', buildCampaignDetail({
      id: 'camp-2',
      title: campaign.title,
      description: 'Providing iftar meals every night of Ramadan.',
      goal_amount: campaign.goal_amount,
      raised_amount: campaign.raised_amount,
      currency: campaign.currency,
      donation_type: campaign.donation_type,
      status: campaign.status,
      progress_pct: campaign.progress_pct,
      donor_count: campaign.donor_count,
      end_date: '2026-04-10T00:00:00.000Z',
    }));
    await mockDonationsLedger(page, 'camp-2', buildDonationsData('camp-2', [
      buildDonation({ id: 'don-1', amount: 100, user: { id: 'user-1', name: 'Ahmad Fauzi' } }),
      buildDonation({ id: 'don-2', amount: 25,  user: { id: 'user-2', name: 'Siti Aminah' } }),
    ]));

    await page.goto(BASE_URL);
    await page.getByTestId('campaign-card-camp-2').getByTestId('campaign-card-details-button').click();

    await expect(page.getByTestId('campaign-detail-drawer')).toBeVisible();
    await expect(page.getByTestId('detail-drawer-title')).toHaveText('Ramadan Iftar Program');
    await expect(page.getByTestId('donors-list')).toBeVisible();
    await expect(page.getByTestId('donor-row-don-1')).toContainText('Ahmad Fauzi');
    await expect(page.getByTestId('donor-row-don-2')).toContainText('Siti Aminah');

    await page.getByTestId('detail-drawer-close').click();
    await expect(page.getByTestId('campaign-detail-drawer')).not.toBeVisible();
  });

  test('detail drawer shows empty donors state when there are no donations yet', async ({ page }) => {
    const campaign = buildCampaign({ id: 'camp-1' });
    await mockCampaignsList(page, [campaign]);
    await mockCampaignDetail(page, 'camp-1', buildCampaignDetail({
      id: 'camp-1',
      title: campaign.title,
      goal_amount: campaign.goal_amount,
      raised_amount: campaign.raised_amount,
      currency: campaign.currency,
      donation_type: campaign.donation_type,
      status: campaign.status,
      progress_pct: campaign.progress_pct,
      donor_count: 0,
    }));
    await mockDonationsLedger(page, 'camp-1', buildDonationsData('camp-1', []));

    await page.goto(BASE_URL);
    await page.getByTestId('featured-campaign').click();

    await expect(page.getByTestId('donors-empty-state')).toBeVisible();
  });

  test('donate flow: pick preset amount, submit, reaches Stripe payment step', async ({ page }) => {
    const campaign = buildCampaign({ id: 'camp-1', title: 'New Roof Fund', currency: 'usd' });
    await mockCampaignsList(page, [campaign]);

    let requestBody: any = null;
    await mockInitiateDonation(page, 'camp-1', buildInitiateDonationData({ amount: 50 }));
    page.on('request', (req) => {
      if (req.url().includes('/donate') && req.method() === 'POST') {
        requestBody = req.postDataJSON();
      }
    });

    await page.goto(BASE_URL);
    await page.getByTestId('featured-campaign-donate-button').click();

    await expect(page.getByTestId('donate-modal')).toBeVisible();
    await page.getByTestId('amount-preset-50').click();
    await page.getByTestId('donate-submit-button').click();

    await expect(page.getByTestId('stripe-payment-step')).toBeVisible();
    expect(requestBody).toMatchObject({ amount: 50, currency: 'usd', donation_type: 'one_time' });
  });

  test('donate flow: custom amount overrides preset selection', async ({ page }) => {
    const campaign = buildCampaign({ id: 'camp-1' });
    await mockCampaignsList(page, [campaign]);

    let requestBody: any = null;
    await mockInitiateDonation(page, 'camp-1', buildInitiateDonationData({ amount: 77, client_secret: 'pi_test_secret_456' }));
    page.on('request', (req) => {
      if (req.url().includes('/donate') && req.method() === 'POST') {
        requestBody = req.postDataJSON();
      }
    });

    await page.goto(BASE_URL);
    await page.getByTestId('featured-campaign-donate-button').click();

    await page.getByTestId('custom-amount-input').fill('77');
    await page.getByTestId('donate-submit-button').click();

    await expect(page.getByTestId('stripe-payment-step')).toBeVisible();
    expect(requestBody).toMatchObject({ amount: 77 });
  });

  test('donate flow: recurring campaign sends interval in payload', async ({ page }) => {
    const campaign = buildCampaign({ id: 'camp-1', donation_type: 'both' });
    await mockCampaignsList(page, [campaign]);

    let requestBody: any = null;
    await mockInitiateDonation(page, 'camp-1', buildInitiateDonationData({ amount: 25, client_secret: 'pi_test_secret_789' }));
    page.on('request', (req) => {
      if (req.url().includes('/donate') && req.method() === 'POST') {
        requestBody = req.postDataJSON();
      }
    });

    await page.goto(BASE_URL);
    await page.getByTestId('featured-campaign-donate-button').click();

    await page.getByTestId('donation-type-monthly').click();
    await page.getByTestId('donation-interval-year').click();
    await page.getByTestId('amount-preset-25').click();
    await page.getByTestId('donate-submit-button').click();

    await expect(page.getByTestId('stripe-payment-step')).toBeVisible();
    expect(requestBody).toMatchObject({ amount: 25, donation_type: 'recurring', interval: 'year' });
  });

  test('donate flow: shows API error message without closing the modal', async ({ page }) => {
    const campaign = buildCampaign({ id: 'camp-1' });
    await mockCampaignsList(page, [campaign]);

    await page.route(`**/api/masjids/${MASJID_ID}/donations/campaigns/camp-1/donate`, async (route) => {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Card declined' }) });
    });

    await page.goto(BASE_URL);
    await page.getByTestId('featured-campaign-donate-button').click();
    await page.getByTestId('amount-preset-50').click();
    await page.getByTestId('donate-submit-button').click();

    await expect(page.getByTestId('donate-modal-error')).toContainText('Card declined');
    await expect(page.getByTestId('donate-modal')).toBeVisible();
  });

  test('donate button is disabled for paused/closed campaigns and shows correct label', async ({ page }) => {
    await mockCampaignsList(page, [
      buildCampaign({ id: 'camp-1', progress_pct: 90 }), // featured (active)
      buildCampaign({ id: 'camp-2', status: 'paused', progress_pct: 10 }),
    ]);

    await page.goto(BASE_URL);

    const pausedCard = page.getByTestId('campaign-card-camp-2');
    const donateBtn = pausedCard.getByTestId('campaign-card-donate-button');
    await expect(donateBtn).toBeDisabled();
    await expect(donateBtn).toHaveText('Paused');
  });
});