import { defineConfig, devices } from '@playwright/test';

/**
 * BUSAN Fast Verification Profile
 * --------------------------------
 * Purpose : Rapid smoke-check in ~2-3 minutes.
 * Browsers: Chromium only.
 * Scope   : Critical, travel data, PWA assets, basic navigation.
 *           Does NOT run: accessibility, offline, responsive, full UTE binding.
 * Usage   : npm run verify:fast
 *
 * Server  : Auto-started via webServer block (port 8080, npm run serve).
 *           reuseExistingServer: true — safe to run even if server is already up.
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',

  // Run fast tests in parallel
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,

  // Single browser × 4 workers is sufficient for a fast pass
  workers: 4,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-fast', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    actionTimeout: 8000,
    navigationTimeout: 20000,
  },

  // ── Auto-start dev server ──────────────────────────────────────────────────
  // Only attach a local server when baseURL is localhost (i.e. not overridden
  // to a remote URL by the caller). Production profile has its own config.
  webServer: BASE_URL.includes('localhost') ? {
    command: 'npm run serve',
    url: 'http://localhost:8080',
    timeout: 30000,          // wait up to 30 s for server to be ready
    reuseExistingServer: true, // do NOT kill an already-running server
    stdout: 'pipe',
    stderr: 'pipe',
  } : undefined,

  projects: [
    {
      name: 'chromium-fast',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 }, // mobile-first for this app
      },
      // Only run the fast-tagged test files
      testMatch: [
        '**/boot-smoke.spec.js',
        '**/critical.spec.js',
        '**/travel.spec.js',
        '**/main.spec.js',
        '**/content_regression.spec.js',
      ],
    },
  ],

  globalSetup: './tests/global-setup.js',
  outputDir: 'test-results-fast',

  // Per-test timeout — tighter than full suite
  timeout: 30000,
});
