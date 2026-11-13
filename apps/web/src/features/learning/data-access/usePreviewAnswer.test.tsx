import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { queryWrapper } from '../../../test/query-wrapper';
import type { AnswerEvents } from './useAnswerHints';
import { usePreviewAnswer } from './usePreviewAnswer';

const scope = { id: 'garden-balance', version: 1, csrf: 'parent-token' };

function setup(fetch: ReturnType<typeof vi.fn>, events?: AnswerEvents) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(() => usePreviewAnswer(scope, ['one-cabbage', 'count-groups'], events), {
    wrapper: queryWrapper(),
  });
}

const sent = (call: unknown[]) => ({
  url: call[0],
  body: JSON.parse((call[1] as RequestInit).body as string),
});

afterEach(() => vi.unstubAllGlobals());

it('sends a count to the preview alone, with no round, and reports the judgement', async () => {
  const onCorrect = vi.fn();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ outcome: 'incorrect' }))
    .mockResolvedValueOnce(Response.json({ outcome: 'independent' }));
  const { result } = setup(fetch, { onCorrect });
  expect(result.current.canHint).toBe(true);
  act(() => result.current.submit(6));
  await waitFor(() =>
    expect(result.current.judgement).toEqual({ status: 'judged', outcome: 'incorrect', count: 6 }),
  );
  act(() => result.current.submit(9));
  await waitFor(() => expect(result.current.judgement).toMatchObject({ outcome: 'independent' }));
  expect(onCorrect).toHaveBeenCalledOnce();
  expect(sent(fetch.mock.calls[0]!)).toEqual({
    url: '/api/v1/problems/garden-balance/1/preview',
    body: { action: 'submit', input: 6 },
  });
});

it('sends the same count again after a reply that did not come', async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(Response.json({ outcome: 'independent' }));
  const { result } = setup(fetch);
  act(() => result.current.submit(9));
  await waitFor(() => expect(result.current.judgement.status).toBe('failed'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.judgement).toMatchObject({ outcome: 'independent' }));
  expect(sent(fetch.mock.calls[1]!).body).toEqual({ action: 'submit', input: 9 });
});

it('gives the authored hints in their order, and tells the page of each', async () => {
  const onHint = vi.fn();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ hint: '先看一棵青菜。' }))
    .mockResolvedValueOnce(Response.json({ hint: '再数几组。' }));
  const { result } = setup(fetch, { onHint });
  act(() => result.current.askHint());
  await waitFor(() => expect(result.current.hint).toBe('先看一棵青菜。'));
  act(() => result.current.askHint());
  await waitFor(() => expect(result.current.hint).toBe('再数几组。'));
  expect(result.current.hintsLeft).toBe(0);
  expect(result.current.canHint).toBe(false);
  expect(onHint.mock.calls).toEqual([['one-cabbage'], ['count-groups']]);
  expect(sent(fetch.mock.calls[1]!).body).toEqual({ action: 'hint', hintId: 'count-groups' });
});
