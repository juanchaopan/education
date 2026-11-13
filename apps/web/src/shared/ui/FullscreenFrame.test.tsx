import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { FullscreenFrame } from './FullscreenFrame';

it('puts a named back button first, before what the page shows', async () => {
  const back = vi.fn();
  render(
    <FullscreenFrame waiting={false} onBack={back}>
      <button type="button">开始短片</button>
    </FullscreenFrame>,
  );
  await userEvent.tab();
  expect(screen.getByRole('button', { name: '返回' })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(back).toHaveBeenCalledOnce();
  expect(screen.getByRole('main')).toContainElement(
    screen.getByRole('button', { name: '开始短片' }),
  );
});

it('keeps the page’s mark beside the back button, while waiting too', () => {
  const { rerender } = render(
    <FullscreenFrame waiting={false} onBack={() => {}} mark={<span>预览</span>}>
      <p>短片</p>
    </FullscreenFrame>,
  );
  const button = screen.getByRole('button', { name: '返回' });
  expect(button.parentElement).toContainElement(screen.getByText('预览'));
  rerender(
    <FullscreenFrame waiting onBack={() => {}} mark={<span>预览</span>}>
      <p>短片</p>
    </FullscreenFrame>,
  );
  expect(screen.getByText('预览')).toBeVisible();
});

it('says, to the eye and to a screen reader, that the page leaves once it has saved', () => {
  render(
    <FullscreenFrame waiting onBack={() => {}}>
      <p>短片</p>
    </FullscreenFrame>,
  );
  expect(screen.getByRole('button', { name: '正在保存，好了就返回' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  expect(screen.getByText('正在保存，好了就返回')).toBeVisible();
});
