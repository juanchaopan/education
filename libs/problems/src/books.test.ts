import { describe, expect, it } from 'vitest';
import type { BookStatus } from '@education/contracts';
import { bookStatus, books, indexBooks, type Book } from './books.js';
import { createProblemRegistry, type ProblemPlugin } from './plugin.js';

const book = (fields: Partial<Book> = {}): Book => ({
  id: 'fixture-book',
  grade: '一年级',
  subject: '数学',
  category: '规律',
  ...fields,
});

const plugin = (bookId: string, fields: Partial<ProblemPlugin['summary']> = {}): ProblemPlugin => ({
  summary: {
    id: 'fixture-problem',
    version: 1,
    title: '辨认规律',
    book: bookId,
    sequence: 1,
    ...fields,
  },
});

describe('books', () => {
  it('keeps the maintained books well formed', () => {
    expect(indexBooks(books).size).toBe(books.length);
  });

  it('rejects malformed and repeated ids, unlisted grades, subjects and statuses, and repeated places', () => {
    expect(() => indexBooks([book({ id: 'Bad Id' })])).toThrow('Invalid book id: Bad Id');
    expect(() => indexBooks([book(), book()])).toThrow('Duplicate book: fixture-book');
    expect(() => indexBooks([book({ grade: '1年级' })])).toThrow('Unknown grade');
    expect(() => indexBooks([book({ subject: '体育' })])).toThrow('Unknown subject');
    const status = 'withdrawn' as BookStatus;
    expect(() => indexBooks([book({ status })])).toThrow('Unknown status');
    expect(() => indexBooks([book(), book({ id: 'other-book' })])).toThrow('Two books file');
  });

  it('treats a book without a status as available', () => {
    expect(bookStatus(book())).toBe('available');
    expect(bookStatus(book({ status: 'unavailable' }))).toBe('unavailable');
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
    expect(registry.books).toEqual([book()]);
  });

  it("lists a book's problems at their latest version, in the book's order", () => {
    const other = book({ id: 'other-book', category: '图形' });
    const registry = createProblemRegistry(
      [
        plugin('fixture-book', { id: 'third', sequence: 3 }),
        plugin('fixture-book', { id: 'first', sequence: 1 }),
        plugin('fixture-book', { id: 'first', version: 2, title: '新版本', sequence: 1 }),
        plugin('other-book', { id: 'elsewhere' }),
        plugin('fixture-book', { id: 'moved' }),
        plugin('other-book', { id: 'moved', version: 2 }),
      ],
      [book(), other],
    );
    expect(registry.problemsOf('fixture-book').map(({ id, version }) => [id, version])).toEqual([
      ['first', 2],
      ['third', 1],
    ]);
    expect(registry.problemsOf('other-book').map(({ id }) => id)).toEqual(['elsewhere', 'moved']);
    expect(registry.problemsOf('missing-book')).toEqual([]);
  });

  it('rejects a problem that names a book the registry does not hold', () => {
    expect(() => createProblemRegistry([plugin('missing-book')], [book()])).toThrow(
      'Problem fixture-problem/1 names an unknown book: missing-book',
    );
  });
});
