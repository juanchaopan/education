import { afterEach, describe, expect, it, vi } from 'vitest';
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
  it('answers no API request while the database is not ready, and reopens with it', async () => {
    let healthy = false;
    const app = buildApp({ ready: async () => healthy, revision: 'b'.repeat(40) });
    apps.push(app);
    const closed = await app.inject('/api/v1/problems');
    expect(closed.statusCode).toBe(503);
    expect(closed.json()).toEqual({ message: '网站正在维护，请稍后再试。' });
    expect(closed.headers['cache-control']).toBe('no-store');
    expect(closed.headers['retry-after']).toBe('300');
    expect((await app.inject('/version.json')).statusCode).toBe(200);
    expect((await app.inject('/health/live')).statusCode).toBe(200);
    healthy = true;
    expect((await app.inject('/api/v1/problems')).statusCode).toBe(200);
  });
  it('treats a failed readiness check as closed for API requests', async () => {
    const app = buildApp({
      ready: async () => {
        throw new Error('relation "service_gate" does not exist');
      },
    });
    apps.push(app);
    const warning = vi.spyOn(app.log, 'warn');
    expect((await app.inject('/api/v1/problems')).statusCode).toBe(503);
    expect(JSON.stringify(warning.mock.calls)).not.toContain('service_gate');
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
  it('logs only an allowlisted connection category, never the private database error', async () => {
    const privateMessage = 'private postgres://user:password@database connection timed out';
    for (const [error, code] of [
      [
        Object.assign(new Error(privateMessage), { code: 'SELF_SIGNED_CERT_IN_CHAIN' }),
        'SELF_SIGNED_CERT_IN_CHAIN',
      ],
      [new Error(privateMessage), 'TIMEOUT'],
      [Object.assign(new Error('private password'), { code: 'private-password' }), 'UNKNOWN'],
    ] as const) {
      const app = buildApp({
        ready: async () => {
          throw error;
        },
      });
      apps.push(app);
      const warning = vi.spyOn(app.log, 'warn');
      const response = await app.inject('/health/ready');
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'unavailable' });
      expect(warning).toHaveBeenCalledWith({ code }, 'Database readiness unavailable');
      expect(JSON.stringify(warning.mock.calls)).not.toContain('password');
    }
  });
  it('enables paid AI by default without making a provider call', () => {
    expect(readConfig({}).paidAiEnabled).toBe(true);
    expect(readConfig({ PAID_AI_ENABLED: 'false' }).paidAiEnabled).toBe(false);
    expect(() => readConfig({ PAID_AI_ENABLED: 'yes' })).toThrow();
    expect(() => readConfig({ PORT: 'invalid' })).toThrow();
  });
});
