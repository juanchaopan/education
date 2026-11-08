import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../test/query-wrapper';
import { useLessonAnswer } from './useLessonAnswer';

const scope = { id: 'garden-balance', version: 1, csrf: 'session-token' };
const round = '11111111-1111-1111-1111-111111111111';

function setup(fetch: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(() => useLessonAnswer(scope, ['one-cabbage', 'count-groups']), {
    wrapper: queryWrapper(),
  });
}

const body = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);
const receipt = (attemptId: string, outcome: string) => Response.json({ attemptId, outcome });

afterEach(() => vi.unstubAllGlobals());

it('sends the counted number with the round and no draft, and reports the judgement', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ round }))
    .mockImplementationOnce(async (_url, init: RequestInit) =>
      receipt(JSON.parse(init.body as string).attemptId, 'incorrect'),
    );
  const { result } = setup(fetch);
  await waitFor(() => expect(result.current.canHint).toBe(true));
  act(() => result.current.submit(6));
  await waitFor(() =>
    expect(result.current.judgement).toEqual({ status: 'judged', outcome: 'incorrect', count: 6 }),
  );
  expect(body(fetch.mock.calls[1]!)).toMatchObject({
    action: 'submit',
    round,
    input: 6,
    draftRevision: null,
  });
});

it('retries a lost reply with the same attempt, so it is never counted twice', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ round }))
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockImplementationOnce(async (_url, init: RequestInit) =>
      receipt(JSON.parse(init.body as string).attemptId, 'independent'),
    );
  const { result } = setup(fetch);
  await waitFor(() => expect(result.current.canHint).toBe(true));
  act(() => result.current.submit(9));
  await waitFor(() => expect(result.current.judgement.status).toBe('failed'));
  act(() => result.current.retry());
  await waitFor(() =>
    expect(result.current.judgement).toEqual({
      status: 'judged',
      outcome: 'independent',
      count: 9,
    }),
  );
  expect(body(fetch.mock.calls[2]!).attemptId).toBe(body(fetch.mock.calls[1]!).attemptId);
});

it('gives the authored hints in order and stops when they run out', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ round }))
    .mockResolvedValueOnce(Response.json({ hint: '先看第一架秤。' }))
    .mockResolvedValueOnce(Response.json({ hint: '一组一组地数。' }));
  const { result } = setup(fetch);
  await waitFor(() => expect(result.current.canHint).toBe(true));
  act(() => result.current.askHint());
  await waitFor(() => expect(result.current.hint).toBe('先看第一架秤。'));
  act(() => result.current.askHint());
  await waitFor(() => expect(result.current.hint).toBe('一组一组地数。'));
  expect(result.current.canHint).toBe(false);
  expect(fetch.mock.calls.slice(1).map((call) => body(call).hintId)).toEqual([
    'one-cabbage',
    'count-groups',
  ]);
});
