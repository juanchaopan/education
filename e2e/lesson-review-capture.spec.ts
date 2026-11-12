import { expect, test } from '@playwright/test';
import { otherFrameSize, reviewBrowser, screencast } from '../scripts/lesson-review-capture.mjs';

// The review recording captures what a child sees: the whole viewport in
// every frame, also once the lesson has gone full screen, as it does when the
// child starts it. Chromium runs as `npm run lesson:review` launches it.

const { viewport, launchOptions } = reviewBrowser;

test.skip(({ isMobile }) => isMobile, 'Lessons are recorded for review in desktop Chromium');
test.use({ viewport, launchOptions });

// A page that goes full screen on a tap and redraws on every animation frame,
// so the screencast keeps sending frames.
const fullScreenOnTap = `<!doctype html>
<button style="position: fixed; inset: 40% 40%">开始</button>
<output></output>
<script>
  document.querySelector('button').onclick = () => document.documentElement.requestFullscreen();
  const output = document.querySelector('output');
  (function draw(count) {
    output.textContent = count;
    requestAnimationFrame(() => draw(count + 1));
  })(0);
</script>`;

test('every frame shows the whole viewport, before and after the page goes full screen', async ({
  page,
}) => {
  await page.setContent(fullScreenOnTap);
  const cast = await screencast(page);
  await expect.poll(() => cast.frames.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: '开始' }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  const fullScreenFrom = cast.frames.length;
  await expect.poll(() => cast.frames.length).toBeGreaterThan(fullScreenFrom + 5);
  await cast.stop();

  expect(otherFrameSize(cast.frames, cast.viewport)).toBeUndefined();
});
