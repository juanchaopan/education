import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { expectAccessible } from './accessibility';
import { fixClock, waitForFonts } from './render';

// Every story of the built Storybook: the component states (normal, empty,
// loading, failed, long text, hearing a cue again) a page can show.
type Entry = { id: string; type: string; title: string; name: string };
const index = JSON.parse(
  readFileSync(new URL('../apps/web/storybook-static/index.json', import.meta.url), 'utf8'),
) as { entries: Record<string, Entry> };
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');

// States that tell a child or parent how an attempt went. Each one says so in
// words inside a live region, so the meaning never rests on colour alone.
const feedbackStates = new Set([
  'learning-drawing-board--with-region',
  'learning-drawing-board--uncertain',
  'learning-feedback-request--text-feedback',
  'learning-feedback-request--usage-limited',
  'learning-voice-input--unheard',
  'learning-narration-caption--sound-failed',
  'family-childlogin--try-again',
  '家庭-孩子注册--invalid-key',
  'features-family-components-loginform--error',
]);

test('the feedback states are all in Storybook', () => {
  const ids = new Set(stories.map((story) => story.id));
  expect([...feedbackStates].filter((id) => !ids.has(id))).toEqual([]);
});

for (const story of stories) {
  test(`${story.title} / ${story.name} looks like its reviewed baseline and passes WCAG checks`, async ({
    page,
  }) => {
    await fixClock(page);
    await page.goto(`/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`);
    const root = page.locator('#storybook-root');
    await expect(root.locator('> *').first()).toBeVisible();
    await waitForFonts(page);
    if (feedbackStates.has(story.id))
      await expect(
        root.locator('[role="status"], [role="alert"]').filter({ hasText: /\S/ }).first(),
      ).toBeVisible();
    await expect(root).toHaveScreenshot(`${story.id}.png`);
    await expectAccessible(page, '#storybook-root');
  });
}
