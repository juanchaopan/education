import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SignInTabs } from './SignInTabs';

it('marks the chosen tab and labels its panel by it', () => {
  render(
    <SignInTabs tab="parent" onTab={vi.fn()}>
      <p>家长的表单</p>
    </SignInTabs>,
  );
  expect(screen.getByRole('tablist', { name: '登录' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '家长登录' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: '孩子登录' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByRole('tabpanel', { name: '家长登录' })).toHaveTextContent('家长的表单');
});

it('chooses a tab by a press and by the arrow keys', async () => {
  const onTab = vi.fn();
  render(
    <SignInTabs tab="child" onTab={onTab}>
      <p>孩子的表单</p>
    </SignInTabs>,
  );
  await userEvent.click(screen.getByRole('tab', { name: '家长登录' }));
  expect(onTab).toHaveBeenLastCalledWith('parent');
  screen.getByRole('tab', { name: '孩子登录' }).focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(onTab).toHaveBeenLastCalledWith('parent');
  await userEvent.keyboard('{ArrowRight}');
  expect(onTab).toHaveBeenLastCalledWith('parent');
});
