import { expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyOverviewService } from '../services/family-overview.js';

const url = '/api/v1/parents/overview';
const cookie = '__Host-education_session=synthetic-session';
const child = {
  id: '11111111-1111-4111-8111-111111111111',
  total: { problems: 2, independent: 1, assisted: 1 },
  review: [{ id: 'garden', version: 1, title: '菜园天平', incorrect: 2 }],
};

it('answers with the family overview for the session, uncached', async () => {
  const service = vi.fn<FamilyOverviewService>(async () => ({ children: [child] }));
  const app = buildApp({ familyOverview: service });
  const reply = await app.inject({ url, headers: { cookie } });
  expect(reply.statusCode).toBe(200);
  expect(reply.headers['cache-control']).toBe('no-store');
  expect(reply.headers.vary).toBe('Cookie');
  expect(reply.json()).toEqual({ children: [child] });
  expect(service).toHaveBeenCalledExactlyOnceWith('synthetic-session');
  await app.close();
});

it('passes on a session the service turns away', async () => {
  const service = vi.fn<FamilyOverviewService>(async () => {
    throw new RequestError(401, '登录状态已失效，请重新登录。');
  });
  const app = buildApp({ familyOverview: service });
  const reply = await app.inject({ url });
  expect(reply.statusCode).toBe(401);
  expect(reply.json()).toEqual({ message: '登录状态已失效，请重新登录。' });
  expect(service).toHaveBeenCalledExactlyOnceWith(undefined);
  await app.close();
});

it('is unavailable without a database', async () => {
  const app = buildApp();
  const reply = await app.inject({ url, headers: { cookie } });
  expect(reply.statusCode).toBe(503);
  expect(reply.headers['cache-control']).toBe('no-store');
  await app.close();
});
