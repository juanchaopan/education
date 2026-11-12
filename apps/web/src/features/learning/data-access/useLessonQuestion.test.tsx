import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FakeRecorder, fakeMicrophone } from '../../../test/fake-recorder';
import { queryWrapper } from '../../../test/query-wrapper';
import { readAnswerRound, recordQuestion } from './answer-request';
import { requestTeacherReply } from './question-request';
import { requestTranscription } from './transcription-request';
import { useLessonQuestion } from './useLessonQuestion';

vi.mock('./transcription-request', () => ({ requestTranscription: vi.fn() }));
vi.mock('./question-request', () => ({ requestTeacherReply: vi.fn() }));
vi.mock('./answer-request', () => ({ readAnswerRound: vi.fn(), recordQuestion: vi.fn() }));

const scope = { id: 'garden-balance', version: 1, csrf: 'session-token' };
const round = '11111111-1111-1111-1111-111111111111';
const reply = { status: 'ready', source: 'ai', reply: '看看哪边低一些。' } as const;

function setup(stepId = 'apples') {
  const microphone = fakeMicrophone();
  return renderHook(
    ({ step }) => useLessonQuestion(scope, step, { host: microphone.host, answerStep: 'answer' }),
    { initialProps: { step: stepId }, wrapper: queryWrapper() },
  );
}

// Holds the button, says `text` and lets go, then waits to read it over.
async function say(result: ReturnType<typeof setup>['result'], text: string) {
  vi.mocked(requestTranscription).mockResolvedValueOnce({ status: 'ready', text });
  await act(async () => void result.current.press());
  act(() => result.current.release());
  await waitFor(() => expect(result.current.voice.status).toBe('review'));
}

beforeEach(() => {
  FakeRecorder.reset();
  vi.mocked(readAnswerRound).mockResolvedValue({ round });
  vi.mocked(requestTeacherReply).mockResolvedValue(reply);
});
afterEach(() => vi.resetAllMocks());

it('lets the child read over and correct the question before it goes to the teacher', async () => {
  const { result } = setup();
  await say(result, ' 为什么苹果这边底？ ');
  expect(requestTeacherReply).not.toHaveBeenCalled();
  act(() => result.current.edit('为什么苹果这边低？'));
  await act(() => result.current.send());
  await waitFor(() => expect(result.current.reply).toEqual(reply));
  expect(vi.mocked(requestTranscription).mock.calls[0]![1].stepId).toBe('apples');
  expect(vi.mocked(requestTeacherReply).mock.calls[0]![1]).toEqual({
    stepId: 'apples',
    text: '为什么苹果这边低？',
  });
  expect(result.current.voice).toEqual({ status: 'idle' });
  expect(recordQuestion).not.toHaveBeenCalled();
  expect(readAnswerRound).not.toHaveBeenCalled();
});

it('sends nothing when the text was emptied', async () => {
  const { result } = setup();
  await say(result, '为什么？');
  act(() => result.current.edit('   '));
  await act(() => result.current.send());
  expect(requestTeacherReply).not.toHaveBeenCalled();
});

it('asks about the scene the question was asked in, even after the scene moved on', async () => {
  const { result, rerender } = setup('apples');
  await say(result, '为什么要拿走苹果？');
  rerender({ step: 'exchange' });
  await act(() => result.current.send());
  await waitFor(() => expect(requestTeacherReply).toHaveBeenCalledOnce());
  expect(vi.mocked(requestTeacherReply).mock.calls[0]![1].stepId).toBe('apples');
});

it('records a question asked while answering as help, once a round, before it goes out', async () => {
  vi.mocked(recordQuestion).mockResolvedValue({ helped: true });
  const { result } = setup('answer');
  await say(result, '要数几组？');
  await act(() => result.current.send());
  expect(recordQuestion).toHaveBeenCalledExactlyOnceWith(scope, round);
  await waitFor(() => expect(requestTeacherReply).toHaveBeenCalledOnce());
  await say(result, '每组几根？');
  await act(() => result.current.send());
  await waitFor(() => expect(requestTeacherReply).toHaveBeenCalledTimes(2));
  expect(recordQuestion).toHaveBeenCalledOnce();
});

it('keeps the question to send again when its help could not be recorded', async () => {
  vi.mocked(recordQuestion).mockRejectedValueOnce(new Error('offline'));
  const { result } = setup('answer');
  await say(result, '要数几组？');
  await act(() => result.current.send());
  expect(requestTeacherReply).not.toHaveBeenCalled();
  expect(result.current.voice).toEqual({ status: 'review', text: '要数几组？' });
  await waitFor(() => expect(result.current.sendFailed).toBe(true));
  vi.mocked(recordQuestion).mockResolvedValueOnce({ helped: true });
  await act(() => result.current.send());
  await waitFor(() => expect(requestTeacherReply).toHaveBeenCalledOnce());
});

it('stops waiting for both the hearing and the reply when the child gives up', async () => {
  vi.mocked(requestTranscription).mockReturnValue(new Promise(() => {}));
  const { result } = setup();
  await act(async () => void result.current.press());
  act(() => result.current.release());
  act(() => result.current.guide());
  expect(result.current.voice).toEqual({ status: 'guidance' });
  expect(result.current.reply).toEqual({ status: 'guidance' });
});
