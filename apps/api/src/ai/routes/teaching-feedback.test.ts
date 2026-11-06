import { describe, expect, it, vi } from 'vitest';
import { feedbackImageMaxBytes } from '@education/contracts';
import { buildApp } from '../../app.js';
import { RequestError } from '../../shared/request-error.js';

const origin = 'https://education.example';
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': 'synthetic-csrf',
  cookie: '__Host-education_session=synthetic-session',
};
const url = '/api/v1/problems/count-dots/1/feedback';
const ready = {
  status: 'ready',
  source: 'rules',
  feedback: { status: 'correct', instruction: '数对了！', stepId: 'count-left' },
} as const;

function setup(service = vi.fn(async () => ready)) {
  return { service, app: buildApp({ origin, teachingFeedback: service }) };
}

describe('feedback requests', () => {
  it('passes the child session and the bounded submission to the service, uncached', async () => {
    const { app, service } = setup();
    const reply = await app.inject({
      method: 'POST',
      url,
      headers,
      payload: { stepId: 'count-left', text: '三个' },
    });
    expect(reply.statusCode).toBe(200);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.json()).toEqual(ready);
    expect(service).toHaveBeenCalledExactlyOnceWith(
      { token: 'synthetic-session', csrf: 'synthetic-csrf' },
      { id: 'count-dots', version: 1 },
      { stepId: 'count-left', text: '三个' },
      expect.any(AbortSignal),
    );
    await app.close();
  });

  it('accepts a drawing alone and reports fallbacks as ordinary guidance results', async () => {
    const { app, service } = setup(
      vi.fn(async () => ({ status: 'fallback', reason: 'usage-limited' }) as never),
    );
    const reply = await app.inject({
      method: 'POST',
      url,
      headers,
      payload: { stepId: 'count-left', image: 'AAAA' },
    });
    expect(reply.json()).toEqual({ status: 'fallback', reason: 'usage-limited' });
    expect(service).toHaveBeenCalledOnce();
    await app.close();
  });

  it.each([
    ['nothing submitted', { stepId: 'count-left' }],
    ['too much text', { stepId: 'count-left', text: '答'.repeat(501) }],
    ['empty text', { stepId: 'count-left', text: '' }],
    ['a bad step name', { stepId: 'Count Left', text: '三个' }],
    ['an image that is not base64', { stepId: 'count-left', image: 'data:image/png;base64,AA' }],
    [
      'an oversized image',
      { stepId: 'count-left', image: 'A'.repeat(Math.ceil(feedbackImageMaxBytes / 3) * 4 + 4) },
    ],
    ['unknown fields', { stepId: 'count-left', text: '三个', childId: 'other', progress: 'done' }],
  ])('rejects %s without calling the service', async (_name, payload) => {
    const { app, service } = setup();
    const reply = await app.inject({ method: 'POST', url, headers, payload });
    expect(reply.statusCode).toBe(400);
    expect(service).not.toHaveBeenCalled();
    await app.close();
  });

  it.each([
    ['another origin', { origin: 'https://evil.example' }],
    ['a missing origin', { origin: '' }],
    ['a missing request marker', { 'x-education-request': '' }],
    ['a non-JSON body type', { 'content-type': 'text/plain' }],
  ])('refuses %s', async (_name, extra) => {
    const { app, service } = setup();
    const reply = await app.inject({
      method: 'POST',
      url,
      headers: { ...headers, ...extra },
      payload: JSON.stringify({ stepId: 'count-left', text: '三个' }),
    });
    expect(reply.statusCode).toBe(403);
    expect(service).not.toHaveBeenCalled();
    await app.close();
  });

  it('does not offer the endpoint for reading and rejects malformed versions', async () => {
    const { app, service } = setup();
    expect((await app.inject({ url })).statusCode).toBe(404);
    const reply = await app.inject({
      method: 'POST',
      url: '/api/v1/problems/count-dots/01/feedback',
      headers,
      payload: { stepId: 'count-left', text: '三个' },
    });
    expect(reply.statusCode).toBe(400);
    expect(service).not.toHaveBeenCalled();
    await app.close();
  });

  it('turns service errors into plain messages and reports an unavailable service', async () => {
    const { app } = setup(
      vi.fn(async () => {
        throw new RequestError(401, '登录已失效，请重新登录。');
      }),
    );
    const denied = await app.inject({
      method: 'POST',
      url,
      headers,
      payload: { stepId: 'count-left', text: '三个' },
    });
    expect(denied.statusCode).toBe(401);
    expect(denied.json()).toEqual({ message: '登录已失效，请重新登录。' });
    await app.close();
    const unavailable = buildApp({ origin });
    const reply = await unavailable.inject({
      method: 'POST',
      url,
      headers,
      payload: { stepId: 'count-left', text: '三个' },
    });
    expect(reply.statusCode).toBe(503);
    await unavailable.close();
  });
});
