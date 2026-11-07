import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { NarrationStatus } from '../interaction/narration';
import { NarrationCaption } from './NarrationCaption';

const text = '把十二个苹果平均分给三只小兔。';

function show(status: NarrationStatus) {
  const handlers = { onReplay: vi.fn(), onPause: vi.fn(), onResume: vi.fn() };
  render(<NarrationCaption text={text} status={status} {...handlers} />);
  return handlers;
}

const region = () => screen.getByRole('region', { name: '这一步要做什么' });

it('shows only the words when the step has no sound', () => {
  show('silent');
  expect(region()).toHaveTextContent(text);
  expect(screen.queryByRole('button')).toBeNull();
});

it('lets the child hear the step again once it has been read', () => {
  const { onReplay } = show('ready');
  fireEvent.click(screen.getByRole('button', { name: '再听一遍' }));
  expect(onReplay).toHaveBeenCalledOnce();
});

it('lets the child pause or restart while the step is being read', () => {
  const { onPause, onReplay } = show('playing');
  fireEvent.click(screen.getByRole('button', { name: '暂停' }));
  fireEvent.click(screen.getByRole('button', { name: '从头听' }));
  expect(onPause).toHaveBeenCalledOnce();
  expect(onReplay).toHaveBeenCalledOnce();
});

it('lets the child continue or restart a paused step', () => {
  const { onResume, onReplay } = show('paused');
  fireEvent.click(screen.getByRole('button', { name: '继续' }));
  fireEvent.click(screen.getByRole('button', { name: '从头听' }));
  expect(onResume).toHaveBeenCalledOnce();
  expect(onReplay).toHaveBeenCalledOnce();
});

it('keeps the words and says so when the sound did not come out', () => {
  const { onReplay } = show('failed');
  expect(region()).toHaveTextContent(text);
  expect(screen.getByRole('status')).toHaveTextContent('看上面的字也可以');
  fireEvent.click(screen.getByRole('button', { name: '再听一遍' }));
  expect(onReplay).toHaveBeenCalledOnce();
});
