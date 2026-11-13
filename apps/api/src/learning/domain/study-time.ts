import { addDays, localDate, startOfDay, type CalendarDate } from '@education/contracts';

// A lesson page sends a heartbeat every 30 seconds while the child is working
// on it. Two heartbeats further apart than this mean the child stopped in
// between, so that stretch is not study time.
export const longestBeatGap = 90_000;

export type StudyStretch = { date: CalendarDate; seconds: number };

// What one heartbeat adds: whole seconds on the days they fell on, and the
// moment the clock has counted up to, which the next heartbeat counts from.
export type StudyCount = { stretches: StudyStretch[]; countedTo: Date };

// The study time one heartbeat adds: the whole seconds since the time counted
// so far, split at each local midnight of the family's time zone so every
// part counts on the day it happened, however long that day is when the
// clocks change. The part of a second left over stays for the next heartbeat,
// so heartbeats close together from two tabs lose nothing. Nothing counts
// without a previous heartbeat, after a gap that is too long, or for a
// heartbeat that is not later than the previous one; the clock then starts
// again from this heartbeat.
export function countStudy(previous: Date | null, now: Date, timeZone: string): StudyCount {
  const gap = previous ? now.getTime() - previous.getTime() : 0;
  if (!previous || gap <= 0 || gap > longestBeatGap) return { stretches: [], countedTo: now };
  const from = previous.getTime();
  const to = from + Math.floor(gap / 1000) * 1000;
  const counted = (instant: number) => Math.floor((instant - from) / 1000);
  const stretches: StudyStretch[] = [];
  let start = from;
  while (start < to) {
    const date = localDate(timeZone, new Date(start));
    const midnight = startOfDay(timeZone, addDays(date, 1)).getTime();
    const end = midnight > start ? Math.min(midnight, to) : to;
    const seconds = counted(end) - counted(start);
    if (seconds > 0) stretches.push({ date, seconds });
    start = end;
  }
  return { stretches, countedTo: new Date(to) };
}
