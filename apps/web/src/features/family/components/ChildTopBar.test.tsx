import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { ChildTopBar } from './ChildTopBar';

function bar(onLogout = vi.fn(), leaving = false) {
  render(
    <MemoryRouter>
      <ChildTopBar nickname="小米" leaving={leaving} onLogout={onLogout} />
      <p>别处</p>
    </MemoryRouter>,
  );
}

it('leads home from the brand and has no other way to another page', () => {
  bar();
  expect(screen.getByRole('link', { name: '小小探索家首页' })).toHaveAttribute('href', '/');
  expect(screen.getAllByRole('link')).toHaveLength(1);
});

it("opens the child's menu with one item that signs the child out", async () => {
  const onLogout = vi.fn();
  bar(onLogout);
  const me = screen.getByRole('button', { name: /小米/ });
  expect(me).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(me);
  expect(me).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  await userEvent.click(screen.getByRole('menuitem', { name: '退出登录' }));
  expect(onLogout).toHaveBeenCalledOnce();
});

it('closes the menu on Escape or a press elsewhere', async () => {
  bar();
  await userEvent.click(screen.getByRole('button', { name: /小米/ }));
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /小米/ }));
  await userEvent.click(screen.getByText('别处'));
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('waits while signing out', async () => {
  bar(vi.fn(), true);
  await userEvent.click(screen.getByRole('button', { name: /小米/ }));
  expect(screen.getByRole('menuitem', { name: '正在退出…' })).toBeDisabled();
});
