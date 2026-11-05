import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChildRegistrationPage } from './ChildRegistrationPage';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('reuses the request on network failure, clears secrets on success and never stores inputs', async () => {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, init) => {
      calls.push(init.body);
      if (calls.length === 1) throw new Error('network interrupted');
      return Response.json({
        status: 'registered',
        familyCode: 'ABCD-EFGH-JKMN',
        nickname: '小明',
      });
    }),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ChildRegistrationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('家长给我的 KEY'), 'ABCD-EFGH-JKMN-PQRS');
  await user.type(screen.getByLabelText('我的昵称'), '小明');
  const pin = screen.getByLabelText('设置六位数字 PIN');
  expect(pin).toHaveAttribute('autocomplete', 'new-password');
  await user.type(pin, '018274');
  await user.click(screen.getByRole('button', { name: '加入家庭' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法确认结果');
  expect(calls).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: '加入家庭' }));
  expect(await screen.findByRole('heading', { name: '你已加入家庭！' })).toBeVisible();
  expect(calls[0]).toBe(calls[1]);
  expect(screen.getByLabelText('我的家庭码')).toHaveTextContent('ABCD-EFGH-JKMN');
  expect(screen.queryByDisplayValue('018274')).toBeNull();
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});
