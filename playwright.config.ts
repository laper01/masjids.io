import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },



projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },

  // Default/catch-all — covers dashboard, events, api, elections, memberships,
  // donations, and anything else EXCEPT voting/ and public/ folders below.
  // This is a negative lookahead: matches any .spec.ts NOT under voting/ or public/.
  {
    name: 'admin',
    testDir: './tests',
    testMatch: /^(?!.*\/(voting|public)\/).*\.spec\.ts$/,
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
    dependencies: ['setup'],
  },

  // Only tests that specifically need a member (non-admin) role
  {
    name: 'member',
    testDir: './tests',
    testMatch: /.*\/voting\/.*\.spec\.ts/,
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/member.json' },
    dependencies: ['setup'],
  },

  // Public pages — no login at all
  {
    name: 'public',
    testDir: './tests',
    testMatch: /.*\/public\/.*\.spec\.ts/,
    use: { ...devices['Desktop Chrome'] }, // no storageState
  },
],

  // Auto-starts the Next.js dev server before running tests (skip if you run it manually)
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
