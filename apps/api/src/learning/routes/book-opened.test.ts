import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import type { MarkBookOpened } from './book-opened.js';

const origin = 'https://education.example';
const credentials = { token: 'synthetic-session', csrf: 'synthetic-csrf' };
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': credentials.csrf,
  cookie: `__Host-education_session=${credentials.token}`,
};
const url = '/api/v1/problems/garden-balance/1/opened';

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function setup(bookOpened?: MarkBookOpened) {
  const app = buildApp({ origin, bookOpened });
  apps.push(app);
  return app;
}

describe('marking a book opened', () => {
  it('passes the session and the problem on, and answers with nothing', async () => {
    const mark = vi.fn<MarkBookOpened>(async () => {});
    const reply = await setup(mark).inject({ method: 'POST', url, headers, payload: {} });
    expect(reply.statusCode).toBe(204);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(mark).toHaveBeenCalledExactlyOnceWith(credentials, { id: 'garden-balance', version: 1 });
  });

  it('takes the write only from the site, with an empty body', async () => {
    const mark = vi.fn<MarkBookOpened>(async () => {});
    const app = setup(mark);
    const send = (payload: object, from = headers) =>
      app.inject({ method: 'POST', url, headers: from, payload });
    expect((await send({}, { ...headers, origin: 'https://other.example' })).statusCode).toBe(403);
    expect((await send({ book: 'g1-math-xueersi' })).statusCode).toBe(400);
    expect((await app.inject({ url })).statusCode).toBe(404);
    expect(mark).not.toHaveBeenCalled();
  });

  it('answers nothing without accounts', async () => {
    expect((await setup().inject({ method: 'POST', url, headers, payload: {} })).statusCode).toBe(
      503,
    );
  });
});
