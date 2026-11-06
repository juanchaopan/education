import { afterEach, expect, it, vi } from 'vitest';
import { AnswerConflictError, prepareAttempt, requestHint } from './answer-request';

const scope = { id: 'leaf', version: 2, csrf: 'session-token' };
const round = '00000000-0000-0000-0000-000000000000';
afterEach(() => vi.unstubAllGlobals());

it('retries the original attempt ID and snapshot after losing the first response', async () => {
  const input = { marks: [1, 2] };
  const pending = prepareAttempt(scope, { round, input, draftRevision: null });
  const receipt = { attemptId: pending.attemptId, outcome: 'assisted' };
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(Response.json(receipt));
  vi.stubGlobal('fetch', fetch);
  await expect(pending.submit()).rejects.toThrow();
  input.marks.push(3);
  await expect(pending.submit()).resolves.toEqual(receipt);
  const [first, second] = fetch.mock.calls;
  expect(first![0]).toBe('/api/v1/problems/leaf/2/answer');
  expect(first![1].body).toBe(second![1].body);
  expect(JSON.parse(second![1].body)).toMatchObject({
    input: { marks: [1, 2] },
    attemptId: pending.attemptId,
  });
});

it('only returns recorded hints and exposes stale rounds to the caller', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({}, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ hint: '先比较叶片两边。' }));
  vi.stubGlobal('fetch', fetch);
  await expect(requestHint(scope, round, 'compare')).rejects.toBeInstanceOf(AnswerConflictError);
  await expect(requestHint(scope, round, 'compare')).resolves.toEqual({ hint: '先比较叶片两边。' });
});

it('rejects a receipt for a different attempt', async () => {
  const pending = prepareAttempt(scope, { round, input: '相同', draftRevision: null });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ attemptId: round, outcome: 'independent' })),
  );
  await expect(pending.submit()).rejects.toThrow();
});
