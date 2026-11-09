import { focusManager, onlineManager, useMutation } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReloadReadiness, type Readiness } from '../../shared/lib/reload-readiness';
import { pageWrapper } from '../../test/page-wrapper';
import { createReloadGuard } from './reload-guard';
import { retryDelay, useReleaseUpdate } from './useReleaseUpdate';

const older = 'a'.repeat(40);
const newer = 'b'.repeat(40);
const minute = 60_000;

// The deployment's reply to a check. Its body is read at once rather than
// from a stream, so a check settles within the fake time it is made in.
type Reply = () => Promise<Response>;
const serving =
  (release: string | null): Reply =>
  () =>
    Promise.resolve({ ok: true, json: async () => ({ revision: release }) } as Response);
const offline: Reply = () => Promise.reject(new TypeError('Failed to fetch'));

type Part = { readiness: Readiness; save?: () => void };
type Setup = { own?: string; serves?: string; part?: Part; store?: ReturnType<typeof memoryStore> };

function memoryStore() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string): string | null => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

// A tab whose session storage takes `writes` writes and then no more.
function storeFullAfter(writes: number) {
  const store = memoryStore();
  const write = store.setItem;
  let left = writes;
  store.setItem = (key, value) => {
    if (left-- <= 0) throw new DOMException('', 'QuotaExceededError');
    write(key, value);
  };
  return store;
}

// A write to the server that is still on its way until the test finishes it.
function pendingWrite() {
  let finish!: () => void;
  const written = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { written, finish };
}

// An open page built as `own` while the deployment serves `serves`, with
// another part of the page standing toward a reload as `part` says, and a
// write the page can send.
function setup({
  own = older,
  serves = own,
  part = { readiness: 'ready' },
  store = memoryStore(),
}: Setup = {}) {
  const server = { reply: serving(serves) };
  const fetch = vi.fn(() => server.reply());
  vi.stubGlobal('fetch', fetch);
  const reload = vi.fn();
  const guard = createReloadGuard(() => store);
  const write = pendingWrite();
  const view = renderHook(
    ({ readiness, save }: Part) => {
      useReloadReadiness(readiness, save);
      const send = useMutation({ mutationFn: () => write.written });
      return { ...useReleaseUpdate({ own, guard, reload }), send: () => send.mutate() };
    },
    { initialProps: part, wrapper: pageWrapper() },
  );
  return { ...view, server, fetch, reload, guard, write };
}

// Lets `ms` of fake time pass. Work a timer queues "at once" while fake time
// steps runs a millisecond later, so one more millisecond lets it render.
async function wait(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
  await act(() => vi.advanceTimersByTimeAsync(1));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('useReleaseUpdate', () => {
  it('checks every minute while the page shows, and at once when it shows again', async () => {
    const { fetch, result } = setup();
    await wait(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    await wait(minute);
    expect(fetch).toHaveBeenCalledTimes(2);
    act(() => focusManager.setFocused(false));
    await wait(3 * minute);
    expect(fetch).toHaveBeenCalledTimes(2);
    act(() => focusManager.setFocused(true));
    await wait(0);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.current.phase).toBe('current');
  });

  it('checks at once when the page gets focus or comes back online', async () => {
    const { fetch } = setup();
    await wait(0);
    act(() => void window.dispatchEvent(new Event('focus')));
    await wait(0);
    expect(fetch).toHaveBeenCalledTimes(2);
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));
    await wait(0);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('never checks on a page built without a release', async () => {
    const { fetch, result } = setup({ own: '', serves: newer });
    await wait(5 * minute);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('current');
  });

  it('stays on a failed or unreadable check and tries again later and later', async () => {
    const { fetch, server, reload } = setup();
    await wait(0);
    server.reply = offline;
    await wait(minute);
    expect(fetch).toHaveBeenCalledTimes(2);
    await wait(minute - 1000);
    expect(fetch).toHaveBeenCalledTimes(2);
    await wait(1000);
    expect(fetch).toHaveBeenCalledTimes(3);
    server.reply = serving(null);
    await wait(2 * minute);
    expect(fetch).toHaveBeenCalledTimes(4);
    await wait(4 * minute);
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(reload).not.toHaveBeenCalled();
    expect([0, 1, 2, 3, 4, 9].map(retryDelay)).toEqual([
      minute,
      2 * minute,
      4 * minute,
      8 * minute,
      15 * minute,
      15 * minute,
    ]);
  });

  it('reloads at once for a newer release when nothing would be lost, once for that release', async () => {
    const { reload, result, guard } = setup({ serves: newer });
    await wait(0);
    expect(reload).toHaveBeenCalledOnce();
    expect(guard.read().reloadedFor).toBe(newer);
    expect(result.current.phase).toBe('reloading');
    await wait(minute);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('takes a rolled-back release the same way, once', async () => {
    const { reload } = setup({ own: newer, serves: older });
    await wait(0);
    await wait(minute);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('offers another try instead of reloading again when the reload did not bring the release', async () => {
    const store = memoryStore();
    const before = setup({ serves: newer, store });
    await wait(0);
    expect(before.reload).toHaveBeenCalledOnce();
    before.unmount();
    // The tab reloaded, but a cache still served the older page.
    const after = setup({ serves: newer, store });
    await wait(0);
    expect(after.result.current.phase).toBe('stuck');
    await wait(5 * minute);
    expect(after.reload).not.toHaveBeenCalled();
    act(() => after.result.current.retry());
    await wait(0);
    expect(after.reload).toHaveBeenCalledOnce();
  });

  it('never reloads on its own in a tab that cannot record the reload, but does when the child asks', async () => {
    const { reload, result } = setup({ serves: newer, store: storeFullAfter(0) });
    await wait(0);
    expect(reload).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('stuck');
    act(() => result.current.retry());
    await wait(0);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('still reloads once when the record cannot be written just then, and the next page stays', async () => {
    const store = storeFullAfter(1);
    const before = setup({ serves: newer, store });
    await wait(0);
    expect(before.reload).toHaveBeenCalledOnce();
    before.unmount();
    const after = setup({ serves: newer, store });
    await wait(0);
    expect(after.result.current.phase).toBe('stuck');
    expect(after.reload).not.toHaveBeenCalled();
  });

  it('waits for a write on its way to the server before it reloads', async () => {
    const { reload, result, write } = setup({ serves: newer });
    act(() => result.current.send());
    await wait(0);
    expect(result.current.phase).toBe('waiting');
    expect(reload).not.toHaveBeenCalled();
    await act(async () => write.finish());
    await wait(0);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('waits, without saving or a notice, while something shown only once is on screen', async () => {
    const save = vi.fn();
    const { reload, result, rerender } = setup({
      serves: newer,
      part: { readiness: 'showing', save },
    });
    await wait(0);
    await wait(minute);
    expect(result.current.phase).toBe('waiting');
    expect(save).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    rerender({ readiness: 'ready', save });
    await wait(0);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('waits for a playing film, then saves unsaved work, holding until it is saved', async () => {
    const save = vi.fn();
    const { reload, result, rerender } = setup({
      serves: newer,
      part: { readiness: 'playing', save },
    });
    await wait(0);
    expect(result.current.phase).toBe('waiting');
    expect(save).not.toHaveBeenCalled();

    rerender({ readiness: 'unsaved', save });
    await wait(0);
    expect(result.current.phase).toBe('held');
    expect(save).toHaveBeenCalledOnce();
    rerender({ readiness: 'saving', save });
    rerender({ readiness: 'unsaved', save });
    await wait(0);
    expect(save).toHaveBeenCalledOnce();

    // Every later check tries the save again.
    await wait(minute);
    expect(save).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
    rerender({ readiness: 'saving', save });
    await wait(0);
    expect(result.current.phase).toBe('waiting');
    rerender({ readiness: 'ready', save });
    await wait(0);
    expect(reload).toHaveBeenCalledOnce();
  });
});
