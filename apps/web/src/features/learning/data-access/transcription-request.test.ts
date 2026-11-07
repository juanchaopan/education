import { afterEach, expect, it, vi } from 'vitest';
import { transcriptionAudioMaxBytes } from '@education/contracts';
import { requestTranscription } from './transcription-request';

const scope = { id: 'share-sweets', version: 1, csrf: 'session-token' };
const audio = new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], { type: 'audio/webm' });
const recording = { audio, format: 'webm' } as const;
afterEach(() => vi.unstubAllGlobals());

it('posts the step, the container and the recording as base64 with the session headers', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ status: 'ready', text: '每份是四。' }));
  vi.stubGlobal('fetch', fetch);
  await expect(requestTranscription(scope, { stepId: 'split-evenly', recording })).resolves.toEqual(
    { status: 'ready', text: '每份是四。' },
  );
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe('/api/v1/problems/share-sweets/1/transcription');
  expect(init).toMatchObject({
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': 'session-token', 'X-Education-Request': 'session' },
  });
  expect(JSON.parse(init.body)).toEqual({
    stepId: 'split-evenly',
    format: 'webm',
    audio: 'GkXfow==',
  });
});

it('keeps an oversized or empty recording in the browser', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const large = new Blob([new Uint8Array(transcriptionAudioMaxBytes + 1)]);
  for (const audio of [large, new Blob([])])
    await expect(
      requestTranscription(scope, { stepId: 'split-evenly', recording: { audio, format: 'webm' } }),
    ).resolves.toEqual({ status: 'fallback', reason: 'invalid-input' });
  expect(fetch).not.toHaveBeenCalled();
});

it('passes unheard and fallback replies through and rejects anything else', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const ask = () => requestTranscription(scope, { stepId: 'split-evenly', recording });
  fetch.mockResolvedValueOnce(Response.json({ status: 'unheard' }));
  await expect(ask()).resolves.toEqual({ status: 'unheard' });
  fetch.mockResolvedValueOnce(Response.json({ status: 'fallback', reason: 'unauthorized' }));
  await expect(ask()).resolves.toEqual({ status: 'fallback', reason: 'unauthorized' });
  fetch.mockResolvedValueOnce(Response.json({ status: 'ready', text: '<b>四</b>', extra: 1 }));
  await expect(ask()).rejects.toThrow();
  fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
  await expect(ask()).rejects.toThrow();
});
