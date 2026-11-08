import { expect, it } from 'vitest';
import { createApplication } from './application.js';
import { createCatalog } from './catalog/services/catalog.js';

it('assembles the portable application without opening a listening socket', async () => {
  const app = await createApplication({ REGISTRATION_ENABLED: 'false' });
  try {
    expect(app.server.listening).toBe(false);
    expect((await app.inject('/health/live')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/health/ready')).statusCode).toBe(503);
    expect((await app.inject('/api/v1/problems')).json()).toEqual(createCatalog().list());
    expect((await app.inject('/api/v1/session')).statusCode).toBe(503);
  } finally {
    await app.close();
  }
});
