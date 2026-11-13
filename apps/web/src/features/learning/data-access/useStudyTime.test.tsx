import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { beatEvery, idleAfter, useStudyTime } from './useStudyTime';

const csrf = 'a'.repeat(43);
let visibility: DocumentVisibilityState = 'visible';
let reply = 204;
const fetcher = vi.fn(async () => new Response(null, { status: reply }));

beforeEach(() => {
  vi.useFakeTimers();
  visibility = 'visible';
  reply = 204;
  fetcher.mockClear();
  vi.stubGlobal('fetch', fetcher);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const press = () => act(() => document.dispatchEvent(new Event('pointerdown')));
const wait = (milliseconds: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });

it('sends nothing until the child does something on the page', async () => {
  renderHook(() => useStudyTime(csrf));
  await wait(beatEvery * 3);
  expect(fetcher).not.toHaveBeenCalled();
});

it('beats at once when the child starts, then every 30 seconds while working', async () => {
  renderHook(() => useStudyTime(csrf));
  press();
  expect(fetcher).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledWith(
    '/api/v1/children/study-time',
    expect.objectContaining({
      method: 'POST',
      body: '{}',
      headers: expect.objectContaining({ 'X-CSRF-Token': csrf }),
    }),
  );
  await wait(beatEvery);
  press();
  await wait(beatEvery);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('stops two minutes after the child last did something, and starts again at once', async () => {
  renderHook(() => useStudyTime(csrf));
  press();
  await wait(idleAfter + beatEvery * 2);
  const sent = fetcher.mock.calls.length;
  expect(sent).toBe(1 + idleAfter / beatEvery);
  await wait(beatEvery * 2);
  expect(fetcher).toHaveBeenCalledTimes(sent);
  press();
  expect(fetcher).toHaveBeenCalledTimes(sent + 1);
});

it('does not count a page out of view', async () => {
  renderHook(() => useStudyTime(csrf));
  press();
  visibility = 'hidden';
  await wait(beatEvery * 2);
  expect(fetcher).toHaveBeenCalledOnce();
});

it('takes hovering for nothing but a drag for work', async () => {
  renderHook(() => useStudyTime(csrf));
  act(() => document.dispatchEvent(new PointerEvent('pointermove', { buttons: 0 })));
  expect(fetcher).not.toHaveBeenCalled();
  act(() => document.dispatchEvent(new PointerEvent('pointermove', { buttons: 1 })));
  expect(fetcher).toHaveBeenCalledOnce();
});

it('stops for good once the server says the child is signed out', async () => {
  reply = 401;
  renderHook(() => useStudyTime(csrf));
  press();
  await wait(0);
  await wait(beatEvery * 2);
  press();
  expect(fetcher).toHaveBeenCalledOnce();
});

it('stops when the page closes', async () => {
  const { unmount } = renderHook(() => useStudyTime(csrf));
  press();
  unmount();
  await wait(beatEvery * 2);
  press();
  expect(fetcher).toHaveBeenCalledOnce();
});
