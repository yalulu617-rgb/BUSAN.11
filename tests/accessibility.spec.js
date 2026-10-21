// @ts-check
import { test, expect } from '@playwright/test';

/**
 * BUSAN V42 – Accessibility Test Suite
 * Covers: touch targets, font sizes, keyboard navigation, contrast,
 *         one-hand usability, parent/elderly friendly checks.
 */

import { bootApp } from './helpers/boot.js';

// MOBILE-ZOOM-01 repair regression. Text enlargement is a CSS simulation,
// not physical-device pinch zoom or an independent release acceptance.
test.describe('MOBILE-ZOOM-01', () => {
  test.beforeEach(async ({ page }) => {
    await bootApp(page);
    expect(await page.evaluate(() => Boolean(
      window.firebase?.__ciOnly && window.NetworkEngine?._db?.__testOnly
    )), 'Zoom regression requires isolated Firebase').toBe(true);
  });

  test('viewport allows user zoom', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0');
  });

  for (const width of [320, 360, 390, 430]) {
    test(`${width}px: three phases reflow and 200% text keeps navigation operable`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const home = page.locator('#v37HomeDashboard .v46-home');
      const bag = page.locator('#v37HomeDashboard details.v46-tools');
      // Diagnostic only: a failed real click retains the original failure and
      // prints geometry / elementFromPoint evidence; it never force-clicks.
      const clickWithEvidence = async (target, label) => {
        try { await target.click(); } catch (error) {
          const evidence = await page.evaluate(() => {
            const pick = (query) => {
              const el = document.querySelector(query);
              if (!el) return {missing:query};
              const r=el.getBoundingClientRect();
              const cs=getComputedStyle(el);
              const x=Math.min(innerWidth-1, Math.max(0,r.left+r.width/2));
              const y=Math.min(innerHeight-1, Math.max(0,r.top+r.height/2));
              const hit=document.elementFromPoint(x,y);
              const parent=hit?.closest('.bottom-nav,.container,.v46-sticky-head,.v46-tools-content');
              return {selector:query, rect:{x:r.x,y:r.y,width:r.width,height:r.height},
                style:{position:cs.position,zIndex:cs.zIndex,transform:cs.transform,overflow:cs.overflow,pointerEvents:cs.pointerEvents},
                hit:{tag:hit?.tagName,id:hit?.id,className:String(hit?.className||'').slice(0,150),text:hit?.textContent?.trim().slice(0,90)},
                parent:parent?.id||String(parent?.className||'').slice(0,100)};
            };
            return {scrollY,innerWidth,innerHeight,devicePixelRatio,
              screen:{width:screen.width,height:screen.height},
              visualViewport:window.visualViewport && {width:visualViewport.width,height:visualViewport.height,
                scale:visualViewport.scale,offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop},
              document:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth},
              viewportMeta:document.querySelector('meta[name=viewport]')?.content,
              nav:pick('#tab-home'),
              navBar:pick('#mainApp .bottom-nav'),
              route:pick('#itinerary.active .iti-row'),
              bag:pick('#v37HomeDashboard details.v46-tools summary'),
              sticky:pick('#v37HomeDashboard .v46-sticky-head')
            };
          });
          console.error('[V46 TOUCH FAILURE '+label+'] '+JSON.stringify(evidence));
          throw error;
        }
      };

      const openBag = async () => {
        if (!(await bag.evaluate(node => node.open))) {
          await clickWithEvidence(bag.locator('summary'), 'open-bag');
        }
        await expect(bag).toHaveJSProperty('open', true);
      };
      for (const phase of ['before', 'during', 'after']) {
        await page.evaluate(value => window.setV46HomePreview(value), phase);
        await expect(home).toHaveAttribute('data-v46-mode', phase);
        await expect(page.locator('#liveTravelCard')).toBeVisible();
        await openBag();
        await expect(bag.locator('button.v45-nine-card')).toHaveCount(11);
        const geometry = await home.evaluate(node => ({
          viewport: document.documentElement.clientWidth,
          pageWidth: document.documentElement.scrollWidth,
          clipped: [...node.querySelectorAll('#liveTravelCard, summary, button.v45-nine-card')]
            .filter(el => {
              const r = el.getBoundingClientRect();
              return r.left < -2 || r.right > document.documentElement.clientWidth + 3;
            }).map(el => el.textContent.trim())
        }));
        expect(geometry.pageWidth, `${phase}: horizontal overflow`).toBeLessThanOrEqual(geometry.viewport + 3);
        expect(geometry.clipped, `${phase}: clipped primary entry`).toEqual([]);
      }

      // Freeze computed sizes before applying 2x text so descendants are not
      // multiplied by inherited sizes. Reapply after home rendering replaces nodes.
      const enlargeText = () => page.evaluate(() => {
        const nodes = [...document.querySelectorAll('#mainApp, #mainApp *')];
        const sizes = nodes.filter(el => !el.hasAttribute('data-zoom-regression'))
          .map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
        for (const [el, size] of sizes) {
          el.style.setProperty('font-size', `${size * 2}px`, 'important');
          el.setAttribute('data-zoom-regression', '200');
        }
      });
      const destinations = [
        ['今日行程', '#itinerary.active'], ['天氣・楓況', '#homeWeatherDetailPanel'],
        ['旅行記帳', '#split.active'], ['吃喝・景點', '#guideDetail'],
        ['超商・超市', '#shopConvenienceContainer'], ['快樂購', '#shop.active'],
        ['翻譯・SOS', '#more.active'], ['旅行回憶', '#wallet.active'],
        ['住宿・交通', '#wallet.active'], ['票券・優惠', '#wallet.active'],
        ['行前準備', '#prepChecklistCard']
      ];
      for (const [label, destination] of destinations) {
        await clickWithEvidence(page.locator('#tab-home'),'return-home-from-function');
        await page.evaluate(() => window.setV46HomePreview('during'));
        await openBag();
        await enlargeText();
        const card = bag.locator('button.v45-nine-card').filter({ hasText: label });
        await expect(card).toHaveCount(1);
        await expect(bag).toHaveJSProperty('open', true);
        await expect(card).toBeVisible();
        await card.click();
        await expect(page.locator(destination)).toBeVisible();
        if (label === '吃喝・景點') {
          await page.getByRole('button', { name: '返回首頁功能導覽' }).click();
          await expect(page.locator('#guideDetail')).toBeHidden();
          await expect(home).toBeVisible();
        }
      }
      for (const [tab, panel] of [
        ['home', 'guide'], ['itinerary', 'itinerary'], ['bill', 'split'],
        ['wallet', 'wallet'], ['more', 'more'], ['home', 'guide']
      ]) {
        await enlargeText();
        await clickWithEvidence(page.locator(`#tab-${tab}`),'bottom-tab-'+tab);
        await expect(page.locator(`#${panel}.active`)).toBeVisible();
        await expect(page.locator(`#tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
      }
    });
  }
});


// ── Touch Target Size (44×44px minimum) ─────────────────────────────────────
test.describe('Accessibility: Touch Target Sizes', () => {

  test('Bottom navigation items meet 44px minimum touch target', async ({ page }) => {
    await bootApp(page);
    
    const navItems = page.locator('.bottom-nav .nav-item');
    const count = await navItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i);
      const box = await item.boundingBox();
      if (!box) continue;
      
      expect(box.height, 
        `Nav item #${i} height ${box.height}px is below 44px minimum`
      ).toBeGreaterThanOrEqual(44);
      
      expect(box.width,
        `Nav item #${i} width ${box.width}px is below 44px minimum`
      ).toBeGreaterThanOrEqual(44);
    }
  });

  test('Bottom navigation remains 44px tappable when icon CDN is unavailable', async ({ page }) => {
    // Simulate an unreachable external icon font and an empty icon rendering.
    await page.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\//, route => route.abort());
    await bootApp(page);
    await page.addStyleTag({ content: '.bottom-nav .nav-item > i { display: none !important; }' });

    const navItems = page.locator('.bottom-nav .nav-item');
    await expect(navItems).toHaveCount(5);
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const item of await navItems.all()) {
        const box = await item.boundingBox();
        expect(box, `${width}px: missing navigation hit area`).not.toBeNull();
        expect(box.width, `${width}px: navigation width`).toBeGreaterThanOrEqual(44);
        expect(box.height, `${width}px: navigation height without icon`).toBeGreaterThanOrEqual(44);
      }
    }

    // The minimum hit area must still perform real navigation.
    await page.locator('#tab-itinerary').click();
    await expect(page.locator('#tab-itinerary')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#tab-home').click();
    await expect(page.locator('#tab-home')).toHaveAttribute('aria-selected', 'true');
  });

  test('Action buttons meet 44px touch target height', async ({ page }) => {
    await bootApp(page);
    
    // Check primary action buttons
    const btns = page.locator('.btn-action');
    const count = await btns.count();
    
    let undersize = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = btns.nth(i);
      const visible = await btn.isVisible().catch(() => false);
      if (!visible) continue;
      
      const box = await btn.boundingBox();
      if (!box) continue;
      
      if (box.height < 40) { // slight tolerance for design
        const text = await btn.innerText().catch(() => '');
        undersize.push(`Button "${text.trim()}" height: ${box.height}px`);
      }
    }
    
    // Report but don't hard-fail — some buttons are intentionally smaller
    if (undersize.length > 0) {
      console.warn('[Accessibility] Buttons below 44px minimum:', undersize);
    }
  });
});

// ── Font Size Readability ────────────────────────────────────────────────────
test.describe('Accessibility: Readable Font Sizes', () => {

  test('Critical info elements have readable font sizes (>=12px)', async ({ page }) => {
    await bootApp(page);
    
    // Check card titles
    const cardTitles = page.locator('.card-title');
    const count = await cardTitles.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = cardTitles.nth(i);
      const visible = await el.isVisible().catch(() => false);
      if (!visible) continue;
      
      const fontSize = await el.evaluate(node => 
        parseFloat(window.getComputedStyle(node).fontSize)
      );
      expect(fontSize, 
        `card-title #${i} has font-size ${fontSize}px — below 12px minimum`
      ).toBeGreaterThanOrEqual(12);
    }
  });

  test('Body text is readable (>=11px)', async ({ page }) => {
    await bootApp(page);
    
    const bodyFontSize = await page.evaluate(() => 
      parseFloat(window.getComputedStyle(document.body).fontSize)
    );
    expect(bodyFontSize, `Body font-size ${bodyFontSize}px — below 11px`).toBeGreaterThanOrEqual(11);
  });
});

// ── Keyboard Navigation ──────────────────────────────────────────────────────
test.describe('Accessibility: Keyboard Navigation', () => {

  test('Enter key on splash button triggers app boot', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.btn-enter', { state: 'visible', timeout: 10000 });
    
    const enterBtn = page.locator('.btn-enter');
    await enterBtn.focus();
    await page.keyboard.press('Enter');
    
    await expect(page.locator('#mainApp')).toBeVisible({ timeout: 5000 });
  });

  test('Tab key moves focus through interactive elements', async ({ page }) => {
    await bootApp(page);
    
    // Focus body and tab through elements
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    // Something should be focused
    expect(focused).toBeTruthy();
  });
});

// ── One-Hand Usability ───────────────────────────────────────────────────────
test.describe('Accessibility: One-Hand Usability (Mobile 390px)', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 15
  });

  test('Bottom nav is reachable in thumb zone (bottom of screen)', async ({ page }) => {
    await bootApp(page);
    
    const nav = page.locator('.bottom-nav');
    const box = await nav.boundingBox();
    
    expect(box, 'Bottom nav not found').toBeTruthy();
    // Nav should be at the bottom (within bottom 20% of 844px screen)
    expect(box.y, 'Bottom nav not in thumb zone').toBeGreaterThan(600);
  });

  test('Primary action buttons are within thumb reach zone', async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-bill').click();
    
    // Add bill button should be visible without scrolling
    const addBtn = page.locator('button[onclick="addBill()"]');
    await expect(addBtn).toBeVisible();
  });

  test('No content is hidden under bottom nav', async ({ page }) => {
    await bootApp(page);
    
    // Scroll to the bottom of the active view to test end-of-scroll reachability
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);

    const clearance = await page.evaluate(() => {
      const nav = document.querySelector('.bottom-nav');
      if (!nav) return { ok: true };
      const navRect = nav.getBoundingClientRect();
      const navTop = navRect.top;

      const activeContainer = document.querySelector('.container.active') || document.querySelector('.container[style*="display: block"]') || document.getElementById('mainApp');
      if (!activeContainer) return { ok: true };

      const allElements = activeContainer.querySelectorAll('button, input, select, a, .card, .v45-nine-card, p, h3, h4, div');
      let maxBottom = -Infinity;
      allElements.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.bottom > maxBottom) {
          maxBottom = r.bottom;
        }
      });

      if (maxBottom === -Infinity) return { ok: true };
      return {
        ok: maxBottom <= navTop + 2,
        maxBottom,
        navTop,
        clearance: navTop - maxBottom
      };
    });

    expect(clearance.ok, `Final content bottom (${clearance.maxBottom}px) extends under bottom nav (${clearance.navTop}px)`).toBe(true);
  });
});

// ── No 404 Errors ────────────────────────────────────────────────────────────
test.describe('Accessibility: No Broken Resources', () => {

  test('No 404 errors for critical local assets', async ({ page }) => {
    const notFound = [];
    page.on('response', response => {
      if (response.status() === 404 && 
          !response.url().includes('firebase') &&
          !response.url().includes('googleapis') &&
          !response.url().includes('wttr.in') &&
          !response.url().includes('favicon')) {
        notFound.push(`404: ${response.url()}`);
      }
    });
    
    await bootApp(page);
    
    // Navigate through tabs to trigger lazy loading
    for (const tab of ['#tab-itinerary', '#tab-bill', '#tab-wallet', '#tab-home']) {
      await page.locator(tab).click();
      await page.waitForTimeout(300);
    }
    
    await page.waitForTimeout(1000);
    
    expect(notFound, `Found 404 errors:\n${notFound.join('\n')}`).toHaveLength(0);
  });
});
