import type pg from 'pg';
import type { StudyStretch } from '../domain/study-time.js';

export type StudyBeat = { previous: Date | null; now: Date; timeZone: string };

// One child's study clock, inside the caller's transaction. Reading it locks
// the child's last heartbeat, so heartbeats from two tabs or a retried request
// take turns and never count the same stretch twice. The time is the
// database's, which every server shares.
export function studyClockFor(client: pg.PoolClient, childId: string, defaultTimeZone: string) {
  return {
    read: async (): Promise<StudyBeat> => {
      const beat = await client.query<{ beat_at: Date }>(
        'SELECT beat_at FROM study_beats WHERE child_id=$1 FOR UPDATE',
        [childId],
      );
      const { rows } = await client.query<{ now: Date; time_zone: string }>(
        `SELECT clock_timestamp() AS now,coalesce(f.time_zone,$2) AS time_zone
        FROM children c JOIN families f ON f.id=c.family_id WHERE c.id=$1`,
        [childId, defaultTimeZone],
      );
      return {
        previous: beat.rows[0]?.beat_at ?? null,
        now: rows[0]!.now,
        timeZone: rows[0]!.time_zone,
      };
    },
    // Adds the stretches and moves the clock on to the moment counted up to.
    record: async (countedTo: Date, stretches: readonly StudyStretch[]) => {
      for (const { date, seconds } of stretches)
        await client.query(
          `INSERT INTO study_days(child_id,day,seconds) VALUES($1,$2,$3)
          ON CONFLICT (child_id,day) DO UPDATE SET seconds=study_days.seconds+excluded.seconds`,
          [childId, date, seconds],
        );
      await client.query(
        `INSERT INTO study_beats(child_id,beat_at) VALUES($1,$2)
        ON CONFLICT (child_id) DO UPDATE SET beat_at=greatest(study_beats.beat_at,excluded.beat_at)`,
        [childId, countedTo],
      );
    },
  };
}

export type StudyClock = ReturnType<typeof studyClockFor>;

// Every day a child has study time, from the earliest, as the family export
// lists them.
export async function readStudyDays(client: pg.PoolClient, childId: string) {
  const { rows } = await client.query<{ date: string; seconds: number }>(
    `SELECT to_char(day,'YYYY-MM-DD') AS date,seconds FROM study_days
    WHERE child_id=$1 AND seconds>0 ORDER BY day`,
    [childId],
  );
  return rows;
}
