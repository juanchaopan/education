import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePageReadiness } from '../../../shared/lib/reload-readiness';
import { pageWrapper } from '../../../test/page-wrapper';
import { requestTeacherReply } from './question-request';
import { useQuestionReply } from './useQuestionReply';

vi.mock('./question-request', () => ({ requestTeacherReply: vi.fn() }));

const scope = { id: 'garden-balance', version: 1, csrf: 'session-token' };
const question = { stepId: 'leaves', text: '篮子在哪里？' };
const ready = { status: 'ready', source: 'ai', reply: '篮子在天平旁边。' } as const;

function waiting() {
  let finish!: (value: typeof ready) => void;
  vi.mocked(requestTeacherReply).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  return (value: typeof ready) => finish(value);
}

afterEach(() => vi.resetAllMocks());

it('asks the question and keeps the reply', async () => {
  vi.mocked(requestTeacherReply).mockResolvedValue(ready);
  const { result } = renderHook(() => useQuestionReply(scope));
  expect(result.current.state).toEqual({ status: 'idle' });
  await act(() => result.current.ask(question));
  expect(requestTeacherReply).toHaveBeenCalledWith(scope, question, expect.any(AbortSignal));
  expect(result.current.state).toEqual(ready);
});

it('turns server fallbacks and failures into guidance states', async () => {
  vi.mocked(requestTeacherReply)
    .mockResolvedValueOnce({ status: 'fallback', reason: 'usage-limited' })
    .mockRejectedValueOnce(new Error('private network error'));
  const { result } = renderHook(() => useQuestionReply(scope));
  await act(() => result.current.ask(question));
  expect(result.current.state).toEqual({ status: 'fallback', reason: 'usage-limited' });
  await act(() => result.current.ask(question));
  expect(result.current.state).toEqual({ status: 'fallback', reason: 'unavailable' });
});

it('ignores a late reply once the child stops waiting', async () => {
  const finish = waiting();
  const { result } = renderHook(() => useQuestionReply(scope));
  act(() => {
    void result.current.ask(question);
  });
  await waitFor(() => expect(result.current.state).toEqual({ status: 'pending' }));
  act(() => result.current.guide());
  await act(async () => finish(ready));
  expect(result.current.state).toEqual({ status: 'guidance' });
});

it('holds a reload while a reply is on its way', async () => {
  const finish = waiting();
  const { result } = renderHook(
    () => ({ teacher: useQuestionReply(scope), page: usePageReadiness().readiness }),
    { wrapper: pageWrapper() },
  );
  expect(result.current.page).toBe('ready');
  act(() => {
    void result.current.teacher.ask(question);
  });
  await waitFor(() => expect(result.current.page).toBe('saving'));
  await act(async () => finish(ready));
  await waitFor(() => expect(result.current.page).toBe('ready'));
});
