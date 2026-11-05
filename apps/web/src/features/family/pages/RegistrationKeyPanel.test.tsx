import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegistrationKeyPanel } from './RegistrationKeyPanel';
const key = {
  id: 'bb51e85f-1306-4bcd-9811-35e27c6e9638',
  status: 'active',
  expiresAt: '2030-01-01T00:00:00.000Z',
};
const value = 'ABCD-EFGH-JKMN-PQRS';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(recent = true, familyCode?: string) {
  let generated = false;
  let revoked = false;
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      if (_url.endsWith('/revoke')) {
        revoked = true;
        return new Response(null, { status: 204 });
      }
      generated = true;
      return Response.json({ key, value });
    }
    return Response.json({
      key: generated ? { ...key, status: revoked ? 'revoked' : 'active' } : null,
      reauthenticationRequired: !recent,
      ...(familyCode ? { familyCode } : {}),
    });
  });
  vi.stubGlobal('fetch', fetcher);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RegistrationKeyPanel csrf={'a'.repeat(43)} />
    </QueryClientProvider>,
  );
  return fetcher;
}
it('shows the key once, clears raw text on refresh, and revokes without automatic retries', async () => {
  const user = userEvent.setup();
  const fetcher = setup();
  await user.click(await screen.findByRole('button', { name: '生成注册 KEY' }));
  expect(await screen.findByText(value)).toBeVisible();
  expect(screen.getByText(/只在这次生成后显示/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: '复制注册 KEY' }));
  expect(await navigator.clipboard.readText()).toBe(value);
  await user.click(screen.getByRole('button', { name: '刷新 KEY 状态' }));
  expect(screen.queryByText(value)).toBeNull();
  await user.click(await screen.findByRole('button', { name: '撤销注册 KEY' }));
  expect(await screen.findByText('已撤销')).toBeVisible();
  expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(2);
});
it('requires current-password reauthentication before key mutations', async () => {
  setup(false);
  expect(await screen.findByLabelText('确认家长密码')).toHaveAttribute(
    'autocomplete',
    'current-password',
  );
  expect(screen.getByRole('button', { name: '生成注册 KEY' })).toBeDisabled();
});

it('keeps the assigned family code visible and copyable without generating another KEY', async () => {
  const user = userEvent.setup();
  const fetcher = setup(true, 'ABCD-EFGH-JKMN');
  expect(await screen.findByLabelText('家庭码')).toHaveTextContent('ABCD-EFGH-JKMN');
  await user.click(screen.getByRole('button', { name: '复制家庭码' }));
  expect(await navigator.clipboard.readText()).toBe('ABCD-EFGH-JKMN');
  await user.click(screen.getByRole('button', { name: '刷新 KEY 状态' }));
  expect(await screen.findByLabelText('家庭码')).toHaveTextContent('ABCD-EFGH-JKMN');
  expect(fetcher.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true);
});
