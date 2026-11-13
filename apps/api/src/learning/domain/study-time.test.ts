import { describe, expect, it } from 'vitest';
import { countStudy } from './study-time.js';

const shanghai = 'Asia/Shanghai';
const toronto = 'America/Toronto';
const at = (iso: string) => new Date(iso);
const later = (moment: Date, seconds: number) => new Date(moment.getTime() + seconds * 1000);
const beat = at('2026-11-12T02:00:00Z');
const stretches = (previous: Date | null, now: Date, zone: string) =>
  countStudy(previous, now, zone).stretches;

describe('the study time one heartbeat adds', () => {
  it('counts the half minute since the previous heartbeat on the local day', () => {
    expect(countStudy(beat, later(beat, 30), shanghai)).toEqual({
      stretches: [{ date: '2026-11-12', seconds: 30 }],
      countedTo: later(beat, 30),
    });
  });

  it('counts a gap of exactly 90 seconds and nothing after a longer one', () => {
    expect(stretches(beat, later(beat, 90), shanghai)).toEqual([
      { date: '2026-11-12', seconds: 90 },
    ]);
    expect(countStudy(beat, later(beat, 91), shanghai)).toEqual({
      stretches: [],
      countedTo: later(beat, 91),
    });
  });

  it('counts nothing for the first heartbeat, a repeated one or one from the past', () => {
    expect(countStudy(null, beat, shanghai)).toEqual({ stretches: [], countedTo: beat });
    expect(stretches(beat, beat, shanghai)).toEqual([]);
    expect(stretches(beat, later(beat, -20), shanghai)).toEqual([]);
  });

  it('keeps the part of a second left over for the next heartbeat', () => {
    const first = countStudy(beat, later(beat, 0.6), shanghai);
    expect(first).toEqual({ stretches: [], countedTo: beat });
    const second = countStudy(first.countedTo, later(beat, 1.2), shanghai);
    expect(second).toEqual({
      stretches: [{ date: '2026-11-12', seconds: 1 }],
      countedTo: later(beat, 1),
    });
  });

  it('splits a stretch across local midnight between the two days', () => {
    const before = at('2026-11-12T15:59:40Z'); // 23:59:40 in China
    expect(stretches(before, later(before, 30), shanghai)).toEqual([
      { date: '2026-11-12', seconds: 20 },
      { date: '2026-11-13', seconds: 10 },
    ]);
  });

  it('gives a stretch split at midnight all its whole seconds and no more', () => {
    const before = at('2026-11-12T15:59:40.400Z');
    expect(stretches(before, later(before, 30.5), shanghai)).toEqual([
      { date: '2026-11-12', seconds: 19 },
      { date: '2026-11-13', seconds: 11 },
    ]);
  });

  it('keeps counting through the hour the clocks spring forward', () => {
    // 01:59:45 becomes 03:00:15 on the wall in Toronto 30 seconds later.
    const before = at('2026-03-08T06:59:45Z');
    expect(stretches(before, later(before, 30), toronto)).toEqual([
      { date: '2026-03-08', seconds: 30 },
    ]);
  });

  it('splits at the midnight of the day the clocks fall back, which is 25 hours long', () => {
    // Midnight in Toronto between 1 and 2 November 2026 is 05:00 UTC.
    const before = at('2026-11-02T04:59:50Z');
    expect(stretches(before, later(before, 30), toronto)).toEqual([
      { date: '2026-11-01', seconds: 10 },
      { date: '2026-11-02', seconds: 20 },
    ]);
  });

  it('counts the stretch on the day of the family, not of the server', () => {
    const evening = at('2026-11-12T23:30:00Z'); // 18:30 in Toronto, 7:30 next day in China
    expect(stretches(evening, later(evening, 30), toronto)).toEqual([
      { date: '2026-11-12', seconds: 30 },
    ]);
    expect(stretches(evening, later(evening, 30), shanghai)).toEqual([
      { date: '2026-11-13', seconds: 30 },
    ]);
  });
});
