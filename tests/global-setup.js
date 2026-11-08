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
  // CI localhost tests must NEVER initialize the real trip Firebase project.
  // Patch only this disposable runner checkout; the Git repository/Production JS is untouched.
  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:8080';
  if (process.env.CI && /^http:\/\/localhost(?::\d+)?\/?/.test(baseUrl)) {
    if (process.env.BUSAN_CI_FIREBASE_ISOLATED !== '1') {
      throw new Error('Refusing localhost CI tests without explicit Firebase isolation');
    }
    const firebasePath = new URL('../js/firebase.js', import.meta.url);
    const original = fs.readFileSync(firebasePath, 'utf8');
    const initAnchor = '    const firebaseConfig = {';
    const fixture = fs.readFileSync(new URL('./fixtures/ci-firebase.js', import.meta.url), 'utf8');
    if (original.split(initAnchor).length !== 2 || !fixture.includes('__ciOnly:true')) {
      throw new Error('Unexpected Firebase bootstrap or missing isolated fixture; fail closed');
    }
    // CI test runtime gets a process-local in-memory Firebase facade. Original repo JS is never changed.
    fs.writeFileSync(firebasePath, original.replace(initAnchor, fixture + '\n' + initAnchor));
    console.log('[Setup] CI Firebase isolation ACTIVE: in-memory database only');
  }
  console.log('[Setup] Test output directories ready.');
}

export default globalSetup;
