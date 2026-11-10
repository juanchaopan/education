import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { accountArt } from '../../../test/account-art';
import { RecoveryPage } from './RecoveryPage';
import { ResetPasswordPage } from './ResetPasswordPage';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});
function setup(component: React.ReactNode) {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
it('does not expose provider messages or claim a mailbox exists', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ status: 'requested' }));
  vi.stubGlobal('fetch', fetcher);
  const client = setup(<RecoveryPage art={accountArt} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('注册邮箱'), 'parent@example.test');
  await user.click(screen.getByRole('button', { name: '发送恢复邮件' }));
  expect(await screen.findByRole('status')).toHaveTextContent('如果该邮箱已注册');
  expect(fetcher).toHaveBeenCalledOnce();
  expect(
    client
      .getMutationCache()
      .getAll()
      .every((m) => m.state.variables === undefined),
  ).toBe(true);
});
it('folds the mail rules away until the parent asks for them', async () => {
  setup(<RecoveryPage art={accountArt} />);
  const rule = screen.getByText(/链接 30 分钟有效/);
  expect(rule).not.toBeVisible();
  await userEvent.click(screen.getByText('邮件规则'));
  expect(rule).toBeVisible();
});
it('strips the bearer fragment before interaction, requires password confirmation and clears sensitive mutation state', async () => {
  const token = 'r'.repeat(43);
  window.history.replaceState({}, '', '/family/reset#token=' + token);
  const fetcher = vi.fn().mockResolvedValue(Response.json({ status: 'reset' }));
  vi.stubGlobal('fetch', fetcher);
  const client = setup(<ResetPasswordPage art={accountArt} />);
  const user = userEvent.setup();
  expect(window.location.hash).toBe('');
  expect(fetcher).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('新密码', { exact: true }), 'my new private test phrase');
  await user.type(screen.getByLabelText('再次输入新密码'), 'a different test phrase');
  await user.click(screen.getByRole('button', { name: '确认设置新密码' }));
  expect(screen.getByRole('alert')).toHaveTextContent('两次密码不一致');
  expect(fetcher).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('再次输入新密码'));
  await user.type(screen.getByLabelText('再次输入新密码'), 'my new private test phrase');
  await user.click(screen.getByRole('button', { name: '确认设置新密码' }));
  expect(await screen.findByRole('status')).toHaveTextContent('旧登录状态已失效');
  expect(screen.queryByLabelText('新密码', { exact: true })).toBeNull();
  expect(
    client
      .getMutationCache()
      .getAll()
      .every((m) => m.state.variables === undefined),
  ).toBe(true);
});
