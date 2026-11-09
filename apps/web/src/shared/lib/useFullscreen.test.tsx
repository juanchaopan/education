import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { forgetFullscreen, inFullscreen } from '../../test/fake-fullscreen';
import { useFullscreen } from './useFullscreen';

afterEach(forgetFullscreen);

it('asks for the whole screen, and leaves it once the part that asked goes', async () => {
  const root = document.documentElement;
  root.requestFullscreen = vi.fn(async () => inFullscreen(root));
  const exit = vi.fn(async () => inFullscreen(null));
  document.exitFullscreen = exit;
  const { result, unmount } = renderHook(() => useFullscreen());
  result.current();
  await waitFor(() => expect(document.fullscreenElement).toBe(root));
  expect(exit).not.toHaveBeenCalled();
  unmount();
  await waitFor(() => expect(exit).toHaveBeenCalledOnce());
});
