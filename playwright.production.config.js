import { defineConfig, devices } from '@playwright/test';

/**
 * BUSAN Production Verification Profile
 * ----------------------------------------
 * Purpose : Post-deployment verification against the live site.
 * Browsers: Chromium only (fast, CI-friendly).
 * Scope   : PWA assets, service worker, critical routes, travel data.
 * Usage   : PLAYWRIGHT_TEST_BASE_URL=https://your-site.com npm run verify:production
 */
export default defineConfig({
  testDir: './tests',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-production', open: 'never' }],
    ['json', { outputFile: 'test-results/production-results.json' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://yalulu617-rgb.github.io/BUSAN.11/',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 45000,
  },

  projects: [
    {
      name: 'chromium-production',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
      },
      testMatch: [
        '**/critical.spec.js',
        '**/travel.spec.js',
      ],
    },
  ],

  globalSetup: './tests/global-setup.js',
  outputDir: 'test-results-production',
  timeout: 45000,
});
