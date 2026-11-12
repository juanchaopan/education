import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePointerCoarse } from './usePointerCoarse';

function Pointer() {
  return <output>{usePointerCoarse() ? 'touch' : 'mouse'}</output>;
}

afterEach(() => vi.unstubAllGlobals());

function stubMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const list = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => list),
  );
  return {
    change(next: boolean) {
      list.matches = next;
      for (const listener of listeners) listener();
    },
  };
}

it('follows whether the device is used by touch', () => {
  const media = stubMedia(true);
  render(<Pointer />);
  expect(screen.getByRole('status')).toHaveTextContent('touch');
  act(() => media.change(false));
  expect(screen.getByRole('status')).toHaveTextContent('mouse');
});

it('counts a device it cannot ask as one with a mouse', () => {
  vi.stubGlobal('matchMedia', undefined);
  render(<Pointer />);
  expect(screen.getByRole('status')).toHaveTextContent('mouse');
});
