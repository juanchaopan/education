import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useKeyboardInset } from './useKeyboardInset';

// A phone's visual viewport, shrunk by `keyboard` pixels at the bottom.
function viewport(keyboard: number) {
  const view = Object.assign(new EventTarget(), { height: 844 - keyboard, offsetTop: 0 });
  vi.stubGlobal('visualViewport', view);
  vi.stubGlobal('innerHeight', 844);
  return view;
}

afterEach(() => vi.unstubAllGlobals());

it('measures the keyboard as it comes up and goes away', () => {
  const view = viewport(0);
  const { result } = renderHook(() => useKeyboardInset());
  expect(result.current).toBe(0);
  act(() => {
    view.height = 844 - 336;
    view.dispatchEvent(new Event('resize'));
  });
  expect(result.current).toBe(336);
  act(() => {
    view.height = 844;
    view.dispatchEvent(new Event('resize'));
  });
  expect(result.current).toBe(0);
});

it("takes the browser's own bars for no keyboard", () => {
  viewport(56);
  const { result } = renderHook(() => useKeyboardInset());
  expect(result.current).toBe(0);
});
