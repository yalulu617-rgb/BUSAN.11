import fs from 'fs';

/**
 * Global setup: ensure required directories exist before tests run.
 */
async function globalSetup() {
  const dirs = ['test-results', 'playwright-report'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  console.log('[Setup] Test output directories ready.');
}

export default globalSetup;
