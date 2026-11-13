import type pg from 'pg';
import { childSessionTransaction } from './child-session-transaction.js';
import { studyClockFor } from './learning/repositories/postgres-study-time.js';
import { createStudyTimeService } from './learning/services/study-time.js';

export function createStudyTime(pool: pg.Pool, defaultTimeZone: string) {
  const authorized = childSessionTransaction(pool);
  return createStudyTimeService((credentials, work) =>
    authorized(credentials, (client, childId) =>
      work(studyClockFor(client, childId, defaultTimeZone)),
    ),
  );
}
