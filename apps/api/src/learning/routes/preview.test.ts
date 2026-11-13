import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import type { PreviewService } from '../services/preview.js';

const origin = 'https://education.example';
const credentials = { token: 'synthetic-session', csrf: 'synthetic-csrf' };
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': credentials.csrf,
  cookie: `__Host-education_session=${credentials.token}`,
};
const url = '/api/v1/problems/garden-balance/1/preview';

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function setup(preview?: PreviewService) {
  const app = buildApp({ origin, preview });
  apps.push(app);
  return app;
}

describe('previewing an answer', () => {
  it('passes the session, the problem and the command to the service, uncached', async () => {
    const preview = vi.fn<PreviewService>(async () => ({ outcome: 'independent' }));
    const reply = await setup(preview).inject({
      method: 'POST',
      url,
      headers,
      payload: { action: 'submit', input: 9 },
    });
    expect(reply.statusCode).toBe(200);
    expect(reply.json()).toEqual({ outcome: 'independent' });
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.headers.vary).toBe('Cookie');
    expect(preview).toHaveBeenCalledExactlyOnceWith(
      credentials,
      { id: 'garden-balance', version: 1 },
      { action: 'submit', input: 9 },
    );
  });

  it('takes a write only from the site, and only a submit or a hint with nothing else', async () => {
    const preview = vi.fn<PreviewService>(async () => ({ hint: '先数左边。' }));
    const app = setup(preview);
    const send = (payload: object, from = headers) =>
      app.inject({ method: 'POST', url, headers: from, payload });
    expect(
      (
        await send(
          { action: 'hint', hintId: 'count' },
          { ...headers, origin: 'https://other.example' },
        )
      ).statusCode,
    ).toBe(403);
    expect((await send({ action: 'question' })).statusCode).toBe(400);
    expect(
      (await send({ action: 'submit', input: 9, round: crypto.randomUUID() })).statusCode,
    ).toBe(400);
    expect((await send({ action: 'hint', hintId: 'not an id' })).statusCode).toBe(400);
    expect(preview).not.toHaveBeenCalled();
  });

  it('answers nothing without accounts', async () => {
    const reply = await setup().inject({
      method: 'POST',
      url,
      headers,
      payload: { action: 'submit', input: 9 },
    });
    expect(reply.statusCode).toBe(503);
  });
});
