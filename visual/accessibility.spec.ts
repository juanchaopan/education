import { expect, test, type Page } from '@playwright/test';
import { scrollsSideways, smallTargets } from './accessibility';
import { openPageState, pageStates, type PageState } from './pages';
import { controls } from './render';

const desktop = (project: string) => project === 'desktop';
const touch = (project: string) => project === 'phone' || project === 'tablet';

// Opens a page state for a check and, once the check has run, requires that
// the page asked the API only what the state plans for: otherwise the check
// ran against a different render than the baseline shows.
async function checkPageState(page: Page, state: PageState, check: (page: Page) => Promise<void>) {
  const unexpected = await openPageState(page, state);
  await check(page);
  expect(unexpected).toEqual([]);
}

// One check per page state, run in the projects named by `only`.
function eachPage(
  title: string,
  only: (project: string) => boolean,
  check: (page: Page) => Promise<void>,
) {
  for (const state of pageStates)
    test(`${state.name}: ${title}`, async ({ page }, testInfo) => {
      test.skip(!only(testInfo.project.name), 'checked in another viewport');
      await checkPageState(page, state, check);
    });
}

type Focus = { outline: string; width: number; visible: boolean } | 'repeated' | null;

// Moves focus one step with Tab and describes the newly focused element, or
// reports that focus came back to an element it already reached. Reached
// elements are marked in the page, so two alike controls never look the same.
async function tab(page: Page): Promise<Focus> {
  await page.keyboard.press('Tab');
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    if (element.dataset.visualTabStop) return 'repeated';
    element.dataset.visualTabStop = 'reached';
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      outline: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
      visible: box.width > 0 && box.height > 0,
    };
  });
}

// Every element the page puts in the tab order. The skip link counts even
// while it waits off screen for focus, and a radio group is one stop.
function tabStops(page: Page) {
  return page.evaluate((selector) => {
    const groups = new Set<string>();
    return [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => {
      if (!element.getClientRects().length && !element.matches('a[href^="#"]')) return false;
      if (!(element instanceof HTMLInputElement) || element.type !== 'radio') return true;
      if (groups.has(element.name)) return false;
      groups.add(element.name);
      return true;
    }).length;
  }, `${controls}:not([tabindex^="-"]):not(:disabled)`);
}

eachPage('Tab reaches every control with a clear focus ring', desktop, async (page) => {
  const expected = await tabStops(page);
  const reached = [];
  for (let step = 0; step <= expected; step++) {
    const focus = await tab(page);
    if (focus === null || focus === 'repeated') break;
    reached.push(focus);
  }
  expect(reached).toHaveLength(expected);
  const unclear = reached.filter((focus) => focus.outline === 'none' || focus.width < 2);
  expect(unclear).toEqual([]);
  expect(reached.every((focus) => focus.visible)).toBe(true);
});

test('the skip link is the first stop and moves focus to the main content', async ({
  page,
}, testInfo) => {
  test.skip(!desktop(testInfo.project.name), 'checked in another viewport');
  await checkPageState(page, pageStates[0]!, async () => {
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: '跳到主要内容' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  eachPage('nothing animates or transitions', desktop, async (page) => {
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('*')]
        .filter((element) => {
          const style = getComputedStyle(element);
          const durations = `${style.animationDuration},${style.transitionDuration}`;
          return durations.split(',').some((duration) => parseFloat(duration) > 0);
        })
        .map((element) => element.tagName),
    );
    expect(moving).toEqual([]);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});

eachPage('every control is big enough to tap', touch, async (page) => {
  expect(await smallTargets(page)).toEqual([]);
});

test('taps open the parent login and turn the child’s remember switch', async ({
  page,
}, testInfo) => {
  test.skip(!touch(testInfo.project.name), 'checked in another viewport');
  const signedOut = pageStates.find((state) => state.name === 'family-signed-out')!;
  await checkPageState(page, signedOut, async () => {
    await page.getByRole('button', { name: '已有账号？去登录' }).tap();
    await expect(page.getByLabel('登录邮箱')).toBeVisible();
    await page.getByRole('link', { name: '孩子空间' }).tap();
    const remember = page.getByRole('switch', { name: '在这台设备上记住家庭码和昵称' });
    const before = await remember.isChecked();
    await page.getByText('在这台设备上记住家庭码和昵称').tap();
    await expect(remember).toBeChecked({ checked: !before });
  });
});

// 320 CSS pixels is a 1280-pixel screen at 400% zoom; 640 pixels with the
// root text at 200% is that screen at 200% zoom with large text.
eachPage('reflows at 400% zoom and with 200% text', desktop, async (page) => {
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await scrollsSideways(page)).toBe(false);
  await page.setViewportSize({ width: 640, height: 720 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(await scrollsSideways(page)).toBe(false);
});
