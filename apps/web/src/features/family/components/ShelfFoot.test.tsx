import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ShelfFoot } from './ShelfFoot';

afterEach(() => vi.unstubAllGlobals());

it('loads the next batch by itself as the foot comes near, or from its button', async () => {
  let reached: IntersectionObserverCallback = () => {};
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        reached = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  const onMore = vi.fn();
  render(<ShelfFoot state="more" total={40} onMore={onMore} />);
  reached([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  expect(onMore).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button', { name: '加载更多' }));
  expect(onMore).toHaveBeenCalledTimes(2);
});

it('cannot be pressed while a batch loads', () => {
  render(<ShelfFoot state="loading" total={40} onMore={() => {}} />);
  expect(screen.getByRole('button', { name: '加载更多' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('正在加载下一批书');
});

it('says a batch did not load and offers it again', () => {
  render(<ShelfFoot state="failed" total={40} onMore={() => {}} />);
  expect(screen.getByRole('alert')).toHaveTextContent('这一批没加载出来');
  expect(screen.getByRole('button', { name: '加载更多' })).toBeEnabled();
});

it('says when every book is shown', () => {
  render(<ShelfFoot state="done" total={40} onMore={() => {}} />);
  expect(screen.getByRole('status')).toHaveTextContent('一共 40 本，都在这里了');
  expect(screen.queryByRole('button')).toBeNull();
});
