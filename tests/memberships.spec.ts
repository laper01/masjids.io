import { test, expect, type Page, type Route } from '@playwright/test';
import type {
  Tier,
  MyMasjidMembership,
  SubscribeToTierData,
  CancelMyMembershipData,
} from '@/types/memberships';

/**
 * Memberships page tests — authenticated scenario. Placed at the tests/
 * root (NOT tests/voting/ or tests/public/) so it's picked up by the
 * 'admin' catch-all Playwright project (storageState:
 * playwright/.auth/admin.json), per explicit confirmation: this project
 * has no dedicated "logged-in member" role, so the admin session is used
 * to represent "any authenticated user" for this page.
 *
 * Route: app/(public)/public-masjids/[id]/memberships/page.tsx →
 * `(public)` is a Next.js route group and does not appear in the URL, so
 * the page is assumed to live at /public-masjids/{masjidId}/memberships.
 * Adjust MASJID_ID/URL below if the real route differs.
 *
 * Mocked endpoints (cross-checked against hooks/memberships/useMemberships.ts):
 *   - GET    /api/masjids/:id/tiers               (getTiers)
 *   - GET    /api/masjids/:id/memberships/me       (getMyMasjidMembership)
 *   - POST   /api/masjids/:id/memberships          (subscribeToTier)
 *   - DELETE /api/me/memberships/:id               (cancelMyMembership — NOTE:
 *     this hits /api/me/memberships/:masjidId, not a nested masjid path)
 */

const MASJID_ID = 'masjid-1';
const BASE_URL = `/public-masjids/${MASJID_ID}/memberships`;

function buildTier(overrides: Partial<Tier> = {}): Tier {
  return {
    id: overrides.id ?? 'tier-1',
    masjid_id: overrides.masjid_id ?? MASJID_ID,
    name: overrides.name ?? 'Silver',
    description: overrides.description ?? 'Basic community support tier.',
    price: overrides.price ?? 10,
    currency: overrides.currency ?? 'USD',
    interval: overrides.interval ?? 'monthly',
    visibility: overrides.visibility ?? 'public',
    can_vote: overrides.can_vote ?? false,
    max_members: overrides.max_members ?? null,
    current_member_count: overrides.current_member_count ?? 5,
    benefits: overrides.benefits ?? ['Monthly newsletter', 'Community events access'],
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

function buildTiersResponse(tiers: Tier[]) {
  return { success: true, message: 'OK', data: tiers };
}

function buildMyMasjidMembership(overrides: Partial<MyMasjidMembership> = {}): MyMasjidMembership {
  return {
    membership_id: overrides.membership_id ?? 'mem-1',
    masjid_id: overrides.masjid_id ?? MASJID_ID,
    tier: overrides.tier ?? { id: 'tier-1', name: 'Silver', price: 10, currency: 'USD', interval: 'monthly' },
    status: overrides.status ?? 'active',
    can_vote: overrides.can_vote ?? false,
    started_at: overrides.started_at ?? '2026-01-01T00:00:00.000Z',
    renewed_at: overrides.renewed_at ?? null,
    next_billing_at: overrides.next_billing_at ?? '2026-08-01T00:00:00.000Z',
    expires_at: overrides.expires_at ?? null,
  };
}

function buildSubscribeData(overrides: Partial<SubscribeToTierData> = {}): SubscribeToTierData {
  return {
    membership_id: overrides.membership_id ?? 'mem-new-1',
    masjid_id: overrides.masjid_id ?? MASJID_ID,
    tier: overrides.tier ?? { id: 'tier-1', name: 'Silver', price: 10, currency: 'USD', interval: 'monthly' },
    status: overrides.status ?? 'active',
    can_vote: overrides.can_vote ?? false,
    started_at: overrides.started_at ?? new Date().toISOString(),
    next_billing_at: overrides.next_billing_at ?? '2026-09-01T00:00:00.000Z',
    payment_url: overrides.payment_url === undefined ? null : overrides.payment_url,
  };
}

function buildCancelData(overrides: Partial<CancelMyMembershipData> = {}): CancelMyMembershipData {
  return {
    membership_id: overrides.membership_id ?? 'mem-1',
    masjid_id: overrides.masjid_id ?? MASJID_ID,
    status: 'cancelled',
    cancelled_at: overrides.cancelled_at ?? new Date().toISOString(),
    reason: overrides.reason ?? null,
    message: overrides.message ?? 'Membership cancelled.',
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockTiers(page: Page, tiers: Tier[]) {
  await page.route(`**/api/masjids/${MASJID_ID}/tiers`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await fulfillJson(route, buildTiersResponse(tiers));
  });
}

/** Mocks GET /memberships/me as a mutable state so cancel/subscribe flows can update it. */
function makeMembershipMeMock(page: Page, initial: MyMasjidMembership | null) {
  let current = initial;
  const setCurrent = (m: MyMasjidMembership | null) => { current = m; };

  const install = async () => {
    await page.route(`**/api/masjids/${MASJID_ID}/memberships/me`, async (route) => {
      if (current === null) {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'No active membership found for this masjid.' }) });
      } else {
        await fulfillJson(route, { success: true, message: 'OK', data: current });
      }
    });
  };

  return { install, setCurrent, get: () => current };
}

async function mockSubscribe(page: Page, data: SubscribeToTierData) {
  await page.route(`**/api/masjids/${MASJID_ID}/memberships`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await fulfillJson(route, { success: true, message: 'OK', data });
  });
}

async function mockCancel(page: Page, data: CancelMyMembershipData) {
  await page.route(`**/api/me/memberships/${MASJID_ID}`, async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    await fulfillJson(route, data);
  });
}

test.describe('Memberships page (authenticated)', () => {
  test('shows tiers and lets a non-member subscribe (no redirect, e.g. cash payment)', async ({ page }) => {
    const membershipMock = makeMembershipMeMock(page, null); // no membership yet
    await membershipMock.install();
    await mockTiers(page, [
      buildTier({ id: 'tier-1', name: 'Silver', price: 10 }),
      buildTier({ id: 'tier-2', name: 'Gold', price: 25 }),
    ]);
    await mockSubscribe(page, buildSubscribeData({ payment_url: null, tier: { id: 'tier-1', name: 'Silver', price: 10, currency: 'USD', interval: 'monthly' } }));

    await page.goto(BASE_URL);

    await expect(page.getByTestId('tier-card-tier-1')).toBeVisible();
    await expect(page.getByTestId('current-membership-section')).not.toBeVisible();

    await page.getByTestId('tier-card-tier-1').getByTestId('tier-subscribe-button').click();
    await expect(page.getByTestId('subscribe-modal')).toBeVisible();
    await expect(page.getByTestId('subscribe-modal-title')).toHaveText('Confirm Subscription');

    await page.getByLabel('Payment Method').selectOption('cash');
    // Reflect the post-subscribe state for the follow-up getMyMasjidMembership() refetch
    membershipMock.setCurrent(buildMyMasjidMembership({ tier: { id: 'tier-1', name: 'Silver', price: 10, currency: 'USD', interval: 'monthly' } }));

    await page.getByTestId('subscribe-confirm-button').click();

    await expect(page.getByTestId('success-toast')).toContainText('Successfully subscribed to Silver!');
    await expect(page.getByTestId('current-membership-section')).toBeVisible();
    await expect(page.getByTestId('tier-card-tier-1')).toHaveAttribute('data-tier-current', 'true');
  });

  test('subscribe with a payment_url redirects the browser to checkout', async ({ page }) => {
    await makeMembershipMeMock(page, null).install();
    await mockTiers(page, [buildTier({ id: 'tier-1', name: 'Silver', price: 10 })]);

    // Intercept the "checkout" destination so navigation succeeds without a real Stripe call.
    await page.route('**/mock-checkout', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Mock Checkout</body></html>' });
    });
    await mockSubscribe(page, buildSubscribeData({ payment_url: `${new URL(BASE_URL, 'http://localhost').origin}/mock-checkout` }));

    await page.goto(BASE_URL);
    await page.getByTestId('tier-card-tier-1').getByTestId('tier-subscribe-button').click();
    await page.getByTestId('subscribe-confirm-button').click();

    await expect(page).toHaveURL(/\/mock-checkout$/);
  });

  test('existing member sees current membership card with correct details', async ({ page }) => {
    await makeMembershipMeMock(page, buildMyMasjidMembership({
      tier: { id: 'tier-2', name: 'Gold', price: 25, currency: 'USD', interval: 'monthly' },
      can_vote: true,
      next_billing_at: '2026-09-01T00:00:00.000Z',
    })).install();
    await mockTiers(page, [
      buildTier({ id: 'tier-1', name: 'Silver', price: 10 }),
      buildTier({ id: 'tier-2', name: 'Gold', price: 25, can_vote: true }),
    ]);

    await page.goto(BASE_URL);

    await expect(page.getByTestId('current-membership-card')).toBeVisible();
    await expect(page.getByTestId('current-membership-tier-name')).toHaveText('Gold');
    await expect(page.getByTestId('current-membership-status-badge')).toContainText('Active Member');
    await expect(page.getByTestId('current-membership-voting-rights-badge')).toBeVisible();
    await expect(page.getByTestId('tier-card-tier-2')).toHaveAttribute('data-tier-current', 'true');
    await expect(page.getByTestId('tier-card-tier-2').getByTestId('tier-current-plan-indicator')).toBeVisible();
    // Current tier shows no subscribe button
    await expect(page.getByTestId('tier-card-tier-2').getByTestId('tier-subscribe-button')).toHaveCount(0);
  });

  test('existing member can switch to a different tier', async ({ page }) => {
    const membershipMock = makeMembershipMeMock(page, buildMyMasjidMembership({
      tier: { id: 'tier-1', name: 'Silver', price: 10, currency: 'USD', interval: 'monthly' },
    }));
    await membershipMock.install();
    await mockTiers(page, [
      buildTier({ id: 'tier-1', name: 'Silver', price: 10 }),
      buildTier({ id: 'tier-2', name: 'Gold', price: 25 }),
    ]);
    await mockSubscribe(page, buildSubscribeData({
      payment_url: null,
      tier: { id: 'tier-2', name: 'Gold', price: 25, currency: 'USD', interval: 'monthly' },
    }));

    await page.goto(BASE_URL);
    await expect(page.getByTestId('current-membership-tier-name')).toHaveText('Silver');

    await page.getByTestId('tier-card-tier-2').getByTestId('tier-subscribe-button').click();
    await expect(page.getByTestId('subscribe-modal-title')).toHaveText('Switch Membership Plan');
    await expect(page.getByTestId('subscribe-confirm-button')).toHaveText('Switch Plan');

    membershipMock.setCurrent(buildMyMasjidMembership({
      tier: { id: 'tier-2', name: 'Gold', price: 25, currency: 'USD', interval: 'monthly' },
    }));
    await page.getByTestId('subscribe-confirm-button').click();

    await expect(page.getByTestId('success-toast')).toContainText('Successfully subscribed to Gold!');
    await expect(page.getByTestId('current-membership-tier-name')).toHaveText('Gold');
  });

  test('cancel membership flow removes current membership card', async ({ page }) => {
    const membershipMock = makeMembershipMeMock(page, buildMyMasjidMembership());
    await membershipMock.install();
    await mockTiers(page, [buildTier({ id: 'tier-1', name: 'Silver', price: 10 })]);
    await mockCancel(page, buildCancelData({ reason: 'Moving to another city' }));

    let deleteRequestBody: any = null;
    page.on('request', (req) => {
      if (req.url().includes(`/api/me/memberships/${MASJID_ID}`) && req.method() === 'DELETE') {
        deleteRequestBody = req.postDataJSON();
      }
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('current-membership-card')).toBeVisible();

    await page.getByTestId('current-membership-cancel-button').click();
    await expect(page.getByTestId('cancel-modal')).toBeVisible();

    await page.getByTestId('cancel-reason-textarea').fill('Moving to another city');

    // Reflect the post-cancel state for the follow-up getMyMasjidMembership() refetch
    membershipMock.setCurrent(null);
    await page.getByTestId('cancel-confirm-button').click();

    await expect(page.getByTestId('success-toast')).toContainText('Your membership has been cancelled.');
    await expect(page.getByTestId('current-membership-section')).not.toBeVisible();
    expect(deleteRequestBody).toMatchObject({ reason: 'Moving to another city' });
  });

  test('cancel modal can be dismissed via "Keep Membership" without cancelling', async ({ page }) => {
    await makeMembershipMeMock(page, buildMyMasjidMembership()).install();
    await mockTiers(page, [buildTier({ id: 'tier-1', name: 'Silver', price: 10 })]);

    await page.goto(BASE_URL);
    await page.getByTestId('current-membership-cancel-button').click();
    await expect(page.getByTestId('cancel-modal')).toBeVisible();

    await page.getByTestId('cancel-keep-button').click();
    await expect(page.getByTestId('cancel-modal')).not.toBeVisible();
    await expect(page.getByTestId('current-membership-card')).toBeVisible();
  });

  test('shows empty state when masjid has no active tiers', async ({ page }) => {
    await makeMembershipMeMock(page, null).install();
    await mockTiers(page, []);

    await page.goto(BASE_URL);
    await expect(page.getByTestId('tiers-empty-state')).toBeVisible();
  });

  test('shows error banner for a genuine tiers-fetch failure (not the 400 no-membership case)', async ({ page }) => {
    await makeMembershipMeMock(page, null).install();
    await page.route(`**/api/masjids/${MASJID_ID}/tiers`, async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Failed to fetch tiers.' }) });
    });

    await page.goto(BASE_URL);
    await expect(page.getByTestId('memberships-error-banner')).toContainText('Failed to fetch tiers.');

    await page.getByTestId('memberships-error-dismiss').click();
    await expect(page.getByTestId('memberships-error-banner')).not.toBeVisible();
  });
});