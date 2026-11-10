// 用 Playwright 录下两段讲解原型：打开页面，停一下，点「播放讲解」，录完整段动画，
// 并在动画中途截一张图。视频和截图写进 docs/evidence/173/。
// 运行：node spike/173/proto/record.mjs（原型页需已在 http://127.0.0.1:6173 运行）
import { renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const out = fileURLToPath(new URL('../../../docs/evidence/173/', import.meta.url));
const size = { width: 1280, height: 860 };
const demos = [
  { name: 'demo-glow-groups', query: 'glow', stillAt: 2900 },
  { name: 'demo-replay-weighing', query: 'replay', stillAt: 2600 },
];

const browser = await chromium.launch();
try {
  for (const { name, query, stillAt } of demos) {
    const context = await browser.newContext({ viewport: size, recordVideo: { dir: out, size } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:6173/?demo=${query}`);
    await page.getByTestId('play-demo').waitFor();
    await page.waitForTimeout(1500);
    await page.getByTestId('play-demo').click();
    await page.waitForTimeout(stillAt);
    await page.screenshot({ path: `${out}${name}.png` });
    await page.waitForTimeout(6000 - stillAt);
    const video = page.video();
    await context.close();
    if (video) renameSync(await video.path(), `${out}${name}.webm`);
    console.log(`recorded ${name}`);
  }
} finally {
  await browser.close();
}
