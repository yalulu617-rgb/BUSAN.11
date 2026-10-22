import {test,expect} from '@playwright/test';
import {bootApp} from './helpers/boot.js';

// Never run these screenshot tests on production or a normal Firebase app.
test.skip(process.env.V46_SANDBOX_BUILD !== '1', 'Runs only on the generated Firebase-isolated preview');

for (const width of [360,390]) {
  test(`V46 disposable owner preview is usable at ${width}px without any production database`, async ({page},testInfo) => {
    await page.setViewportSize({width,height:844});
    const outbound=[];
    page.on('request',req=>{
      if (/firebaseio\\.com|firebasedatabase\\.app|api\\.imgbb\\.com/i.test(req.url()))
        outbound.push(req.url());
    });
    await bootApp(page);
    await expect(page.locator('#v46-sandbox-notice')).toBeVisible();
    await expect(page.locator('#mainApp')).toBeVisible();
    await expect(page.locator('details.v46-tools')).toHaveCount(1);
    await expect(page.locator('.v45-nine-card')).toHaveCount(11);
    await expect.poll(async()=>page.evaluate(()=>window.NetworkEngine?._db?.__testOnly === true)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`v46-owner-mobile-${width}.png`),fullPage:true});
    await page.locator('details.v46-tools').evaluate(el=>el.open=true);
    await expect(page.locator('details.v46-tools')).toHaveAttribute('open','');
    await page.screenshot({path:testInfo.outputPath(`v46-owner-tools-${width}.png`),fullPage:true});
    expect(outbound).toEqual([]);
  });
}
