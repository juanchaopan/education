import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { readConfig } from './shared/config.js';

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('framework HTTP contract', () => {
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
  it('enables paid AI by default without making a provider call', () => {
    expect(readConfig({}).paidAiEnabled).toBe(true);
    expect(readConfig({ PAID_AI_ENABLED: 'false' }).paidAiEnabled).toBe(false);
    expect(() => readConfig({ PAID_AI_ENABLED: 'yes' })).toThrow();
    expect(() => readConfig({ PORT: 'invalid' })).toThrow();
  });
});
