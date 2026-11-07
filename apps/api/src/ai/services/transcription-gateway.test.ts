import { afterEach, expect, it, vi } from 'vitest';
import { credentials, settings } from './gateway-fixtures.js';
import type { Authorize, Meter } from './metered-call.js';
import { createTranscriptionGateway, type TranscriptionInput } from './transcription-gateway.js';

const input: TranscriptionInput = {
  audio: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3]),
  format: 'webm',
  prompt: '平均分、每份',
};

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function setup(config = settings) {
  const send = vi.fn<typeof fetch>();
  const authorize = vi.fn<Authorize>(async (_, start) => start(new AbortController().signal));
  const meter = {
    reserve: vi.fn<Meter['reserve']>().mockResolvedValue('id'),
    settle: vi.fn<Meter['settle']>().mockResolvedValue(),
  };
  const transcribe = createTranscriptionGateway(config, authorize, meter, send);
  return { send, authorize, meter, transcribe };
}

afterEach(() => vi.useRealTimers());

it('sends one consented multipart upload with the step words and settles the measured duration', async () => {
  const { transcribe, send, meter, authorize } = setup();
  send.mockResolvedValue(
    json({ text: ' 我把十二\n平均分成三份。 ', usage: { type: 'duration', seconds: 4.98 } }),
  );
  await expect(transcribe(credentials, input)).resolves.toMatchObject({
    status: 'ready',
    value: '我把十二 平均分成三份。',
    model: 'gpt-transcribe',
  });
  expect(authorize).toHaveBeenCalledOnce();
  expect(meter.reserve).toHaveBeenCalledWith(credentials, 'gpt-transcribe', 2_400_000n);
  expect(meter.settle).toHaveBeenCalledExactlyOnceWith('id', {
    status: 'settled',
    amount: 373_500n,
  });
  const [url, init] = send.mock.calls[0]!;
  expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
  expect(init).toMatchObject({
    method: 'POST',
    redirect: 'error',
    headers: { authorization: 'Bearer synthetic-key' },
  });
  const form = init?.body as FormData;
  expect(form.get('model')).toBe('gpt-transcribe');
  expect(form.get('languages[]')).toBe('zh-cn');
  expect(form.get('prompt')).toBe('平均分、每份');
  const file = form.get('file') as File;
  expect(file.name).toBe('answer.webm');
  expect(file.type).toBe('audio/webm');
  expect(Buffer.from(await file.arrayBuffer())).toEqual(input.audio);
  expect([...form.keys()]).not.toContain('token');
});

it('names an MP4 recording for the provider and leaves out an absent hint', async () => {
  const { transcribe, send } = setup();
  send.mockResolvedValue(json({ text: '四', usage: { type: 'duration', seconds: 1 } }));
  await transcribe(credentials, { audio: input.audio, format: 'mp4' });
  const form = send.mock.calls[0]?.[1]?.body as FormData;
  expect((form.get('file') as File).name).toBe('answer.m4a');
  expect((form.get('file') as File).type).toBe('audio/mp4');
  expect(form.has('prompt')).toBe(false);
});

it.each([
  [{ ...settings, paidAiEnabled: false }, 'disabled'],
  [{ ...settings, apiKey: '' }, 'missing-key'],
  [{ ...settings, eligible: false }, 'ineligible'],
] as const)('fails closed with %j before consent or upload', async (config, reason) => {
  const { transcribe, authorize, send } = setup(config);
  await expect(transcribe(credentials, input)).resolves.toEqual({ status: 'fallback', reason });
  expect(authorize).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

it('reports silence as empty text and keeps the hold when the duration is not reported', async () => {
  const { transcribe, send, meter } = setup();
  send.mockResolvedValue(json({ text: ' ' }));
  await expect(transcribe(credentials, input)).resolves.toMatchObject({
    status: 'ready',
    value: '',
  });
  expect(meter.settle).toHaveBeenCalledWith('id', { status: 'unknown' });
});

it('releases a rejected key and treats unreadable or oversized replies as unavailable', async () => {
  const { transcribe, send, meter } = setup();
  send.mockResolvedValueOnce(json({ error: { code: 'invalid_api_key' } }, 401));
  await expect(transcribe(credentials, input)).resolves.toEqual({
    status: 'fallback',
    reason: 'unavailable',
  });
  expect(meter.settle).toHaveBeenLastCalledWith('id', { status: 'released' });
  for (const reply of [
    json({ error: { message: 'bad audio' } }, 400),
    new Response('not json', { headers: { 'content-type': 'text/plain' } }),
    new Response('{broken', { headers: { 'content-type': 'application/json' } }),
    json({ text: '答'.repeat(5_000), usage: { type: 'duration', seconds: 3 } }),
    json({ text: 42 }),
  ]) {
    send.mockResolvedValueOnce(reply);
    await expect(transcribe(credentials, input)).resolves.toEqual({
      status: 'fallback',
      reason: 'unavailable',
    });
  }
  expect(meter.settle).toHaveBeenLastCalledWith('id', { status: 'unknown' });
});

it('never serves text for audio longer than was reserved', async () => {
  const { transcribe, send, meter } = setup();
  send.mockResolvedValue(json({ text: '很长', usage: { type: 'duration', seconds: 600 } }));
  await expect(transcribe(credentials, input)).resolves.toEqual({
    status: 'fallback',
    reason: 'unavailable',
  });
  expect(meter.settle).toHaveBeenCalledWith('id', {
    status: 'out-of-bounds',
    amount: 45_000_000n,
  });
});

it('times out and cancels the upload when no reply starts in time', async () => {
  vi.useFakeTimers();
  const { transcribe, send } = setup();
  send.mockImplementation(
    (_, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      ),
  );
  const pending = transcribe(credentials, input);
  await vi.advanceTimersByTimeAsync(10_000);
  await expect(pending).resolves.toEqual({ status: 'fallback', reason: 'timeout' });
  expect(send.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
});
