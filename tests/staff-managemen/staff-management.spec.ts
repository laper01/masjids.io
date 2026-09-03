import { test, expect, Page } from '@playwright/test';
import { waitForMosqueReady } from '../helpers/wait-for-mosque';

// ⚠️ Adjust the import above if the actual exported function name in
// `tests/helpers/wait-for-mosque.ts` differs (e.g. `waitForMosqueContext`).

// ─────────────────────────────────────────────────────────────────────────────
// NOTE ON ENDPOINTS
// Confirmed from hooks/staff/useStaff.ts:
//   POST   /api/masjids/{masjidId}/staff/invite
//   GET    /api/masjids/{masjidId}/staff/invitations{?status}
//   DELETE /api/masjids/{masjidId}/staff/invitations/{inviteId}
//   GET    /api/masjids/{masjidId}/staff{?search,role_template_id,page,limit}
//   DELETE /api/masjids/{masjidId}/staff/{userId}
//
// Assumed from project instructions (PERM-01..03) — confirm/adjust if wrong:
//   GET    /api/masjids/{masjidId}/permissions/role-templates
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_TEMPLATES = [
  { id: 'role-admin',     name: 'Admin' },
  { id: 'role-treasurer', name: 'Treasurer' },
  { id: 'role-moderator', name: 'Moderator' },
];

function makeStaffMember(overrides: Partial<{
  user_id: string;
  name: string;
  email: string;
  role_name: string;
  effective_scope_count: number;
  joined_at: string;
}> = {}) {
  return {
    user_id: 'user-001',
    name: 'Ahmad Fauzi',
    email: 'ahmad.fauzi@example.com',
    role_name: 'Admin',
    effective_scope_count: 12,
    joined_at: '2024-03-15T00:00:00.000Z',
    ...overrides,
  };
}

function makeInvitation(overrides: Partial<{
  invite_id: string;
  email: string;
  role_name: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
}> = {}) {
  return {
    invite_id: 'invite-001',
    email: 'new.staff@example.com',
    role_name: 'Moderator',
    status: 'pending' as const,
    expires_at: '2099-12-31T00:00:00.000Z',
    ...overrides,
  };
}

const DEFAULT_STAFF = [
  makeStaffMember({ user_id: 'user-001', name: 'Ahmad Fauzi', email: 'ahmad.fauzi@example.com', role_name: 'Admin' }),
  makeStaffMember({ user_id: 'user-002', name: 'Siti Rahma', email: 'siti.rahma@example.com', role_name: 'Treasurer', effective_scope_count: 6 }),
  makeStaffMember({ user_id: 'user-003', name: 'Budi Santoso', email: 'budi.santoso@example.com', role_name: 'Moderator', effective_scope_count: 4 }),
];

const DEFAULT_INVITATIONS = [
  makeInvitation({ invite_id: 'invite-001', email: 'pending1@example.com', status: 'pending' }),
  makeInvitation({ invite_id: 'invite-002', email: 'pending2@example.com', status: 'pending' }),
  makeInvitation({ invite_id: 'invite-003', email: 'accepted1@example.com', status: 'accepted' }),
];

/**
 * Wires up baseline mocks for the Staff Management page:
 * role templates, staff list, and invitations list.
 * Each can be overridden per-test by calling page.route again afterward
 * (Playwright uses the most-recently-registered matching handler).
 */
async function mockBaseline(
  page: Page,
  opts: {
    staff?: typeof DEFAULT_STAFF;
    invitations?: typeof DEFAULT_INVITATIONS;
    totalPage?: number;
    totalData?: number;
  } = {}
) {
  const staff = opts.staff ?? DEFAULT_STAFF;
  const invitations = opts.invitations ?? DEFAULT_INVITATIONS;
  const totalPage = opts.totalPage ?? 1;
  const totalData = opts.totalData ?? staff.length;

  await page.route('**/api/masjids/*/permissions/role-templates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'OK',
        data: ROLE_TEMPLATES,
      }),
    });
  });

  await page.route('**/api/masjids/*/staff/invitations**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'OK',
        data: invitations,
        metadata: { total_data: invitations.length, total_page: 1 },
      }),
    });
  });

  await page.route('**/api/masjids/*/staff**', async (route) => {
    const req = route.request();
    if (req.method() !== 'GET' || req.url().includes('/invitations') || req.url().includes('/invite')) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'OK',
        data: staff,
        metadata: { total_data: totalData, total_page: totalPage },
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockBaseline(page);
  await waitForMosqueReady(page, '/users');
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Staff Management — staff list', () => {
  test('loads and displays staff members with correct stats', async ({ page }) => {
    await expect(page.getByTestId('staff-management-page')).toBeVisible();

    for (const member of DEFAULT_STAFF) {
      await expect(page.getByTestId(`staff-row-${member.user_id}`)).toBeVisible();
      await expect(page.getByTestId(`staff-row-${member.user_id}`)).toContainText(member.name);
    }

    // Total Staff stat card should reflect the 3 seeded members.
    // "Total Staff" appears twice on this page (the main stat card label
    // and a smaller secondary label elsewhere) — .first() targets the
    // primary stat card.
    await expect(page.getByText('Total Staff').first()).toBeVisible();
  });

  test('shows empty state when no staff members match', async ({ page }) => {
    await mockBaseline(page, { staff: [], totalData: 0, totalPage: 1 });
    await page.reload();
    await waitForMosqueReady(page, '/users');

    await expect(page.getByTestId('staff-empty-state')).toBeVisible();
    await expect(page.getByTestId('staff-empty-state')).toContainText('No staff members found.');
  });

  test('filters staff by search term (debounced)', async ({ page }) => {
    let lastUrl = '';
    await page.route('**/api/masjids/*/staff**', async (route) => {
      const req = route.request();
      if (req.method() !== 'GET' || req.url().includes('/invitations') || req.url().includes('/invite')) {
        await route.fallback();
        return;
      }
      lastUrl = req.url();
      const filtered = DEFAULT_STAFF.filter((m) =>
        m.name.toLowerCase().includes('siti')
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: filtered,
          metadata: { total_data: filtered.length, total_page: 1 },
        }),
      });
    });

    await page.getByTestId('staff-search-input').fill('Siti');

    // Debounce is 350ms in the component — wait past it before asserting
    await expect(page.getByTestId('staff-row-user-002')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('staff-row-user-001')).not.toBeVisible();
    expect(lastUrl).toContain('search=Siti');
  });

  test('filters staff by role via dropdown', async ({ page }) => {
    await page.getByTestId('role-filter-btn').click();
    await expect(page.getByTestId('role-filter-dropdown')).toBeVisible();

    let requestedRoleTemplateId = '';
    await page.route('**/api/masjids/*/staff**', async (route) => {
      const req = route.request();
      if (req.method() !== 'GET' || req.url().includes('/invitations') || req.url().includes('/invite')) {
        await route.fallback();
        return;
      }
      const url = new URL(req.url());
      requestedRoleTemplateId = url.searchParams.get('role_template_id') ?? '';
      const filtered = DEFAULT_STAFF.filter((m) => m.role_name === 'Treasurer');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: filtered,
          metadata: { total_data: filtered.length, total_page: 1 },
        }),
      });
    });

    await page.getByTestId('role-filter-option-Treasurer').click();

    await expect(page.getByTestId('staff-row-user-002')).toBeVisible();
    await expect(page.getByTestId('staff-row-user-001')).not.toBeVisible();
    expect(requestedRoleTemplateId).toBe('role-treasurer');
  });

  test('reset filters button clears search and role filter', async ({ page }) => {
    await page.getByTestId('staff-search-input').fill('Ahmad');
    await page.getByTestId('reset-filters-btn').click();
    await expect(page.getByTestId('staff-search-input')).toHaveValue('');
    await expect(page.getByTestId('role-filter-btn')).toContainText('All Roles');
  });

  test('paginates staff list', async ({ page }) => {
    await mockBaseline(page, { totalPage: 2, totalData: 8 });
    await page.reload();
    await waitForMosqueReady(page, '/users');

    await expect(page.getByTestId('pagination')).toBeVisible();
    await expect(page.getByTestId('page-btn-1')).toBeVisible();
    await expect(page.getByTestId('page-btn-2')).toBeVisible();

    let requestedPage = '';
    await page.route('**/api/masjids/*/staff**', async (route) => {
      const req = route.request();
      if (req.method() !== 'GET' || req.url().includes('/invitations') || req.url().includes('/invite')) {
        await route.fallback();
        return;
      }
      const url = new URL(req.url());
      requestedPage = url.searchParams.get('page') ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: DEFAULT_STAFF,
          metadata: { total_data: 8, total_page: 2 },
        }),
      });
    });

    await page.getByTestId('page-btn-2').click();
    await expect.poll(() => requestedPage).toBe('2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Staff Management — remove staff', () => {
  test('opens confirm modal and removes staff member', async ({ page }) => {
    await page.getByTestId('staff-menu-trigger-user-003').click();
    await page.getByTestId('staff-remove-action-user-003').click();

    const modal = page.getByTestId('remove-staff-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Budi Santoso');

    await page.route('**/api/masjids/*/staff/user-003', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Removed', data: {} }),
      });
    });

    await page.getByTestId('remove-staff-confirm-btn').click();

    await expect(modal).not.toBeVisible();
    await expect(page.getByTestId('staff-row-user-003')).not.toBeVisible();
  });

  test('cancel button closes modal without removing', async ({ page }) => {
    await page.getByTestId('staff-menu-trigger-user-001').click();
    await page.getByTestId('staff-remove-action-user-001').click();

    await expect(page.getByTestId('remove-staff-modal')).toBeVisible();
    await page.getByTestId('remove-staff-cancel-btn').click();
    await expect(page.getByTestId('remove-staff-modal')).not.toBeVisible();
    await expect(page.getByTestId('staff-row-user-001')).toBeVisible();
  });

  test('shows error banner when remove fails', async ({ page }) => {
    await page.getByTestId('staff-menu-trigger-user-001').click();
    await page.getByTestId('staff-remove-action-user-001').click();

    await page.route('**/api/masjids/*/staff/user-001', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Server error', data: null }),
      });
    });

    await page.getByTestId('remove-staff-confirm-btn').click();

    await expect(page.getByTestId('staff-error-banner')).toBeVisible();
    await expect(page.getByTestId('staff-row-user-001')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Staff Management — invite flow', () => {
  test('sends invitation successfully', async ({ page }) => {
    await page.getByTestId('invite-staff-btn').click();
    await expect(page.getByTestId('invite-modal')).toBeVisible();

    await page.getByLabel('Email Address').fill('newhire@example.com');
    await page.getByLabel('Assign Role').selectOption('Treasurer');
    await page.getByLabel(/Personal Message/).fill('Welcome aboard!');

    await page.route('**/api/masjids/*/staff/invite', async (route) => {
      const req = route.request();
      expect(req.method()).toBe('POST');
      const body = req.postDataJSON();
      expect(body.email).toBe('newhire@example.com');
      expect(body.role_name).toBe('Treasurer');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Invitation sent',
          data: makeInvitation({
            invite_id: 'invite-new',
            email: 'newhire@example.com',
            role_name: 'Treasurer',
            status: 'pending',
          }),
        }),
      });
    });

    await page.getByTestId('send-invite-btn').click();

    await expect(page.getByTestId('invite-success-state')).toBeVisible();
    await expect(page.getByTestId('invite-success-state')).toContainText('newhire@example.com');

    // Modal auto-closes ~1.8s after success
    await expect(page.getByTestId('invite-modal')).not.toBeVisible({ timeout: 3_000 });
  });

  test('shows inline error when invite fails', async ({ page }) => {
    await page.getByTestId('invite-staff-btn').click();
    await page.getByLabel('Email Address').fill('fail@example.com');

    await page.route('**/api/masjids/*/staff/invite', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Server error', data: null }),
      });
    });

    await page.getByTestId('send-invite-btn').click();

    await expect(page.getByTestId('invite-error-banner')).toBeVisible();
    await expect(page.getByTestId('invite-error-banner')).toContainText('Failed to send invitation');
    await expect(page.getByTestId('invite-modal')).toBeVisible();
  });

  test('send invite button disabled until email and role are set', async ({ page }) => {
    await page.getByTestId('invite-staff-btn').click();
    await expect(page.getByTestId('send-invite-btn')).toBeDisabled();

    await page.getByLabel('Email Address').fill('someone@example.com');
    await expect(page.getByTestId('send-invite-btn')).toBeEnabled();
  });

  test('cancel closes invite modal and clears fields', async ({ page }) => {
    await page.getByTestId('invite-staff-btn').click();
    await page.getByLabel('Email Address').fill('discard-me@example.com');
    await page.getByTestId('invite-cancel-btn').click();
    await expect(page.getByTestId('invite-modal')).not.toBeVisible();

    await page.getByTestId('invite-staff-btn').click();
    await expect(page.getByLabel('Email Address')).toHaveValue('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Staff Management — invitations tab', () => {
  test('switches to invitations tab and lists invitations', async ({ page }) => {
    await page.getByTestId('tab-invitations').click();
    for (const inv of DEFAULT_INVITATIONS) {
      await expect(page.getByTestId(`invitation-row-${inv.invite_id}`)).toBeVisible();
    }
  });

  test('filters invitations by status', async ({ page }) => {
    await page.getByTestId('tab-invitations').click();

    let requestedStatus = '';
    await page.route('**/api/masjids/*/staff/invitations**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      const url = new URL(route.request().url());
      requestedStatus = url.searchParams.get('status') ?? '';
      const filtered = DEFAULT_INVITATIONS.filter((i) => i.status === 'accepted');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: filtered,
          metadata: { total_data: filtered.length, total_page: 1 },
        }),
      });
    });

    await page.getByTestId('inv-status-filter-accepted').click();

    await expect(page.getByTestId('invitation-row-invite-003')).toBeVisible();
    await expect(page.getByTestId('invitation-row-invite-001')).not.toBeVisible();
    expect(requestedStatus).toBe('accepted');
  });

  test('revokes a single pending invitation', async ({ page }) => {
    await page.getByTestId('tab-invitations').click();

    await page.route('**/api/masjids/*/staff/invitations/invite-001', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Revoked', data: {} }),
      });
    });

    const row = page.getByTestId('invitation-row-invite-001');
    await row.hover();
    await page.getByTestId('revoke-invitation-btn-invite-001').click();

    await expect(row).toContainText('revoked');
  });

  test('revokes all pending invitations via toolbar button', async ({ page }) => {
    await page.getByTestId('tab-invitations').click();

    const revokedIds: string[] = [];
    await page.route('**/api/masjids/*/staff/invitations/*', async (route) => {
      if (route.request().method() !== 'DELETE') {
        await route.fallback();
        return;
      }
      const id = route.request().url().split('/').pop()!;
      revokedIds.push(id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Revoked', data: {} }),
      });
    });

    await page.getByTestId('revoke-all-btn').click();

    await expect.poll(() => revokedIds.sort()).toEqual(['invite-001', 'invite-002']);
  });
});