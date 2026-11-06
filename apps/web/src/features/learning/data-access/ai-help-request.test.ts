import { afterEach, expect, it, vi } from 'vitest';
import { createAiHelpRequest } from './ai-help-request.js';

const ready = { status: 'ready', text: '先看看左边。' } as const;
const fallback = { status: 'fallback', reason: 'unavailable' } as const;

afterEach(() => vi.useRealTimers());

it('does not duplicate a pending request and ignores late responses after choosing guidance', async () => {
  const render = vi.fn();
  const help = createAiHelpRequest(render);
  const slow = Promise.withResolvers<typeof ready>();
  const load = vi.fn((signal: AbortSignal) => {
    expect(signal.aborted).toBe(false);
    return slow.promise;
  });
  const old = help.request(load);
  await help.request(load);
  expect(load).toHaveBeenCalledTimes(1);
  help.guide();
  expect(load.mock.calls[0]?.[0].aborted).toBe(true);
  expect(render).toHaveBeenLastCalledWith({ status: 'guidance' });
  await help.request(async () => fallback);
  slow.resolve(ready);
  await old;
  expect(render).toHaveBeenLastCalledWith(fallback);
});

it('offers guidance on timeout, failure or cancellation', async () => {
  vi.useFakeTimers();
  const render = vi.fn();
  const help = createAiHelpRequest(render);
  const slow = Promise.withResolvers<typeof ready>();
  const load = vi.fn((_signal: AbortSignal) => slow.promise);
  const pending = help.request(load);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(load.mock.calls[0]?.[0].aborted).toBe(true);
  expect(render).toHaveBeenLastCalledWith({ status: 'fallback', reason: 'timeout' });
  await help.request(async () => {
    throw new Error('private network error');
  });
  expect(render).toHaveBeenLastCalledWith(fallback);
  const cancelled = help.request(load);
  help.cancel();
  expect(render).toHaveBeenLastCalledWith({ status: 'fallback', reason: 'cancelled' });
  slow.resolve(ready);
  await Promise.all([pending, cancelled]);
  expect(render).toHaveBeenLastCalledWith({ status: 'fallback', reason: 'cancelled' });
});

it('discards a response when the lesson leaves the step', async () => {
  const render = vi.fn();
  const help = createAiHelpRequest(render);
  const slow = Promise.withResolvers<typeof ready>();
  const load = vi.fn((_signal: AbortSignal) => slow.promise);
  const pending = help.request(load);
  help.dispose();
  expect(load.mock.calls[0]?.[0].aborted).toBe(true);
  slow.resolve(ready);
  await pending;
  expect(render.mock.calls).toEqual([[{ status: 'pending' }]]);
});
