import { describe, expect, it, vi } from 'vitest';
import {
  addDays,
  type FamilyOverview,
  type LearningRange,
  type StudyDay,
  type StudyDays,
} from '@education/contracts';
import { buildApp } from '../../app.js';
import { RequestError } from '../../shared/request-error.js';
import type { FamilyOverviewService } from '../services/family-overview.js';

const cookie = '__Host-education_session=synthetic-session';
const childId = '11111111-1111-4111-8111-111111111111';
const day = (date: string): StudyDay => ({
  date,
  seconds: 0,
  problems: { independent: 0, assisted: 0, open: 0 },
  ids: [],
});
// The last day has problems on it, so each reply carries their states.
const block = Array.from({ length: 28 }, (_, place) => day(addDays('2026-10-16', place)));
block[27] = {
  ...block[27]!,
  seconds: 600,
  problems: { independent: 1, assisted: 0, open: 1 },
  ids: [
    ['garden', 'independent'],
    ['trains', 'open'],
  ],
};
const overview: FamilyOverview = {
  timeZone: 'Asia/Shanghai',
  today: '2026-11-12',
  children: [{ id: childId, days: block, earliest: null, review: [] }],
};
const range: LearningRange = {
  from: '2026-11-12',
  to: '2026-11-12',
  seconds: 0,
  problems: { independent: 0, assisted: 0, open: 0 },
  items: [],
  total: { problems: 0, seconds: 0 },
};

function setup() {
  const service = {
    overview: vi.fn(async (): Promise<FamilyOverview> => overview),
    days: vi.fn(async (): Promise<StudyDays> => ({ days: block })),
    range: vi.fn(async (): Promise<LearningRange> => range),
  } satisfies FamilyOverviewService;
  return { service, app: buildApp({ familyOverview: service }) };
}

describe('family learning routes', () => {
  it('answers with the family overview for the session, uncached', async () => {
    const { app, service } = setup();
    const reply = await app.inject({ url: '/api/v1/parents/overview', headers: { cookie } });
    expect(reply.statusCode).toBe(200);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.headers.vary).toBe('Cookie');
    expect(reply.json()).toEqual(overview);
    expect(service.overview).toHaveBeenCalledExactlyOnceWith('synthetic-session');
  });

  it("passes a child's earlier days on with the day they end", async () => {
    const { app, service } = setup();
    const reply = await app.inject({
      url: `/api/v1/parents/children/${childId}/days?to=2026-10-15`,
      headers: { cookie },
    });
    expect(reply.statusCode).toBe(200);
    expect(service.days).toHaveBeenCalledExactlyOnceWith(
      'synthetic-session',
      childId,
      '2026-10-15',
    );
  });

  it("passes a child's stretch of the learning record on with its first and last day", async () => {
    const { app, service } = setup();
    const reply = await app.inject({
      url: `/api/v1/parents/children/${childId}/learning?from=2026-11-12&to=2026-11-12`,
      headers: { cookie },
    });
    expect(reply.statusCode).toBe(200);
    expect(reply.json()).toEqual(range);
    expect(service.range).toHaveBeenCalledExactlyOnceWith(
      'synthetic-session',
      childId,
      '2026-11-12',
      '2026-11-12',
    );
  });

  it.each([
    `/api/v1/parents/children/${childId}/days`,
    `/api/v1/parents/children/${childId}/days?to=12-11-2026`,
    `/api/v1/parents/children/${childId}/days?to=2026-10-15&extra=1`,
    `/api/v1/parents/children/not-a-child/days?to=2026-10-15`,
    `/api/v1/parents/children/${childId}/learning?from=2026-11-12`,
  ])('turns away %s before the service', async (url) => {
    const { app, service } = setup();
    expect((await app.inject({ url, headers: { cookie } })).statusCode).toBe(400);
    expect(service.days).not.toHaveBeenCalled();
    expect(service.range).not.toHaveBeenCalled();
  });

  it('passes on what the service turns away', async () => {
    const { app, service } = setup();
    service.overview.mockRejectedValue(new RequestError(401, '登录状态已失效，请重新登录。'));
    service.range.mockRejectedValue(new RequestError(400, '一次最多看 7 天。'));
    expect((await app.inject({ url: '/api/v1/parents/overview' })).statusCode).toBe(401);
    const reply = await app.inject({
      url: `/api/v1/parents/children/${childId}/learning?from=2026-11-01&to=2026-11-12`,
      headers: { cookie },
    });
    expect(reply.statusCode).toBe(400);
    expect(reply.json()).toEqual({ message: '一次最多看 7 天。' });
  });

  it('is unavailable without a database', async () => {
    const app = buildApp();
    const reply = await app.inject({ url: '/api/v1/parents/overview', headers: { cookie } });
    expect(reply.statusCode).toBe(503);
    expect(reply.headers['cache-control']).toBe('no-store');
  });
});
