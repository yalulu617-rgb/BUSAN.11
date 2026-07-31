import { defineConfig, devices } from '@playwright/test';

/**
 * BUSAN V42 Playwright Configuration
 * Full E2E testing for all browsers, responsive viewports, and offline scenarios.
 */
export default defineConfig({
  testDir: './tests',
  
  // Run all tests in parallel for speed
  fullyParallel: true,
  
  // Fail the build on CI if any test.only is left in source
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only - helps with network flakiness
  retries: process.env.CI ? 2 : 0,
  
  // Fewer workers on CI for stability
  workers: process.env.CI ? 2 : undefined,
  
  // Reporters: HTML report + list for CI
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  use: {
    // Base URL — override with PLAYWRIGHT_TEST_BASE_URL env in CI
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8080',
    
    // Capture screenshot only on failure
    screenshot: 'only-on-failure',
    
    // Record video on retry (for debugging CI failures)
    video: 'on-first-retry',
    
    // Capture trace on retry
    trace: 'on-first-retry',
    
    // Global timeout per action
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },

  projects: [
    // ── Desktop Browsers ───────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // ── Mobile Viewports ───────────────────────────────────
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 15'],
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
      },
    },
  ],

  // Global setup: ensure test-results dir exists
  globalSetup: './tests/global-setup.js',
  
  // Output folder for test artifacts
  outputDir: 'test-results',
  
  // Test timeout
  timeout: 60000,
});
