import {test,expect} from '@playwright/test';
import {bootApp} from './helpers/boot.js';

for (const width of [360,390]) {
  test(`V46 S25: weather opens immediately beneath sticky summary at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});
    await bootApp(page);
    await page.evaluate(()=>window.scrollTo(0,400));
    const weatherButton=page.locator('#v37HomeDashboard .v46-sticky-head.is-compact .v46-mini-weather');
    await expect(weatherButton).toBeVisible();
    const scrollBefore=await page.evaluate(()=>window.scrollY);
    await weatherButton.click();
    const panel=page.locator('#v37HomeDashboard .v46-sticky-head > #homeWeatherDetailPanel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('釜山');
    await expect(panel).toContainText('慶州');
    const geometry=await page.evaluate(()=>{
      const p=document.querySelector('#homeWeatherDetailPanel').getBoundingClientRect();
      const head=document.querySelector('#v37HomeDashboard .v46-sticky-head').getBoundingClientRect();
      return {top:p.top,headBottom:head.bottom,viewport:innerHeight,scrollY:window.scrollY,documentHeight:document.documentElement.scrollHeight};
    });
    expect(geometry.top).toBeGreaterThanOrEqual(geometry.headBottom-3);
    expect(geometry.top).toBeLessThan(geometry.viewport*.55);
    expect(Math.abs(geometry.scrollY-scrollBefore),'Weather must not jump to the bottom').toBeLessThan(8);
    await expect(page.locator('#v37HomeDashboard .v46-mini-weather')).toHaveAttribute('aria-expanded','true');
    await panel.getByRole('button',{name:'關閉天氣詳情'}).click();
    await expect(panel).toHaveCount(0);
  });

  test(`V46 S25: bag scrolls independently without dragging the homepage at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});
    await bootApp(page);
    await page.evaluate(()=>window.scrollTo(0,360));
    const bag=page.locator('#v37HomeDashboard details.v46-inline-tools');
    await bag.locator('summary').click();
    await expect(bag).toHaveAttribute('open','');
    await expect(bag.locator('button.v45-nine-card')).toHaveCount(11);
    const state=await page.evaluate(()=>({
      scrollY:window.scrollY,
      panelScrollable:(()=>{
        const p=document.querySelector('#v37HomeDashboard .v46-inline-tools > .v46-tools-content');
        return p.scrollHeight>p.clientHeight;
      })(),
      overscroll:getComputedStyle(document.querySelector('#v37HomeDashboard .v46-inline-tools > .v46-tools-content')).overscrollBehaviorY
    }));
    expect(state.panelScrollable).toBe(true);
    expect(state.overscroll).toBe('contain');
    await expect(page.locator('#v37HomeDashboard .v46-bag-backdrop')).toBeVisible();
    // Scroll the only intended scroll container directly. Calling
    // scrollIntoView on the last child may also move the document even
    // when user touch scrolling would not, so it is not a valid background
    // gesture test. The visible backdrop separately absorbs background taps.
    await bag.locator('.v46-tools-content').evaluate(p=>{p.scrollTop=p.scrollHeight;});
    const scrollResult=await page.evaluate(()=>{
      const p=document.querySelector('#v37HomeDashboard .v46-inline-tools > .v46-tools-content');
      return {scrollTop:p.scrollTop,maxScroll:p.scrollHeight-p.clientHeight};
    });
    expect(scrollResult.maxScroll).toBeGreaterThan(0);
    expect(scrollResult.scrollTop,'Bag must actually scroll to the final action').toBeGreaterThan(0);
    const bgScroll=await page.evaluate(()=>window.scrollY);
    expect(Math.abs(bgScroll-state.scrollY),'Background must not scroll with bag').toBeLessThan(8);
    await bag.locator('summary').click();
    await expect(bag).not.toHaveAttribute('open','');
    await expect(page.locator('#v37HomeDashboard .v46-bag-backdrop')).toBeHidden();
  });
}
