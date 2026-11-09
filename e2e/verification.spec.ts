import { expect, test } from '@playwright/test';
const token = 'b'.repeat(43);
const session = {
  role: 'parent',
  email: 'parent@example.test',
  emailVerified: false,
  access: 'verification-only',
  csrfToken: 'a'.repeat(43),
};
test('mail link requires an explicit confirmation, strips the fragment and recovers from an expired link', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/v1/parents/verification/confirm', async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ token });
    await route.fulfill({
      status: calls === 1 ? 400 : 200,
      json: calls === 1 ? {} : { status: 'verified' },
    });
  });
  await page.goto(`/family/verify#token=${token}`);
  await expect(page.getByRole('button', { name: '确认验证邮箱' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  expect(calls).toBe(0);
  await page.getByRole('button', { name: '确认验证邮箱' }).click();
  await expect(page.getByRole('alert')).toContainText('验证链接已失效或已使用');
  await page.getByRole('button', { name: '确认验证邮箱' }).click();
  await expect(page.getByRole('status')).toContainText('邮箱验证成功');
  expect(calls).toBe(2);
});
test('authenticated family page reports provider acceptance without claiming verification', async ({
  page,
}, info) => {
  await page.route('**/api/v1/session', (r) => r.fulfill({ json: session }));
  let sent = false;
  await page.route('**/api/v1/parents/verification', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['x-csrf-token']).toBe(session.csrfToken);
      expect(route.request().postDataJSON()).toEqual({ action: 'send' });
      sent = true;
    }
    await route.fulfill({
      json: {
        enabled: true,
        status: sent ? 'accepted' : 'not-sent',
        retryAfter: sent ? 60 : 0,
        canRetry: false,
      },
    });
  });
  await page.goto('/family');
  await page.getByRole('button', { name: '发送验证邮件', exact: true }).click();
  await expect(page.getByText(/邮件服务商已接受请求/)).toBeVisible();
  await expect(page.getByText('待验证', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '重新发送（旧链接失效）' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath('verification-accepted.png'), fullPage: true });
});
