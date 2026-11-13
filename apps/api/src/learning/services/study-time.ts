import { countStudy } from '../domain/study-time.js';
import type { StudyClock } from '../repositories/postgres-study-time.js';

type Credentials = { token?: string; csrf?: string };
type WithStudyClock = (
  credentials: Credentials,
  work: (clock: StudyClock) => Promise<true>,
) => Promise<true>;

// A heartbeat from a lesson page the child is working on: the time since the
// clock last counted is added to the days it fell on, unless the heartbeats
// are too far apart, and the clock moves on to where it has counted.
export function createStudyTimeService(withStudyClock: WithStudyClock) {
  return async (credentials: Credentials) => {
    await withStudyClock(credentials, async (clock) => {
      const { previous, now, timeZone } = await clock.read();
      const { stretches, countedTo } = countStudy(previous, now, timeZone);
      await clock.record(countedTo, stretches);
      return true;
    });
  };
}

export type StudyTimeService = ReturnType<typeof createStudyTimeService>;
