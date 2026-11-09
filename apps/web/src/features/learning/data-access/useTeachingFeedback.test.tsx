import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePageReadiness } from '../../../shared/lib/reload-readiness';
import { pageWrapper } from '../../../test/page-wrapper';
import { exportInk } from '../drawing/export-ink';
import { requestTeachingFeedback } from './feedback-request';
import { useTeachingFeedback } from './useTeachingFeedback';

vi.mock('./feedback-request', () => ({ requestTeachingFeedback: vi.fn() }));
vi.mock('../drawing/export-ink', () => ({ exportInk: vi.fn() }));

const scope = { id: 'count-dots', version: 1, csrf: 'session-token' };
const drawing = [[{ x: 0.2, y: 0.3 }]];
const feedback = {
  status: 'needs-work',
  instruction: '再数一数。',
  stepId: 'count-left',
  highlight: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
} as const;
const ready = { status: 'ready', source: 'ai', feedback } as const;
const image = new Blob(['png'], { type: 'image/png' });

beforeEach(() => {
  vi.mocked(exportInk).mockResolvedValue(image);
});
afterEach(() => vi.resetAllMocks());

it('sends the step, text and exported drawing and keeps the drawing the feedback is for', async () => {
  vi.mocked(requestTeachingFeedback).mockResolvedValue(ready);
  const { result } = renderHook(() => useTeachingFeedback(scope));
  expect(result.current.state).toEqual({ status: 'idle' });
  await act(() => result.current.ask({ stepId: 'count-left', text: '三个', drawing }));
  expect(requestTeachingFeedback).toHaveBeenCalledWith(
    scope,
    { stepId: 'count-left', text: '三个', image },
    expect.any(AbortSignal),
  );
  expect(result.current.state).toEqual({ ...ready, drawing });
});

it('sends text without a drawing and never exports an empty sheet', async () => {
  vi.mocked(requestTeachingFeedback).mockResolvedValue(ready);
  const { result } = renderHook(() => useTeachingFeedback(scope));
  await act(() => result.current.ask({ stepId: 'count-left', text: '三个', drawing: [] }));
  expect(exportInk).not.toHaveBeenCalled();
  expect(requestTeachingFeedback).toHaveBeenCalledWith(
    scope,
    { stepId: 'count-left', text: '三个', image: undefined },
    expect.any(AbortSignal),
  );
});

it('does not send a drawing that cannot be exported', async () => {
  vi.mocked(exportInk).mockResolvedValue(undefined);
  const { result } = renderHook(() => useTeachingFeedback(scope));
  await act(() => result.current.ask({ stepId: 'count-left', drawing }));
  expect(requestTeachingFeedback).not.toHaveBeenCalled();
  expect(result.current.state).toEqual({ status: 'fallback', reason: 'invalid-input' });
});

it('turns server fallbacks and failures into guidance states without a second request', async () => {
  vi.mocked(requestTeachingFeedback)
    .mockResolvedValueOnce({ status: 'fallback', reason: 'usage-limited' })
    .mockRejectedValueOnce(new Error('private network error'));
  const { result } = renderHook(() => useTeachingFeedback(scope));
  await act(() => result.current.ask({ stepId: 'count-left', text: '三个', drawing: [] }));
  expect(result.current.state).toEqual({ status: 'fallback', reason: 'usage-limited' });
  await act(() => result.current.ask({ stepId: 'count-left', text: '三个', drawing: [] }));
  expect(result.current.state).toEqual({ status: 'fallback', reason: 'unavailable' });
  expect(requestTeachingFeedback).toHaveBeenCalledTimes(2);
});

it('ignores a late reply once the child chooses guidance, and ignores repeated asks while waiting', async () => {
  let finish!: (value: typeof ready) => void;
  vi.mocked(requestTeachingFeedback).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { result } = renderHook(() => useTeachingFeedback(scope));
  const ask = () => {
    void result.current.ask({ stepId: 'count-left', text: '三个', drawing: [] });
  };
  act(ask);
  await waitFor(() => expect(requestTeachingFeedback).toHaveBeenCalledTimes(1));
  expect(result.current.state).toEqual({ status: 'pending' });
  act(ask);
  act(() => result.current.guide());
  expect(result.current.state).toEqual({ status: 'guidance' });
  await act(async () => finish(ready));
  expect(result.current.state).toEqual({ status: 'guidance' });
  expect(requestTeachingFeedback).toHaveBeenCalledTimes(1);
});

it('holds a reload while a reply is on its way', async () => {
  let finish!: (value: typeof ready) => void;
  vi.mocked(requestTeachingFeedback).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { result } = renderHook(
    () => ({ feedback: useTeachingFeedback(scope), page: usePageReadiness().readiness }),
    { wrapper: pageWrapper() },
  );
  expect(result.current.page).toBe('ready');
  act(() => {
    void result.current.feedback.ask({ stepId: 'count-left', text: '三个', drawing: [] });
  });
  await waitFor(() => expect(result.current.page).toBe('saving'));
  await act(async () => finish(ready));
  await waitFor(() => expect(result.current.page).toBe('ready'));
});

it('releases a pending request when the lesson closes', async () => {
  let signal: AbortSignal | undefined;
  vi.mocked(requestTeachingFeedback).mockImplementation((_scope, _submission, cancel) => {
    signal = cancel;
    return new Promise(() => {});
  });
  const { result, unmount } = renderHook(() => useTeachingFeedback(scope));
  act(() => {
    void result.current.ask({ stepId: 'count-left', text: '三个', drawing: [] });
  });
  await waitFor(() => expect(signal).toBeDefined());
  unmount();
  expect(signal?.aborted).toBe(true);
});
