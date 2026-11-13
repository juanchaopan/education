import { describe, expect, it } from 'vitest';
import { blockEnding, blockIssue, rangeIssue, stateOfRank, studyDays } from './study-days.js';

describe('the days of a block', () => {
  it('ends a block of 28 days on the day asked for', () => {
    expect(blockEnding('2026-11-12')).toEqual({ from: '2026-10-16', to: '2026-11-12' });
  });

  it('lists every day, the empty ones too, with each problem once in its state', () => {
    const days = studyDays('2026-11-10', '2026-11-12', {
      seconds: new Map([['2026-11-12', 720]]),
      outcomes: new Map([
        [
          '2026-11-12',
          [
            ['pattern', 'open'],
            ['garden', 'independent'],
          ],
        ],
        ['2026-11-10', [['garden', 'assisted']]],
      ]),
    });
    expect(days).toEqual([
      {
        date: '2026-11-10',
        seconds: 0,
        problems: { independent: 0, assisted: 1, open: 0 },
        ids: [['garden', 'assisted']],
      },
      {
        date: '2026-11-11',
        seconds: 0,
        problems: { independent: 0, assisted: 0, open: 0 },
        ids: [],
      },
      {
        date: '2026-11-12',
        seconds: 720,
        problems: { independent: 1, assisted: 0, open: 1 },
        ids: [
          ['garden', 'independent'],
          ['pattern', 'open'],
        ],
      },
    ]);
  });

  it('runs across the end of a month and of a year', () => {
    const days = studyDays('2026-12-30', '2027-01-02', { seconds: new Map(), outcomes: new Map() });
    expect(days.map(({ date }) => date)).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('reads the rank the database gives each answer as a state', () => {
    expect([2, 1, 0].map(stateOfRank)).toEqual(['independent', 'assisted', 'open']);
  });
});

describe('the days a parent may ask for', () => {
  const today = '2026-11-12';

  it('takes a real day up to today for a block', () => {
    expect(blockIssue('2026-11-12', today)).toBeUndefined();
    expect(blockIssue('2026-11-13', today)).toBe('还没有到这一天。');
    expect(blockIssue('2026-02-30', today)).toBe('日期不对，请刷新页面。');
  });

  it('takes one to seven days up to today for the learning record', () => {
    expect(rangeIssue('2026-11-12', '2026-11-12', today)).toBeUndefined();
    expect(rangeIssue('2026-11-06', '2026-11-12', today)).toBeUndefined();
    expect(rangeIssue('2026-11-05', '2026-11-12', today)).toBe('一次最多看 7 天。');
    expect(rangeIssue('2026-11-12', '2026-11-11', today)).toBe('开始的日子不能晚于结束的日子。');
    expect(rangeIssue('2026-11-12', '2026-11-13', today)).toBe('还没有到这一天。');
  });
});
