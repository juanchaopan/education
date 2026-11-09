import { expect, test, type Page } from '@playwright/test';

// The site picks its theme by the device's local time: the day theme from
// 6:00 to 18:00, the night theme for the rest.
test.use({ timezoneId: 'Asia/Shanghai' });

const at = (time: string) => new Date(`2026-11-07T${time}+08:00`);
const theme = (page: Page) => page.locator('html');

test('the theme is set before the app runs, so the first paint already has it', async ({
  page,
}) => {
  // Without the app's own script, only the script in the page's head can set
  // the theme.
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.clock.setFixedTime(at('20:00:00'));
  await page.goto('/');
  await expect(theme(page)).toHaveAttribute('data-theme', 'night');
  await page.clock.setFixedTime(at('10:00:00'));
  await page.reload();
  await expect(theme(page)).toHaveAttribute('data-theme', 'day');
});

// Opens the child registration page shortly before 18:00 and fills a field,
// so a switch can be seen to leave what the child typed alone.
async function typeJustBeforeNightfall(page: Page) {
  await page.clock.install({ time: at('17:59:58') });
  await page.goto('/join');
  const key = page.getByLabel('家长给我的 KEY');
  await key.fill('ABCD-EFGH');
  await expect(theme(page)).toHaveAttribute('data-theme', 'day');
  return key;
}

test('at 18:00 an open page fades into the night theme without a reload or losing input', async ({
  page,
}) => {
  const key = await typeJustBeforeNightfall(page);
  let reloaded = false;
  page.on('framenavigated', () => (reloaded = true));
  await page.clock.runFor(2500);
  await expect(theme(page)).toHaveAttribute('data-theme', 'night');
  await expect(theme(page)).toHaveAttribute('data-theme-switching', '');
  await page.clock.runFor(1300);
  await expect(theme(page)).not.toHaveAttribute('data-theme-switching');
  await expect(key).toHaveValue('ABCD-EFGH');
  expect(reloaded).toBe(false);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the theme switches at once, without a fade', async ({ page }) => {
    const key = await typeJustBeforeNightfall(page);
    await page.clock.runFor(2500);
    await expect(theme(page)).toHaveAttribute('data-theme', 'night');
    await expect(theme(page)).not.toHaveAttribute('data-theme-switching');
    await expect(key).toHaveValue('ABCD-EFGH');
  });
});
