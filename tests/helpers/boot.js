// @ts-check
/**
 * BUSAN.11 — Canonical Boot Helper
 * =================================
 * Shared by all test suites via import.
 *
 * PROBLEM SOLVED:
 * The application has a 2.5-second auto-boot safety timeout (app.js).
 * forceShowApp also fires at 1.2s.
 * Either can trigger before Playwright has a chance to click .btn-enter.
 *
 * During the CSS fade-out (300ms), #splash has display:block but opacity:0.
 * Playwright's isVisible() may return true because the element is in the DOM
 * and has non-zero dimensions, but the element is mid-animation.
 * Calling .click() on an animating element causes Playwright to wait for
 * stability — which never comes because opacity is transitioning to 0.
 * This results in: TimeoutError: locator.click: Timeout 8000ms exceeded.
 *
 * SOLUTION:
 * 1. Navigate to the app.
 * 2. Wait for EITHER #mainApp visible OR .btn-enter visible.
 *    - If #mainApp is already visible → done immediately (app already booted).
 *    - If .btn-enter is visible (and stable) → click it.
 *    - If neither within timeout → assume auto-boot is in progress, wait for #mainApp.
 * 3. Wait for #mainApp to be visible and stable.
 * 4. No arbitrary sleeps. No click on hidden/animating elements.
 *
 * RACE-SAFE:
 * Uses Promise.race between #mainApp becoming visible and .btn-enter becoming
 * visible. Whichever wins determines the strategy. The helper is idempotent:
 * calling it when the app is already booted simply returns immediately.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function bootApp(page) {
  await page.goto('/');

  // Phase 1: Wait for the app to signal readiness via one of two selectors.
  // #mainApp    → app already auto-booted (fast path, no click needed)
  // .btn-enter  → splash is fully rendered and button is interactive
  //
  // We race these two conditions with a generous 15-second outer timeout.
  // The timeout here is on waitForSelector which throws if nothing matches —
  // but we catch each individually to avoid uncaught promise rejections.
  const BOOT_TIMEOUT = 15000;

  // Try to detect #mainApp being visible first (most common case with autoboot)
  const mainAppVisible = page.waitForSelector('#mainApp', {
    state: 'visible',
    timeout: BOOT_TIMEOUT,
  });

  // Also detect .btn-enter being visible — meaning splash rendered before autoboot
  const btnEnterVisible = page.waitForSelector('.btn-enter', {
    state: 'visible',
    timeout: BOOT_TIMEOUT,
  });

  // Race: whichever resolves first wins
  const winner = await Promise.race([
    mainAppVisible.then(() => 'mainApp'),
    btnEnterVisible.then(() => 'btnEnter'),
  ]).catch(() => 'unknown');

  if (winner === 'mainApp') {
    // Fast path: app already booted. Done.
    return;
  }

  if (winner === 'btnEnter') {
    // Splash is visible and button is stable enough to click.
    // Use force:false (default) so Playwright confirms stability before click.
    // If by the time we click the button has started fading, click() is skipped
    // and we fall through to wait for #mainApp below.
    try {
      const enterBtn = page.locator('.btn-enter');
      // Double-check visibility synchronously before clicking.
      // isVisible() does NOT wait — it just reads current DOM state.
      const stillVisible = await enterBtn.isVisible();
      if (stillVisible) {
        // Use a tight timeout: if the button is genuinely visible and stable,
        // the click should complete instantly. If it fails, auto-boot will handle it.
        await enterBtn.click({ timeout: 3000 });
      }
    } catch {
      // Click failed (button faded during the animation window).
      // Auto-boot will take over within 2.5s of page load — just wait for #mainApp.
    }
  }

  // Phase 2: Always wait for #mainApp to be visible and stable.
  // This is the single source of truth that the app is ready.
  await page.waitForSelector('#mainApp', { state: 'visible', timeout: 10000 });
}

/**
 * Lightweight boot helper for tests that ONLY need #mainApp to exist —
 * does not attempt to click splash button at all.
 * Used by critical.spec.js-style tests that test the auto-boot itself.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=12000]
 */
export async function waitForApp(page, timeout = 12000) {
  await page.goto('/');
  await page.waitForSelector('#mainApp', { state: 'visible', timeout });
}
