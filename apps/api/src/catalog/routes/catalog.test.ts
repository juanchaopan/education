import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProblemOpening } from '@education/contracts';
import { registerCatalog, type OpenProblem } from './catalog.js';

const opened: ProblemOpening = {
  id: 'shape-a',
  version: 1,
  title: '旧版本',
  sequence: 1,
  grade: '二年级',
  subject: '数学',
  category: '图形',
  mode: 'practice',
  book: 'shapes',
};

const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function catalogApp(open?: OpenProblem) {
  const app = Fastify();
  apps.push(app);
  registerCatalog(app, open);
  return app;
}

describe('opening a problem', () => {
  it('opens the version asked for under the session the request carries', async () => {
    const open = vi.fn<OpenProblem>(async () => opened);
    const response = await catalogApp(open).inject({
      url: '/api/v1/problems/shape-a/1',
      headers: { cookie: '__Host-education_session=synthetic', 'x-csrf-token': 'csrf' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(opened);
    expect(open).toHaveBeenCalledExactlyOnceWith(
      { token: 'synthetic', csrf: 'csrf' },
      { id: 'shape-a', version: 1 },
    );
  });

  it('keeps the reply out of every cache and apart for each session', async () => {
    const response = await catalogApp(async () => opened).inject('/api/v1/problems/shape-a/1');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.vary).toBe('Cookie');
  });

  it('sends the problem without anything the server keeps to itself', async () => {
    const open: OpenProblem = async () =>
      ({ ...opened, checkStep: 'private-answer-rule-sentinel' }) as ProblemOpening;
    const response = await catalogApp(open).inject('/api/v1/problems/shape-a/1');
    expect(response.body).not.toContain('private-answer-rule-sentinel');
  });

  it('opens nothing for anyone without accounts', async () => {
    const response = await catalogApp().inject('/api/v1/problems/shape-a/1');
    expect(response.statusCode).toBe(401);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('asks nothing of the session for a version that cannot be written', async () => {
    const open = vi.fn<OpenProblem>(async () => opened);
    const app = catalogApp(open);
    expect((await app.inject('/api/v1/problems/shape-a/01')).statusCode).toBe(400);
    expect((await app.inject('/api/v1/problems/Shape/1')).statusCode).toBe(400);
    expect((await app.inject('/api/v1/problems/shape-a/9007199254740993')).statusCode).toBe(404);
    expect(open).not.toHaveBeenCalled();
  });
});
