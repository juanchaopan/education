import { expect, test } from '@playwright/test';
const token = 'r'.repeat(43);
test('login links to recovery and identical receipts preserve privacy with explicit retry and resend', async ({
  page,
}) => {
  await page.route('**/api/v1/session', (r) => r.fulfill({ status: 401, json: {} }));
  const actions: string[] = [];
  await page.route('**/api/v1/parents/recovery', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.email).toBe('parent@example.test');
    actions.push(body.action);
    expect(route.request().headers()['x-education-request']).toBe('session');
    await route.fulfill({ json: { status: 'requested' } });
  });
  await page.goto('/family');
  await page.getByRole('button', { name: '已有账号？去登录' }).click();
  await page.getByRole('link', { name: '忘记密码？通过邮箱找回' }).click();
  await page.getByLabel('注册邮箱', { exact: true }).fill('parent@example.test');
  await page.getByRole('button', { name: '发送恢复邮件', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('如果该邮箱已注册');
  await page.getByRole('button', { name: '重试同一封邮件' }).click();
  await expect(page.getByRole('button', { name: '重试同一封邮件' })).toBeEnabled();
  await page.getByRole('button', { name: '重新发送（旧链接失效）' }).click();
  await expect(page.getByRole('button', { name: '重新发送（旧链接失效）' })).toBeEnabled();
  expect(actions).toEqual(['send', 'retry', 'resend']);
});
test('opening a recovery link never resets automatically, removes the fragment and validates confirmation', async ({
  page,
}, info) => {
  let calls = 0;
  await page.route('**/api/v1/parents/recovery/confirm', async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({
      token,
      password: 'my new private test phrase',
    });
    await route.fulfill({ json: { status: 'reset' } });
  });
  await page.goto(`/family/reset#token=${token}`);
  await expect(page.getByRole('heading', { name: '设置新的家长密码' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  expect(calls).toBe(0);
  await page.getByLabel('新密码', { exact: true }).fill('my new private test phrase');
  await page.getByLabel('再次输入新密码').fill('a different test phrase');
  await page.getByRole('button', { name: '确认设置新密码' }).click();
  await expect(page.getByRole('alert')).toContainText('两次密码不一致');
  expect(calls).toBe(0);
  await page.getByLabel('再次输入新密码').fill('my new private test phrase');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('reset-form.png'), fullPage: true });
  await page.getByRole('button', { name: '确认设置新密码' }).click();
  await expect(page.getByRole('status')).toContainText('旧登录状态已失效');
  expect(await page.locator('input[type=password]').count()).toBe(0);
  expect(calls).toBe(1);
});
test('used links and network uncertainty have a recovery path and do not retry mutations automatically', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/v1/parents/recovery/confirm', async (route) => {
    calls++;
    await route.fulfill({ status: 400, json: { message: 'private backend detail' } });
  });
  await page.goto(`/family/reset#token=${token}`);
  await page.getByLabel('新密码', { exact: true }).fill('my new private test phrase');
  await page.getByLabel('再次输入新密码').fill('my new private test phrase');
  await page.getByRole('button', { name: '确认设置新密码' }).click();
  await expect(page.getByRole('alert')).toContainText('恢复链接已失效');
  expect(calls).toBe(1);
  await page.getByRole('link', { name: '重新申请恢复邮件' }).click();
  await page.route('**/api/v1/parents/recovery', async (route) => {
    calls++;
    await route.abort();
  });
  await page.getByLabel('注册邮箱', { exact: true }).fill('parent@example.test');
  await page.getByRole('button', { name: '发送恢复邮件', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('结果尚未确定');
  expect(calls).toBe(2);
});
