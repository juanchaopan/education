import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FakeRecorder, fakeMicrophone } from '../../../test/fake-recorder';
import { requestTeachingFeedback } from './feedback-request';
import { requestTranscription } from './transcription-request';
import { useLessonQuestion } from './useLessonQuestion';

vi.mock('./transcription-request', () => ({ requestTranscription: vi.fn() }));
vi.mock('./feedback-request', () => ({ requestTeachingFeedback: vi.fn() }));

const scope = { id: 'garden-balance', version: 1, csrf: 'session-token' };
const reply = {
  status: 'ready',
  source: 'ai',
  feedback: { status: 'needs-work', stepId: 'apples', instruction: '看看哪边低一些。' },
} as const;

function setup(stepId = 'apples') {
  const microphone = fakeMicrophone();
  return renderHook(({ step }) => useLessonQuestion(scope, step, microphone.host), {
    initialProps: { step: stepId },
  });
}

async function ask(result: ReturnType<typeof setup>['result']) {
  await act(() => result.current.start());
  act(() => result.current.stop());
}

beforeEach(() => FakeRecorder.reset());
afterEach(() => vi.resetAllMocks());

it('sends what was heard to the teacher for the scene at once, with nothing to confirm', async () => {
  vi.mocked(requestTranscription).mockResolvedValue({
    status: 'ready',
    text: ' 为什么苹果这边低？ ',
  });
  vi.mocked(requestTeachingFeedback).mockResolvedValue(reply);
  const { result } = setup();
  await ask(result);
  await waitFor(() => expect(result.current.reply.status).toBe('ready'));
  expect(vi.mocked(requestTranscription).mock.calls[0]![1].stepId).toBe('apples');
  expect(vi.mocked(requestTeachingFeedback).mock.calls[0]![1]).toEqual({
    stepId: 'apples',
    text: '为什么苹果这边低？',
    image: undefined,
  });
  expect(result.current.voice).toEqual({ status: 'idle' });
});

it('asks nothing when only silence was heard', async () => {
  vi.mocked(requestTranscription).mockResolvedValue({ status: 'ready', text: '   ' });
  const { result } = setup();
  await ask(result);
  await waitFor(() => expect(result.current.voice).toEqual({ status: 'idle' }));
  expect(requestTeachingFeedback).not.toHaveBeenCalled();
});

it('asks about the scene the question was asked in, even after the scene moved on', async () => {
  let heard: (value: { status: 'ready'; text: string }) => void = () => {};
  vi.mocked(requestTranscription).mockReturnValue(new Promise((resolve) => (heard = resolve)));
  vi.mocked(requestTeachingFeedback).mockResolvedValue(reply);
  const { result, rerender } = setup('apples');
  await ask(result);
  rerender({ step: 'exchange' });
  await act(async () => heard({ status: 'ready', text: '为什么要拿走苹果？' }));
  await waitFor(() => expect(requestTeachingFeedback).toHaveBeenCalledOnce());
  expect(vi.mocked(requestTeachingFeedback).mock.calls[0]![1].stepId).toBe('apples');
});

it('stops waiting for both the hearing and the reply when the child gives up', async () => {
  vi.mocked(requestTranscription).mockReturnValue(new Promise(() => {}));
  const { result } = setup();
  await ask(result);
  act(() => result.current.guide());
  expect(result.current.voice).toEqual({ status: 'guidance' });
  expect(result.current.reply).toEqual({ status: 'guidance' });
});
