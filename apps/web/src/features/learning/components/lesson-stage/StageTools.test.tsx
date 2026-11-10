import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { StageTools } from './StageTools';

function tools(overrides: Partial<Parameters<typeof StageTools>[0]> = {}) {
  const on = { onReplay: vi.fn(), onCaptions: vi.fn(), onSound: vi.fn() };
  render(<StageTools speaking={false} again={false} captions sound {...on} {...overrides} />);
  return on;
}

it('hears the line again, and turns captions and sound on and off', async () => {
  const on = tools({ captions: false });
  await userEvent.click(screen.getByRole('button', { name: '重听这一句' }));
  await userEvent.click(screen.getByRole('button', { name: '字幕', pressed: false }));
  await userEvent.click(screen.getByRole('button', { name: '声音', pressed: true }));
  expect(on.onReplay).toHaveBeenCalledOnce();
  expect(on.onCaptions).toHaveBeenCalledOnce();
  expect(on.onSound).toHaveBeenCalledOnce();
});

it('asks for the line again in words while it waits to be heard', () => {
  tools({ again: true });
  expect(screen.getByRole('button', { name: '再听一次' })).toBeEnabled();
});

it('keeps the captions on while there is no sound', () => {
  tools({ sound: false });
  expect(screen.getByRole('button', { name: '字幕', pressed: true })).toBeDisabled();
  expect(screen.getByRole('button', { name: '声音', pressed: false })).toBeEnabled();
});
