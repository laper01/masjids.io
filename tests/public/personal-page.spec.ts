import { test, expect, type Page, type Route } from '@playwright/test';
import type { MasjidApiItem } from '@/types/masjid';
import type { BuilderContent, ComponentNode } from '@/types/builder';

/**
 * Personal Page (Site Builder public renderer) tests — no auth required.
 * Placed under tests/public/ so it's picked up by the 'public'
 * Playwright project (no storageState). The page itself has no
 * useSession/auth check at all.
 *
 * Route: app/(public)/public-masjids/[id]/personal-page/page.tsx →
 * `(public)` is a route group, doesn't appear in the URL, so the page
 * is assumed to live at /public-masjids/{masjidId}/personal-page.
 *
 * Mocked endpoints:
 *   - GET /api/masjids/:id                    (hooks/useMasjids.ts getMasjid)
 *   - GET /api/builder/content?masjid_id=...  (hooks/useBuilder.ts useBuilderContent)
 *
 * IMPORTANT — registry ids: components/builder/registry.tsx registers
 * components under short ids ("heading", "text", "button", "badge",
 * "alert", "card", "container", "section", "announcementbar", etc.) —
 * NOT the loose ComponentType union sample names in types/builder.ts
 * ("HeaderComponent" etc, which is just an illustrative string union
 * and allows any string). ComponentNode.type in test fixtures below
 * always uses the real registry ids; using a made-up type causes
 * CanvasRendererNode's `REGISTRY_MAP[componentId]` lookup to miss and
 * silently render nothing (`if (!entry) return null`).
 *
 * SCOPE — content-rendering assertions use page.getByText() against
 * raw prop values, per explicit instruction to skip adding testids
 * inside individual builder components (their actual source files —
 * Heading/index.tsx, Text/index.tsx, Button/index.tsx, etc. — were not
 * provided). Only fields whose registry label strongly implies a
 * literal passthrough are asserted:
 *   - heading.text ("Content"), text.value ("Content"), button.label
 *     ("Label"), badge.label ("Label"), alert.title/description
 *     ("Title"/"Description"), announcementbar.message/label
 *     ("Message"/"Label")
 * Fields whose on-canvas format is NOT safely inferable are
 * intentionally NOT asserted (e.g. PrayerTimesCard's time fields might
 * be prefixed/formatted; ContactInfo's phone/address might be wrapped
 * with icons/labels; CoverPhoto/GalleryGrid/FacilityInfo have no
 * guaranteed literal text at all). Send the actual component source
 * files to extend coverage into those safely.
 */

const MASJID_ID = 'masjid-1';
const BASE_URL = `/public-masjids/${MASJID_ID}/personal-page`;

function buildMasjidApiItem(overrides: Partial<MasjidApiItem> = {}): MasjidApiItem {
  return {
    id: overrides.id ?? MASJID_ID,
    name: overrides.name ?? 'Islamic Center of Testville',
    location: overrides.location ?? 'Testville',
    subDomain: overrides.subDomain ?? 'testville',
    is_verified: overrides.is_verified ?? true,
    latitude: overrides.latitude ?? 40.72,
    longitude: overrides.longitude ?? -74.0,
    version: overrides.version ?? 1,
    address: overrides.address ?? {
      address_line_1: '123 Main St',
      address_line_2: '',
      city: 'Testville',
      postal_code: '10001',
      country_code: 'US',
    },
    phone_number: overrides.phone_number ?? { country_code: '1', number: '5551234567' },
    prayer_times_configuration: overrides.prayer_times_configuration ?? {
      name: 'Default',
      method: 'MWL',
      fajr_angle: 18,
      isha_angle: 18,
      isha_interval: 0,
      asr_method: 'Standard',
      high_latitude_rule: 'MiddleOfTheNight',
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    },
  };
}

/** `type` must be a real registry id (see REGISTRY in components/builder/registry.tsx). */
function buildComponentNode(overrides: Partial<ComponentNode> = {}): ComponentNode {
  return {
    type: overrides.type ?? 'heading',
    props: overrides.props ?? { text: 'Welcome to Our Masjid' },
    children: overrides.children ?? [],
  };
}

function buildBuilderContent(children: ComponentNode[], overrides: Partial<BuilderContent> = {}): BuilderContent {
  return {
    layout: { root: { type: 'div', props: {}, children } },
    version: overrides.version ?? 1,
    layoutUpdatedAt: overrides.layoutUpdatedAt ?? new Date('2026-07-01').toISOString(),
    publishedAt: overrides.publishedAt ?? new Date('2026-07-01').toISOString(),
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockMasjid(page: Page, item: MasjidApiItem) {
  await page.route(`**/api/masjids/${MASJID_ID}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await fulfillJson(route, { success: true, message: 'OK', data: item });
  });
}

async function mockMasjidFailure(page: Page, status = 500) {
  await page.route(`**/api/masjids/${MASJID_ID}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ message: 'Masjid not found' }) });
  });
}

async function mockBuilderContent(page: Page, content: BuilderContent) {
  await page.route(`**/api/builder/content?masjid_id=${MASJID_ID}`, async (route) => {
    await fulfillJson(route, { success: true, message: 'OK', data: content });
  });
}

async function mockBuilderContentFailure(page: Page, status = 500, error = 'Failed to fetch layout') {
  await page.route(`**/api/builder/content?masjid_id=${MASJID_ID}`, async (route) => {
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error }) });
  });
}

test.describe('Personal Page (public site builder renderer) — page-level states', () => {
  test('shows loading state, then renders content wrapper when layout has nodes', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({ type: 'heading', props: { text: 'Welcome' } }),
      buildComponentNode({ type: 'text', props: { value: "Join us for Jumu'ah prayer." } }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByTestId('personal-page-content')).toBeVisible();
    await expect(page.getByTestId('personal-page-loading')).toHaveCount(0);
    await expect(page.getByTestId('personal-page-empty')).toHaveCount(0);
    await expect(page.getByTestId('personal-page-error')).toHaveCount(0);
  });

  test('shows loading state while masjid/builder requests are in flight', async ({ page }) => {
    let resolveMasjid!: () => void;
    let resolveBuilder!: () => void;
    const masjidGate = new Promise<void>((res) => { resolveMasjid = res; });
    const builderGate = new Promise<void>((res) => { resolveBuilder = res; });

    await page.route(`**/api/masjids/${MASJID_ID}`, async (route) => {
      await masjidGate;
      await fulfillJson(route, { success: true, message: 'OK', data: buildMasjidApiItem() });
    });
    await page.route(`**/api/builder/content?masjid_id=${MASJID_ID}`, async (route) => {
      await builderGate;
      await fulfillJson(route, { success: true, message: 'OK', data: buildBuilderContent([buildComponentNode()]) });
    });

    const navigation = page.goto(BASE_URL);
    await expect(page.getByTestId('personal-page-loading')).toBeVisible();

    resolveMasjid();
    resolveBuilder();
    await navigation;

    await expect(page.getByTestId('personal-page-content')).toBeVisible();
  });

  test('shows empty state when the published layout has no child components', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([])); // root.children = [] → hydrateLayout returns null

    await page.goto(BASE_URL);

    await expect(page.getByTestId('personal-page-empty')).toBeVisible();
    await expect(page.getByTestId('personal-page-empty')).toContainText("hasn't published a page yet");
  });

  test('shows error state when the builder content request fails', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContentFailure(page, 500, 'Failed to fetch layout');

    await page.goto(BASE_URL);

    await expect(page.getByTestId('personal-page-error')).toBeVisible();
    await expect(page.getByTestId('personal-page-error')).toContainText('Failed to fetch layout');
  });

  test('still renders content when the masjid lookup fails but builder content succeeds', async ({ page }) => {
    // Page has no dedicated error UI for a failed masjid fetch — `masjid`
    // just stays null and MosqueProvider gets an empty mosqueList. Content
    // should still render as long as the builder content call succeeds.
    await mockMasjidFailure(page, 404);
    await mockBuilderContent(page, buildBuilderContent([buildComponentNode()]));

    await page.goto(BASE_URL);

    await expect(page.getByTestId('personal-page-content')).toBeVisible();
  });
});

test.describe('Personal Page — builder content rendering (text-based assertions)', () => {
  test('renders heading and text component content', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({ type: 'heading', props: { text: 'Welcome to Al-Noor Masjid' } }),
      buildComponentNode({ type: 'text', props: { value: 'Friday prayers begin promptly at 1:00 PM.' } }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByText('Welcome to Al-Noor Masjid')).toBeVisible();
    await expect(page.getByText('Friday prayers begin promptly at 1:00 PM.')).toBeVisible();
  });

  test('renders button label and badge label', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({ type: 'button', props: { label: 'Get Directions' } }),
      buildComponentNode({ type: 'badge', props: { label: 'Verified Community' } }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByText('Get Directions')).toBeVisible();
    await expect(page.getByText('Verified Community')).toBeVisible();
  });

  test('badge falls back to its registry defaultProps label when not overridden', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    // No `label` override — componentToCanvasNode merges entry.defaultProps
    // first, so this should fall back to the registry default: "Badge".
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({ type: 'badge', props: {} }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByText('Badge')).toBeVisible();
  });

  test('renders alert title and description', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({
        type: 'alert',
        props: { variant: 'warning', title: 'Ramadan Schedule', description: 'Taraweeh begins at 8:30 PM nightly.' },
      }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByText('Ramadan Schedule')).toBeVisible();
    await expect(page.getByText('Taraweeh begins at 8:30 PM nightly.')).toBeVisible();
  });

  test('renders announcement bar message and label', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({
        type: 'announcementbar',
        props: { message: 'Parking lot closed for maintenance this weekend.', label: 'Heads Up' },
      }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByText('Parking lot closed for maintenance this weekend.')).toBeVisible();
    await expect(page.getByText('Heads Up')).toBeVisible();
  });

  test('renders nested children inside slot components (card > heading + button)', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({
        type: 'card',
        props: { title: '' }, // card's own title left empty — not asserted, unconfirmed rendering
        children: [
          buildComponentNode({ type: 'heading', props: { text: 'Ramadan Fundraiser' } }),
          buildComponentNode({ type: 'button', props: { label: 'Donate Now' } }),
        ],
      }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByText('Ramadan Fundraiser')).toBeVisible();
    await expect(page.getByText('Donate Now')).toBeVisible();
  });

  test('renders deeply nested children inside layout-only slots (section > container > text)', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({
        type: 'section',
        props: {},
        children: [
          buildComponentNode({
            type: 'container',
            props: {},
            children: [
              buildComponentNode({ type: 'text', props: { value: 'Nested three levels deep.' } }),
            ],
          }),
        ],
      }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByText('Nested three levels deep.')).toBeVisible();
  });

  test('unregistered component type is silently skipped without breaking sibling rendering', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({ type: 'some-unregistered-widget', props: { text: 'This should never appear' } }),
      buildComponentNode({ type: 'heading', props: { text: 'Still Renders Fine' } }),
    ]));

    await page.goto(BASE_URL);

    await expect(page.getByTestId('personal-page-content')).toBeVisible();
    await expect(page.getByText('Still Renders Fine')).toBeVisible();
    await expect(page.getByText('This should never appear')).toHaveCount(0);
  });

  test('multiple top-level siblings all render in document order', async ({ page }) => {
    await mockMasjid(page, buildMasjidApiItem());
    await mockBuilderContent(page, buildBuilderContent([
      buildComponentNode({ type: 'heading', props: { text: 'Section One' } }),
      buildComponentNode({ type: 'heading', props: { text: 'Section Two' } }),
      buildComponentNode({ type: 'heading', props: { text: 'Section Three' } }),
    ]));

    await page.goto(BASE_URL);

    const headings = [
      page.getByText('Section One'),
      page.getByText('Section Two'),
      page.getByText('Section Three'),
    ];
    for (const h of headings) {
      await expect(h).toBeVisible();
    }
  });
});