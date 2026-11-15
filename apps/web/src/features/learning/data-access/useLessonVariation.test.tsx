import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../test/query-wrapper';
import { useLessonVariation } from './useLessonVariation';

const scope = { id: 'garden-balance', version: 1, csrf: 'token' };
const round = '11111111-1111-1111-1111-111111111111';

type Request = { url: string; body?: Record<string, unknown> };
let requests: Request[] = [];
let reply: (body?: Record<string, unknown>) => unknown;

beforeEach(() => {
  requests = [];
  reply = (body) =>
    body?.attemptId === undefined
      ? { round, guessed: false, explained: false }
      : { attemptId: body.attemptId, outcome: 'incorrect' };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : undefined;
      requests.push({ url, body });
      return Response.json(body?.action === 'hint' ? { hint: '数一数。' } : reply(body));
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const setup = () =>
  renderHook(() => useLessonVariation(scope, ['groups-and-count']), { wrapper: queryWrapper() });

it("sends the guess under the round of the answer judged right, to the problem's variation", async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.canHint).toBe(true));
  act(() => result.current.guess.submit(8));
  await waitFor(() =>
    expect(result.current.guess.judgement).toEqual({
      status: 'judged',
      outcome: 'incorrect',
      said: [8],
    }),
  );
  const [read, guess] = requests;
  expect(read).toEqual({ url: '/api/v1/problems/garden-balance/1/variation', body: undefined });
  expect(guess?.body).toMatchObject({ action: 'guess', round, input: 8 });
});

it('sends a reason said or tapped, judged by the rule on the server', async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.canHint).toBe(true));
  act(() => result.current.reason.submit({ say: '还是三组' }));
  await waitFor(() =>
    expect(result.current.reason.judgement).toEqual({ status: 'judged', outcome: 'incorrect' }),
  );
  expect(requests.at(-1)?.body).toMatchObject({
    action: 'reason',
    round,
    reason: { say: '还是三组' },
  });
});

it("asks for the variation's own hints under its round", async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.canHint).toBe(true));
  act(() => result.current.askHint());
  await waitFor(() => expect(result.current.hint).toBe('数一数。'));
  expect(requests.at(-1)?.body).toEqual({ action: 'hint', round, hintId: 'groups-and-count' });
});

it('tells what the server holds for the round already', async () => {
  reply = () => ({ round, guessed: true, explained: false });
  const { result } = setup();
  await waitFor(() => expect(result.current.recorded).toEqual({ guessed: true, explained: false }));
});
