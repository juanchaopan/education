import { describe, expect, it, vi } from 'vitest';
import { transcriptionAudioMaxBytes } from '@education/contracts';
import { buildApp } from '../../app.js';

const origin = 'https://education.example';
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': 'synthetic-csrf',
  cookie: '__Host-education_session=synthetic-session',
};
const url = '/api/v1/problems/share-sweets/1/transcription';
const body = { stepId: 'split-evenly', format: 'webm', audio: 'GkXfowAA' } as const;
const ready = { status: 'ready', text: '每份是四。' } as const;

function setup(service = vi.fn(async () => ready as never)) {
  return { service, app: buildApp({ origin, voiceTranscription: service }) };
}

describe('transcription requests', () => {
  it('passes the child session and the bounded recording to the service, uncached', async () => {
    const { app, service } = setup();
    const reply = await app.inject({ method: 'POST', url, headers, payload: body });
    expect(reply.statusCode).toBe(200);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.json()).toEqual(ready);
    expect(service).toHaveBeenCalledExactlyOnceWith(
      { token: 'synthetic-session', csrf: 'synthetic-csrf' },
      { id: 'share-sweets', version: 1 },
      body,
      expect.any(AbortSignal),
    );
    await app.close();
  });

  it('returns unheard and fallback results as ordinary replies', async () => {
    for (const result of [{ status: 'unheard' }, { status: 'fallback', reason: 'timeout' }]) {
      const { app } = setup(vi.fn(async () => result as never));
      const reply = await app.inject({ method: 'POST', url, headers, payload: body });
      expect(reply.json()).toEqual(result);
      await app.close();
    }
  });

  it.each([
    ['no audio', { stepId: 'split-evenly', format: 'webm' }],
    ['an unsupported container', { ...body, format: 'ogg' }],
    ['audio that is not base64', { ...body, audio: 'data:audio/webm;base64,GkXf' }],
    ['a bad step name', { ...body, stepId: 'Split Evenly' }],
    [
      'oversized audio',
      { ...body, audio: 'A'.repeat(Math.ceil(transcriptionAudioMaxBytes / 3) * 4 + 4) },
    ],
    ['unknown fields', { ...body, text: '四', childId: 'other' }],
  ])('rejects %s without calling the service', async (_name, payload) => {
    const { app, service } = setup();
    const reply = await app.inject({ method: 'POST', url, headers, payload });
    expect(reply.statusCode).toBe(400);
    expect(service).not.toHaveBeenCalled();
    await app.close();
  });

  it.each([
    ['another origin', { origin: 'https://evil.example' }],
    ['a missing request marker', { 'x-education-request': '' }],
    ['a raw audio body', { 'content-type': 'audio/webm' }],
  ])('refuses %s', async (_name, extra) => {
    const { app, service } = setup();
    const reply = await app.inject({
      method: 'POST',
      url,
      headers: { ...headers, ...extra },
      payload: JSON.stringify(body),
    });
    expect(reply.statusCode).toBe(403);
    expect(service).not.toHaveBeenCalled();
    await app.close();
  });

  it('reports an unavailable service', async () => {
    const app = buildApp({ origin });
    const reply = await app.inject({ method: 'POST', url, headers, payload: body });
    expect(reply.statusCode).toBe(503);
    await app.close();
  });
});
