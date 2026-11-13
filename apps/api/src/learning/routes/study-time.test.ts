import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { RequestError } from '../../shared/request-error.js';
import type { StudyTimeService } from '../services/study-time.js';

const origin = 'http://127.0.0.1:5173';
const headers = {
  origin,
  'content-type': 'application/json',
  'x-education-request': 'session',
  'x-csrf-token': 'csrf',
  cookie: '__Host-education_session=token',
};
const beat = (studyTime?: StudyTimeService, custom = headers, payload: object = {}) =>
  buildApp({ origin, studyTime }).inject({
    method: 'POST',
    url: '/api/v1/children/study-time',
    headers: custom,
    payload,
  });

describe('study time heartbeats', () => {
  it("passes the child's session on and answers with no content", async () => {
    const service = vi.fn<StudyTimeService>(async () => {});
    const reply = await beat(service);
    expect(reply.statusCode).toBe(204);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(service).toHaveBeenCalledExactlyOnceWith({ token: 'token', csrf: 'csrf' });
  });

  it('turns away a heartbeat from another site, or one that names its own time', async () => {
    const service = vi.fn<StudyTimeService>(async () => {});
    const elsewhere = { ...headers, origin: 'https://elsewhere.example' };
    expect((await beat(service, elsewhere)).statusCode).toBe(403);
    expect((await beat(service, headers, { seconds: 600 })).statusCode).toBe(400);
    expect(service).not.toHaveBeenCalled();
  });

  it('passes on a child session the service turns away', async () => {
    const service = vi.fn<StudyTimeService>(async () => {
      throw new RequestError(401, '登录已失效，请重新登录。');
    });
    expect((await beat(service)).statusCode).toBe(401);
  });

  it('is unavailable without a database', async () => {
    expect((await beat()).statusCode).toBe(503);
  });
});
