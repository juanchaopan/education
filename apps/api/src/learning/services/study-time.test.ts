import { expect, it, vi } from 'vitest';
import type { StudyBeat, StudyClock } from '../repositories/postgres-study-time.js';
import { createStudyTimeService } from './study-time.js';

const credentials = { token: 'token', csrf: 'csrf' };
const now = new Date('2026-11-12T02:00:30Z');

function clock(previous: Date | null) {
  const beat: StudyBeat = { previous, now, timeZone: 'Asia/Shanghai' };
  return { read: vi.fn(async () => beat), record: vi.fn(async () => {}) } satisfies StudyClock;
}

it('adds the time since the previous heartbeat and moves the heartbeat on', async () => {
  const child = clock(new Date('2026-11-12T02:00:00Z'));
  await createStudyTimeService((_credentials, work) => work(child))(credentials);
  expect(child.record).toHaveBeenCalledExactlyOnceWith(now, [{ date: '2026-11-12', seconds: 30 }]);
});

it('only starts the clock with the first heartbeat', async () => {
  const child = clock(null);
  await createStudyTimeService((_credentials, work) => work(child))(credentials);
  expect(child.record).toHaveBeenCalledExactlyOnceWith(now, []);
});

it('hands the session over to be checked before the clock is read', async () => {
  const withClock = vi.fn(async () => true as const);
  await createStudyTimeService(withClock)(credentials);
  expect(withClock).toHaveBeenCalledWith(credentials, expect.any(Function));
});
