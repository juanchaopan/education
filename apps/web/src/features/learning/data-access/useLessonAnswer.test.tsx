import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../test/query-wrapper';
import { useLessonAnswer } from './useLessonAnswer';

const scope = { id: 'garden-balance', version: 1, csrf: 'session-token' };
const round = '11111111-1111-1111-1111-111111111111';
const nextRound = '22222222-2222-2222-2222-222222222222';

function setup(fetch: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(() => useLessonAnswer(scope, ['one-cabbage', 'count-groups']), {
    wrapper: queryWrapper(),
  });
}

// Opens the round and sends a count of nine whose submission fails.
async function failedNine(fetch: ReturnType<typeof vi.fn>) {
  const view = setup(fetch);
  await waitFor(() => expect(view.result.current.canHint).toBe(true));
  act(() => view.result.current.submit(9));
  await waitFor(() => expect(view.result.current.judgement.status).toBe('failed'));
  return view.result;
}

const body = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);
const receipt = (outcome: string) => async (_url: string, init: RequestInit) =>
  Response.json({ attemptId: JSON.parse(init.body as string).attemptId, outcome });
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

afterEach(() => vi.unstubAllGlobals());

it('sends the counted number with the round and no draft, and reports the judgement', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ round }))
    .mockImplementationOnce(receipt('incorrect'));
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
    .mockImplementationOnce(receipt('independent'));
  const result = await failedNine(fetch);
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

it('keeps an answer given before the round arrived and sends it once the round is known', async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(Response.json({ round }))
    .mockImplementationOnce(receipt('independent'));
  const { result } = setup(fetch);
  await settle();
  act(() => result.current.submit(9));
  await waitFor(() =>
    expect(result.current.judgement).toEqual({ status: 'failed', message: '暂时连不上，请重试。' }),
  );
  await waitFor(() => expect(result.current.canHint).toBe(true));
  act(() => result.current.retry());
  await waitFor(() =>
    expect(result.current.judgement).toMatchObject({ status: 'judged', count: 9 }),
  );
  expect(body(fetch.mock.calls[2]!)).toMatchObject({ round, input: 9 });
});

it('starts over with a fresh round when the round changed elsewhere', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ round }))
    .mockResolvedValueOnce(new Response(null, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ round: nextRound }))
    .mockImplementationOnce(receipt('independent'));
  const result = await failedNine(fetch);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.judgement).toEqual({ status: 'open' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  await settle();
  act(() => result.current.submit(9));
  await waitFor(() => expect(result.current.judgement).toMatchObject({ status: 'judged' }));
  expect(body(fetch.mock.calls[3]!).round).toBe(nextRound);
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
