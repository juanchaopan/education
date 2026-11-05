import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { readConfig } from './shared/config.js';

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('framework HTTP contract', () => {
  it('reports the immutable release revision without caching it', async () => {
    const app = buildApp({ revision: 'a'.repeat(40) });
    apps.push(app);
    const response = await app.inject('/version.json');
    expect(response.json()).toEqual({ revision: 'a'.repeat(40) });
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('serves an empty catalog, with no invented demo content', async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject('/api/v1/problems');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ problems: [] });
  });
  it('reports liveness without claiming database or AI readiness', async () => {
    const app = buildApp();
    apps.push(app);
    expect((await app.inject('/health/live')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/api/v1/children')).statusCode).toBe(404);
  });
  it('keeps liveness independent and readiness closed until the database schema is ready', async () => {
    let healthy = false;
    const app = buildApp({ ready: async () => healthy });
    apps.push(app);
    expect((await app.inject('/health/ready')).statusCode).toBe(503);
    healthy = true;
    const response = await app.inject('/health/ready');
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual({ status: 'ready' });
    expect((await app.inject('/health/live')).statusCode).toBe(200);
  });
  it('does not reveal database errors or report readiness without a configured check', async () => {
    for (const ready of [
      undefined,
      async () => {
        throw new Error('secret database URL');
      },
    ]) {
      const app = buildApp({ ready });
      apps.push(app);
      const response = await app.inject('/health/ready');
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'unavailable' });
      expect(response.headers['cache-control']).toBe('no-store');
    }
  });
  it('enables paid AI by default without making a provider call', () => {
    expect(readConfig({}).paidAiEnabled).toBe(true);
    expect(readConfig({ PAID_AI_ENABLED: 'false' }).paidAiEnabled).toBe(false);
    expect(() => readConfig({ PAID_AI_ENABLED: 'yes' })).toThrow();
    expect(() => readConfig({ PORT: 'invalid' })).toThrow();
  });
});
