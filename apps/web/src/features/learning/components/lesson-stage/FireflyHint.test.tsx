import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { FireflyHint } from './FireflyHint';

it('says how many hints are left and asks for one', async () => {
  const hint = vi.fn();
  render(<FireflyHint left={2} ready onHint={hint} />);
  await userEvent.click(screen.getByRole('button', { name: '给我一个提示，还有 2 个' }));
  expect(hint).toHaveBeenCalledOnce();
});

it('stays, empty, once the hints are used up', () => {
  render(<FireflyHint left={0} ready onHint={() => {}} />);
  expect(screen.getByRole('button', { name: '提示用完了' })).toBeDisabled();
});

it('waits while a hint cannot be asked for yet', () => {
  render(<FireflyHint left={2} ready={false} onHint={() => {}} />);
  expect(screen.getByRole('button', { name: '给我一个提示，还有 2 个' })).toBeDisabled();
});
