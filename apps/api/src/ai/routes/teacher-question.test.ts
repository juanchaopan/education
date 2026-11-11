import { describe, expect, it, vi } from 'vitest';
import { questionBodyLimit } from '@education/contracts';
import { buildApp } from '../../app.js';

const origin = 'https://education.example';
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': 'synthetic-csrf',
  cookie: '__Host-education_session=synthetic-session',
};
const url = '/api/v1/problems/garden-balance/1/question';
const ready = { status: 'ready', source: 'ai', reply: '篮子在天平旁边。' } as const;

function setup(service = vi.fn(async () => ready)) {
  return { service, app: buildApp({ origin, teacherQuestion: service }) };
}

const post = (app: ReturnType<typeof buildApp>, payload: unknown, extra = {}) =>
  app.inject({ method: 'POST', url, headers: { ...headers, ...extra }, payload: payload as never });

describe('question requests', () => {
  it('passes the child session and the question to the service, uncached', async () => {
    const { app, service } = setup();
    const reply = await post(app, { stepId: 'leaves', text: '篮子在哪里？' });
    expect(reply.statusCode).toBe(200);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.json()).toEqual(ready);
    expect(service).toHaveBeenCalledExactlyOnceWith(
      { token: 'synthetic-session', csrf: 'synthetic-csrf' },
      { id: 'garden-balance', version: 1 },
      { stepId: 'leaves', text: '篮子在哪里？' },
      expect.any(AbortSignal),
    );
    await app.close();
  });

  it('accepts the longest question with every character escaped', async () => {
    const { app } = setup();
    const text = ' '.repeat(500);
    const body = JSON.stringify({ stepId: 'leaves', text }).replaceAll(' ', '\\u2028');
    expect(body.length).toBeLessThanOrEqual(questionBodyLimit);
    expect((await post(app, body)).statusCode).toBe(200);
    await app.close();
  });

  it.each([
    ['no question', { stepId: 'leaves' }],
    ['an empty question', { stepId: 'leaves', text: '' }],
    ['too long a question', { stepId: 'leaves', text: '问'.repeat(501) }],
    ['a drawing', { stepId: 'leaves', text: '这里', image: 'AAAA' }],
    ['a bad step name', { stepId: 'Leaves', text: '为什么？' }],
  ])('rejects %s without calling the service', async (_name, payload) => {
    const { app, service } = setup();
    expect((await post(app, payload)).statusCode).toBe(400);
    expect(service).not.toHaveBeenCalled();
    await app.close();
  });

  it('refuses a body over the limit and a request from another origin', async () => {
    const { app, service } = setup();
    const padded = JSON.stringify({ stepId: 'leaves', text: '问' }) + ' '.repeat(questionBodyLimit);
    expect((await post(app, padded)).statusCode).toBe(413);
    const elsewhere = { origin: 'https://evil.example' };
    expect((await post(app, { stepId: 'leaves', text: '问' }, elsewhere)).statusCode).toBe(403);
    expect(service).not.toHaveBeenCalled();
    await app.close();
  });

  it('never sends a reply that judges or points at the screen', async () => {
    const judged = { ...ready, feedback: { status: 'correct' } };
    const { app } = setup(vi.fn(async () => judged as never));
    expect((await post(app, { stepId: 'leaves', text: '对吗？' })).statusCode).toBe(503);
    await app.close();
  });

  it('reports an unavailable service', async () => {
    const app = buildApp({ origin });
    expect((await post(app, { stepId: 'leaves', text: '问' })).statusCode).toBe(503);
    await app.close();
  });
});
