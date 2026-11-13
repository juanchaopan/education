import { studyStretches } from '../domain/study-time.js';
import type { StudyClock } from '../repositories/postgres-study-time.js';

type Credentials = { token?: string; csrf?: string };
type WithStudyClock = (
  credentials: Credentials,
  work: (clock: StudyClock) => Promise<true>,
) => Promise<true>;

// A heartbeat from a lesson page the child is working on: the time since the
// child's previous heartbeat is added to the days it fell on, unless the two
// are too far apart, and this heartbeat becomes the previous one.
export function createStudyTimeService(withStudyClock: WithStudyClock) {
  return async (credentials: Credentials) => {
    await withStudyClock(credentials, async (clock) => {
      const { previous, now, timeZone } = await clock.read();
      await clock.record(now, studyStretches(previous, now, timeZone));
      return true;
    });
  };
}

export type StudyTimeService = ReturnType<typeof createStudyTimeService>;
