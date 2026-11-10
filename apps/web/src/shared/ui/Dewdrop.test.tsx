import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Dewdrop } from './Dewdrop';

it('is named by its label alone and reports a press', async () => {
  const press = vi.fn();
  render(<Dewdrop icon="check" label="对" tone="ok" badge={2} onClick={press} />);
  const drop = screen.getByRole('button', { name: '对' });
  expect(drop).toHaveAttribute('type', 'button');
  await userEvent.click(drop);
  expect(press).toHaveBeenCalledOnce();
});

it('shows its own drawing in place of an icon', () => {
  render(<Dewdrop art={<svg data-testid="art" />} label="给我一个提示" />);
  expect(screen.getByRole('button', { name: '给我一个提示' })).toContainElement(
    screen.getByTestId('art'),
  );
});

it('tells a screen reader whether a toggle is on', () => {
  render(<Dewdrop icon="sound" label="声音" aria-pressed />);
  expect(screen.getByRole('button', { name: '声音', pressed: true })).toBeInTheDocument();
});
