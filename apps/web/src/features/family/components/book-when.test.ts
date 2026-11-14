import { describe, expect, it } from 'vitest';
import { ago, bookWhen } from './book-when';

const now = new Date(2026, 10, 20, 9, 30);
const at = (day: number, hour = 20) => new Date(2026, 10, day, hour).toISOString();

describe('how long ago', () => {
  it.each([
    [0, '今天'],
    [1, '昨天'],
    [3, '3 天前'],
    [7, '上周'],
    [13, '上周'],
    [14, '2 周前'],
    [29, '4 周前'],
    [30, '1 个月前'],
    [75, '2 个月前'],
  ])('says %i days as %s', (days, words) => {
    expect(ago(days)).toBe(words);
  });
});

describe('when a book was given or studied', () => {
  it('says when a new book was given, counting calendar days', () => {
    expect(bookWhen({ fresh: true, assignedAt: at(20, 8), studiedAt: null }, now)).toBe('刚刚安排');
    expect(bookWhen({ fresh: true, assignedAt: at(19, 23), studiedAt: null }, now)).toBe(
      '昨天安排',
    );
    expect(bookWhen({ fresh: true, assignedAt: at(17), studiedAt: null }, now)).toBe('3 天前安排');
  });

  it('says when an opened book was last studied, or that nothing is answered yet', () => {
    expect(bookWhen({ fresh: false, assignedAt: at(1), studiedAt: at(20, 7) }, now)).toBe(
      '今天学过',
    );
    expect(bookWhen({ fresh: false, assignedAt: at(1), studiedAt: at(12) }, now)).toBe('上周学过');
    expect(bookWhen({ fresh: false, assignedAt: at(1), studiedAt: null }, now)).toBe('还没做');
  });
});
