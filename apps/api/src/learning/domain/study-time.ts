import { addDays, localDate, startOfDay, type CalendarDate } from '@education/contracts';

// A lesson page sends a heartbeat every 30 seconds while the child is working
// on it. Two heartbeats further apart than this mean the child stopped in
// between, so that stretch is not study time.
export const longestBeatGap = 90_000;

export type StudyStretch = { date: CalendarDate; seconds: number };

// The study time one heartbeat adds: the time since the child's previous
// heartbeat, split at each local midnight of the family's time zone so every
// part counts on the day it happened, however long that day is when the
// clocks change. Nothing counts without a previous heartbeat, after a gap that
// is too long, or for a heartbeat that is not later than the previous one, as
// a repeated or crossed one from a second tab.
export function studyStretches(previous: Date | null, now: Date, timeZone: string): StudyStretch[] {
  if (!previous) return [];
  const gap = now.getTime() - previous.getTime();
  if (gap <= 0 || gap > longestBeatGap) return [];
  const stretches: StudyStretch[] = [];
  let start = previous.getTime();
  while (start < now.getTime()) {
    const date = localDate(timeZone, new Date(start));
    const end = Math.min(startOfDay(timeZone, addDays(date, 1)).getTime(), now.getTime());
    const seconds = Math.round((end - start) / 1000);
    if (seconds > 0) stretches.push({ date, seconds });
    start = end;
  }
  return stretches;
}
