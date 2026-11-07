import { expect, it, vi } from 'vitest';
import type { ProblemPlugin } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';
import { webmRecording as webm } from './gateway-fixtures.js';
import type { TranscriptionGateway } from './transcription-gateway.js';
import { createVoiceTranscriptionService } from './voice-transcription.js';

const credentials = { token: 'synthetic-session', csrf: 'synthetic-csrf' };
const problem = { id: 'share-sweets', version: 1 };
const plugin: Pick<ProblemPlugin, 'feedback'> = {
  feedback: {
    'split-evenly': { prompt: '把十二颗糖平均分给三个人。', vocabulary: ['平均分', '每份'] },
    'draw-groups': { prompt: '画出分好的三组。' },
  },
};
const request = {
  stepId: 'split-evenly',
  format: 'webm',
  audio: webm.toString('base64'),
} as const;

function setup(reply: Awaited<ReturnType<TranscriptionGateway>> = ready('每份是四。')) {
  const authenticate = vi.fn(async () => {});
  const find = vi.fn((id: string, version: number) =>
    id === problem.id && version === problem.version ? plugin : undefined,
  );
  const transcribe = vi.fn<TranscriptionGateway>().mockResolvedValue(reply);
  return {
    authenticate,
    transcribe,
    service: createVoiceTranscriptionService(authenticate, find, transcribe),
  };
}

function ready(value: string) {
  return { status: 'ready', value, model: 'gpt-transcribe', elapsedMs: 900 } as const;
}

it('sends the decoded recording with the step words and proposes the text', async () => {
  const { service, transcribe, authenticate } = setup();
  const signal = new AbortController().signal;
  await expect(service(credentials, problem, request, signal)).resolves.toEqual({
    status: 'ready',
    text: '每份是四。',
  });
  expect(authenticate).toHaveBeenCalledWith(credentials);
  expect(transcribe).toHaveBeenCalledExactlyOnceWith(
    credentials,
    { audio: webm, format: 'webm', prompt: '平均分、每份' },
    signal,
  );
});

it('sends no hint for a step without words and reports silence as unheard', async () => {
  const { service, transcribe } = setup(ready(''));
  await expect(
    service(credentials, problem, { ...request, stepId: 'draw-groups' }),
  ).resolves.toEqual({ status: 'unheard' });
  expect(transcribe.mock.calls[0]?.[1]).toEqual({ audio: webm, format: 'webm' });
});

it('passes provider fallbacks through unchanged', async () => {
  const { service } = setup({ status: 'fallback', reason: 'unauthorized' });
  await expect(service(credentials, problem, request)).resolves.toEqual({
    status: 'fallback',
    reason: 'unauthorized',
  });
});

it('refuses audio whose container does not match before contacting the provider', async () => {
  const { service, transcribe } = setup();
  await expect(service(credentials, problem, { ...request, format: 'mp4' })).resolves.toEqual({
    status: 'fallback',
    reason: 'invalid-input',
  });
  expect(transcribe).not.toHaveBeenCalled();
});

it.each([
  ['an unknown problem version', { ...problem, version: 2 }, request.stepId],
  ['a step not opened to AI help', problem, 'count-left'],
  ['an inherited property name', problem, 'constructor'],
])('refuses %s with not found', async (_name, target, stepId) => {
  const { service, transcribe } = setup();
  await expect(service(credentials, target, { ...request, stepId })).rejects.toMatchObject({
    statusCode: 404,
  });
  expect(transcribe).not.toHaveBeenCalled();
});

it('checks the child session before anything else', async () => {
  const { service, authenticate, transcribe } = setup();
  authenticate.mockRejectedValueOnce(new RequestError(401, '登录已失效，请重新登录。'));
  await expect(service(credentials, problem, request)).rejects.toMatchObject({ statusCode: 401 });
  expect(transcribe).not.toHaveBeenCalled();
});
