import { describe, expect, it } from 'vitest';
import { books, indexBooks, type Book } from './books.js';
import { createProblemRegistry, type ProblemPlugin } from './plugin.js';

const book = (fields: Partial<Book> = {}): Book => ({
  id: 'fixture-book',
  grade: '一年级',
  subject: '数学',
  category: '规律',
  ...fields,
});

const plugin = (bookId: string): ProblemPlugin => ({
  summary: { id: 'fixture-problem', version: 1, title: '辨认规律', book: bookId, sequence: 1 },
});

describe('books', () => {
  it('keeps the maintained books well formed', () => {
    expect(indexBooks(books).size).toBe(books.length);
  });

  it('rejects malformed and repeated ids, unlisted grades and subjects, and repeated places', () => {
    expect(() => indexBooks([book({ id: 'Bad Id' })])).toThrow('Invalid book id: Bad Id');
    expect(() => indexBooks([book(), book()])).toThrow('Duplicate book: fixture-book');
    expect(() => indexBooks([book({ grade: '1年级' })])).toThrow('Unknown grade');
    expect(() => indexBooks([book({ subject: '体育' })])).toThrow('Unknown subject');
    expect(() => indexBooks([book(), book({ id: 'other-book' })])).toThrow('Two books file');
  });

  it("files each problem under its book's grade, subject and category", () => {
    const registry = createProblemRegistry([plugin('fixture-book')], [book()]);
    expect(registry.summary('fixture-problem', 1)).toEqual({
      id: 'fixture-problem',
      version: 1,
      title: '辨认规律',
      sequence: 1,
      grade: '一年级',
      subject: '数学',
      category: '规律',
    });
    expect(registry.current).toEqual([registry.summary('fixture-problem', 1)]);
  });

  it('rejects a problem that names a book the registry does not hold', () => {
    expect(() => createProblemRegistry([plugin('missing-book')], [book()])).toThrow(
      'Problem fixture-problem/1 names an unknown book: missing-book',
    );
  });
});
