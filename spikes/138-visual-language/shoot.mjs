import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')));
const out = path.join(root, 'shots');
const page0 = pathToFileURL(path.join(root, 'index.html')).href;
const themes = ['a', 'b', 'c'];
const screens = ['home', 'login', 'parent', 'lesson', 'kit'];
const viewports = {
  desktop: { width: 1280, height: 860, deviceScaleFactor: 1 },
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const browser = await chromium.launch();
for (const [name, viewport] of Object.entries(viewports)) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
  });
  const page = await context.newPage();
  for (const theme of themes) {
    for (const screen of screens) {
      if (name === 'phone' && screen === 'kit') continue;
      await page.goto(`${page0}?theme=${theme}&screen=${screen}`);
      await page.evaluate(() => document.documentElement.classList.add('static'));
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(150);
      const fullPage = !(screen === 'lesson' || screen === 'login' || (screen === 'parent' && name === 'phone'));
      await page.screenshot({ path: path.join(out, `${theme}-${screen}-${name}.jpg`), type: 'jpeg', quality: 80, fullPage });
    }
  }
  await context.close();
}
await browser.close();
console.log('done');
