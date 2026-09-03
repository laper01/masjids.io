# Playwright Test Commands — masjids-management

Copy-paste ready commands for each test file. All `admin`-project tests
automatically run the `setup` dependency first (login + select masjid), so
there's no need to run setup manually. The `public` project doesn't use
`storageState` at all.

> ⚠️ **Before using this guide:**
> - The `tests/staff-managemen/` folder has a typo (missing the "t" at the
>   end). The commands below follow the folder name **as it currently is**
>   — if it's been renamed to `staff-management`, update the path too.
> - The `tests/permissions/` folder is still empty, no `.spec.ts` yet — not
>   included in the list below.
> - **`--headed` + multiple workers can cause flaky failures** (timeouts on
>   `getByTestId`, elements "not found" that pass fine in headless). Running
>   several headed browser contexts in parallel puts heavy load on the dev
>   server, so `waitForMosqueReady` / `MosqueContext` hydration can time out
>   under contention — not a real bug in the test or component. When running
>   headed, add `--workers=1`. Headless runs are fine with the default
>   worker count.

---

## Announcements

```bash
npx playwright test tests/announcements/announcements.spec.ts --project=admin
npx playwright test tests/announcements/announcements.spec.ts --project=admin --ui
npx playwright test tests/announcements/announcements.spec.ts --project=admin --headed
npx playwright test tests/announcements/announcements.spec.ts --project=admin --headed --workers=1
```

## Dashboard — Summary Contract

```bash
npx playwright test tests/dashboard/dashboard-summary-contract.spec.ts --project=admin
npx playwright test tests/dashboard/dashboard-summary-contract.spec.ts --project=admin --ui
npx playwright test tests/dashboard/dashboard-summary-contract.spec.ts --project=admin --headed
npx playwright test tests/dashboard/dashboard-summary-contract.spec.ts --project=admin --headed --workers=1
```

## Dashboard

```bash
npx playwright test tests/dashboard/dashboard.spec.ts --project=admin
npx playwright test tests/dashboard/dashboard.spec.ts --project=admin --ui
npx playwright test tests/dashboard/dashboard.spec.ts --project=admin --headed
npx playwright test tests/dashboard/dashboard.spec.ts --project=admin --headed --workers=1
```

## Masjid Management

```bash
npx playwright test tests/masjid-management/masjid-management.spec.ts --project=admin
npx playwright test tests/masjid-management/masjid-management.spec.ts --project=admin --ui
npx playwright test tests/masjid-management/masjid-management.spec.ts --project=admin --headed
npx playwright test tests/masjid-management/masjid-management.spec.ts --project=admin --headed --workers=1
```

## Masjid Switching

```bash
npx playwright test tests/masjid-management/masjid-switching.spec.ts --project=admin
npx playwright test tests/masjid-management/masjid-switching.spec.ts --project=admin --ui
npx playwright test tests/masjid-management/masjid-switching.spec.ts --project=admin --headed
npx playwright test tests/masjid-management/masjid-switching.spec.ts --project=admin --headed --workers=1
```

## Register Masjid Modal

```bash
npx playwright test tests/masjid-management/register-masjid-modal.spec.ts --project=admin
npx playwright test tests/masjid-management/register-masjid-modal.spec.ts --project=admin --ui
npx playwright test tests/masjid-management/register-masjid-modal.spec.ts --project=admin --headed
npx playwright test tests/masjid-management/register-masjid-modal.spec.ts --project=admin --headed --workers=1
```

## Masjid Settings

```bash
npx playwright test tests/masjid-settings/masjid-settings.spec.ts --project=admin
npx playwright test tests/masjid-settings/masjid-settings.spec.ts --project=admin --ui
npx playwright test tests/masjid-settings/masjid-settings.spec.ts --project=admin --headed
npx playwright test tests/masjid-settings/masjid-settings.spec.ts --project=admin --headed --workers=1
```

## Member Management

```bash
npx playwright test tests/member-management/member-management.spec.ts --project=admin
npx playwright test tests/member-management/member-management.spec.ts --project=admin --ui
npx playwright test tests/member-management/member-management.spec.ts --project=admin --headed
npx playwright test tests/member-management/member-management.spec.ts --project=admin --headed --workers=1
```

## Membership

```bash
npx playwright test tests/membership/membership.spec.ts --project=admin
npx playwright test tests/membership/membership.spec.ts --project=admin --ui
npx playwright test tests/membership/membership.spec.ts --project=admin --headed
npx playwright test tests/membership/membership.spec.ts --project=admin --headed --workers=1
```

## Monetization Gateway

```bash
npx playwright test tests/monetization-gateway/monetization-gateway.spec.ts --project=admin
npx playwright test tests/monetization-gateway/monetization-gateway.spec.ts --project=admin --ui
npx playwright test tests/monetization-gateway/monetization-gateway.spec.ts --project=admin --headed
npx playwright test tests/monetization-gateway/monetization-gateway.spec.ts --project=admin --headed --workers=1
```

## My Announcements

```bash
npx playwright test tests/my-announcements/my-announcements.spec.ts --project=admin
npx playwright test tests/my-announcements/my-announcements.spec.ts --project=admin --ui
npx playwright test tests/my-announcements/my-announcements.spec.ts --project=admin --headed
npx playwright test tests/my-announcements/my-announcements.spec.ts --project=admin --headed --workers=1
```

## Profile

```bash
npx playwright test tests/profile/profile.spec.ts --project=admin
npx playwright test tests/profile/profile.spec.ts --project=admin --ui
npx playwright test tests/profile/profile.spec.ts --project=admin --headed
npx playwright test tests/profile/profile.spec.ts --project=admin --headed --workers=1
```

## Login Google (public)

```bash
npx playwright test tests/public/login-google.spec.ts --project=public
npx playwright test tests/public/login-google.spec.ts --project=public --ui
npx playwright test tests/public/login-google.spec.ts --project=public --headed
npx playwright test tests/public/login-google.spec.ts --project=public --headed --workers=1
```

## Register (public)

```bash
npx playwright test tests/public/register.spec.ts --project=public
npx playwright test tests/public/register.spec.ts --project=public --ui
npx playwright test tests/public/register.spec.ts --project=public --headed
npx playwright test tests/public/register.spec.ts --project=public --headed --workers=1
```

## Staff Management

```bash
npx playwright test tests/staff-managemen/staff-management.spec.ts --project=admin
npx playwright test tests/staff-managemen/staff-management.spec.ts --project=admin --ui
npx playwright test tests/staff-managemen/staff-management.spec.ts --project=admin --headed
npx playwright test tests/staff-managemen/staff-management.spec.ts --project=admin --headed --workers=1
```

## Masjid Followers

```bash
npx playwright test tests/masjid-followers/masjid-followers.spec.ts --project=admin
npx playwright test tests/masjid-followers/masjid-followers.spec.ts --project=admin --ui
npx playwright test tests/masjid-followers/masjid-followers.spec.ts --project=admin --headed
npx playwright test tests/masjid-followers/masjid-followers.spec.ts --project=admin --headed --workers=1
```

---

## Run Everything At Once

```bash
# All admin tests (headless, default workers)
npx playwright test --project=admin

# All public tests (headless, default workers)
npx playwright test --project=public

# All projects at once (admin + member + public, per config)
npx playwright test

# UI Mode — opens the Playwright UI, pick project/test from there
npx playwright test --ui

# Headed — single worker (recommended to avoid dev-server contention flakiness)
npx playwright test --project=admin --headed --workers=1
npx playwright test --project=public --headed --workers=1

# Headed — default workers (fine for a handful of tests, riskier for the full suite)
npx playwright test --project=admin --headed
npx playwright test --project=public --headed
```

## View Last Report

```bash
npx playwright show-report
```