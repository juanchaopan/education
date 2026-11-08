import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../test/query-wrapper';
import { useLessonRecordings } from './useLessonRecordings';

const lines = {
  hello: { text: '你好', clip: '/hello.mp3' },
  again: { text: '再说一次你好', clip: '/hello.mp3' },
  bye: { text: '再见', clip: '/bye.mp3' },
};
const recording = () => new Response(new Uint8Array(8));

afterEach(() => vi.unstubAllGlobals());

function setup(fetch: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(() => useLessonRecordings(lines), { wrapper: queryWrapper() });
}

it('fetches every recording of the lesson once, in full, as it opens', async () => {
  const fetch = vi.fn(async (_source: string) => recording());
  const { result } = setup(fetch);
  expect(result.current.preparation).toBe('preparing');
  await waitFor(() => expect(result.current.preparation).toBe('ready'));
  expect(fetch.mock.calls.map(([source]) => source)).toEqual(['/hello.mp3', '/bye.mp3']);
});

it('tells at once that a recording did not arrive, and fetches them again on request', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(recording())
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockImplementation(async () => recording());
  const { result } = setup(fetch);
  await waitFor(() => expect(result.current.preparation).toBe('failed'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.preparation).toBe('ready'));
  expect(fetch).toHaveBeenCalledTimes(4);
});

it('does not start the lesson while the network is down', async () => {
  const { result } = setup(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await waitFor(() => expect(result.current.preparation).toBe('failed'));
});
