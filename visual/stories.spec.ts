import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { expectAccessible } from './accessibility';
import { fixClock, waitForFonts, type Theme } from './render';

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
  'learning-lesson-question--too-short',
  'learning-spoken-answer--nothing-heard',
  'learning-narration-caption--sound-failed',
  'family-childlogin--try-again',
  '家庭-孩子注册--invalid-key',
  'features-family-components-loginform--error',
]);

// The shared parts that are also seen in the night theme. Every other story
// is seen in the day theme only.
const nightStories = new Set([
  '公共部件-按钮--primary',
  '公共部件-按钮--secondary',
  '公共部件-按钮--danger',
  '公共部件-图标按钮--ready',
  '公共部件-卡片--raised',
  '公共部件-输入框--with-hint',
  '公共部件-下拉选择--chosen',
  '公共部件-提示条--info',
  '公共部件-提示条--success',
  '公共部件-提示条--error',
  '学习界面-空状态--empty',
  '公共部件-加载--waiting',
  '公共部件-开关--on',
  '公共部件-图标--all-icons',
]);

test('the feedback and night states are all in Storybook', () => {
  const ids = new Set(stories.map((story) => story.id));
  const listed = [...feedbackStates, ...nightStories];
  expect(listed.filter((id) => !ids.has(id))).toEqual([]);
});

// Opens a story in a theme, checks it against its baseline and runs axe on it.
async function checkStory(page: Page, story: Entry, theme: Theme) {
  await fixClock(page, theme);
  await page.goto(
    `/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=theme:${theme}`,
  );
  const root = page.locator('#storybook-root');
  await expect(root.locator('> *').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await waitForFonts(page);
  if (feedbackStates.has(story.id))
    await expect(
      root.locator('[role="status"], [role="alert"]').filter({ hasText: /\S/ }).first(),
    ).toBeVisible();
  await expect(root).toHaveScreenshot(`${story.id}${theme === 'night' ? '--night' : ''}.png`);
  await expectAccessible(page, '#storybook-root');
}

for (const story of stories) {
  test(`${story.title} / ${story.name} looks like its reviewed baseline and passes WCAG checks`, async ({
    page,
  }) => {
    await checkStory(page, story, 'day');
  });
  if (nightStories.has(story.id))
    test(`${story.title} / ${story.name} at night looks like its reviewed baseline and passes WCAG checks`, async ({
      page,
    }) => {
      await checkStory(page, story, 'night');
    });
}
