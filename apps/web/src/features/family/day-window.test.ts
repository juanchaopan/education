import { describe, expect, it } from 'vitest';
import type { StudyDay } from '@education/contracts';
import { canGoBack, daysShown, earlierBlocks, recordAddress, shownDates } from './day-window';

const today = '2026-11-12';
// The overview's block: the 28 days from 16 October to today.
const overviewFirst = '2026-10-16';

describe("the days a child's card shows", () => {
  it('shows today and the six days before it, then one day earlier per step', () => {
    expect(shownDates(today)).toEqual([
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
    expect(shownDates('2026-11-11')[0]).toBe('2026-11-05');
  });

  it("moves back until the child's first day is the first day shown", () => {
    expect(canGoBack(today, '2026-11-05')).toBe(true);
    expect(canGoBack('2026-11-11', '2026-11-05')).toBe(false);
    expect(canGoBack(today, null)).toBe(false);
  });

  it('waits until all seven days shown have arrived', () => {
    const day = (date: string): StudyDay => ({
      date,
      seconds: 60,
      problems: { independent: 0, assisted: 0, open: 0 },
      ids: [],
    });
    const loaded = new Map(shownDates(today).map((date) => [date, day(date)]));
    expect(daysShown(today, loaded)?.map(({ date }) => date)).toEqual(shownDates(today));
    expect(daysShown('2026-11-11', loaded)).toBeUndefined();
  });
});

describe('earlier blocks of days', () => {
  it('reads nothing more while the days shown are well inside the overview', () => {
    expect(earlierBlocks(overviewFirst, today, '2026-01-01')).toEqual([]);
    expect(earlierBlocks(overviewFirst, '2026-10-29', '2026-01-01')).toEqual([]);
  });

  it('reads the block before once the days shown come within a week of the first loaded', () => {
    expect(earlierBlocks(overviewFirst, '2026-10-28', '2026-01-01')).toEqual(['2026-10-15']);
  });

  it('keeps every block read on the way back, and one ahead', () => {
    expect(earlierBlocks(overviewFirst, '2026-09-30', '2026-01-01')).toEqual([
      '2026-10-15',
      '2026-09-17',
    ]);
  });

  it("never reads blocks before the child's first day, or for a child without a record", () => {
    expect(earlierBlocks(overviewFirst, '2026-10-28', '2026-10-16')).toEqual([]);
    expect(earlierBlocks(overviewFirst, '2026-10-28', '2026-10-10')).toEqual(['2026-10-15']);
    expect(earlierBlocks(overviewFirst, '2026-10-28', null)).toEqual([]);
  });
});

describe("the record's address", () => {
  const child = '11111111-1111-4111-8111-111111111111';

  it('names the seven days shown, or the one day picked', () => {
    expect(recordAddress(child, today)).toBe(
      `/family/learning?child=${child}&from=2026-11-06&to=2026-11-12`,
    );
    expect(recordAddress(child, today, '2026-11-08')).toBe(
      `/family/learning?child=${child}&from=2026-11-08&to=2026-11-08`,
    );
    expect(recordAddress(child)).toBe(`/family/learning?child=${child}`);
  });
});
