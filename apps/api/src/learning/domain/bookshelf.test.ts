import { describe, expect, it } from 'vitest';
import { arrange, assignable, browse, progress, type ShelvedBook } from './bookshelf.js';

const problem = (id: string, version = 1) => ({ id, version, title: id });

const book = (fields: Partial<ShelvedBook> = {}): ShelvedBook => ({
  id: 'patterns',
  name: '找规律',
  grade: '一年级',
  subject: '数学',
  cover: null,
  status: 'available',
  problems: [problem('a'), problem('b'), problem('c')],
  ...fields,
});

const order = { grades: ['一年级', '二年级', '三年级'], subjects: ['数学', '语文'] };

describe('progress in a book', () => {
  it('counts the problems done of those the book holds now', () => {
    expect(progress(book(), new Set(['a']))).toEqual({ done: 1, total: 3, finished: false });
  });

  it('ignores problems done elsewhere and finishes once every problem is done', () => {
    expect(progress(book(), new Set(['a', 'b', 'c', 'other']))).toEqual({
      done: 3,
      total: 3,
      finished: true,
    });
  });

  it('counts a problem done at an older version, since done problems are named by id', () => {
    const updated = book({ problems: [problem('a', 2), problem('b')] });
    expect(progress(updated, new Set(['a']))).toMatchObject({ done: 1, total: 2 });
  });

  it('is unfinished again once the book gains a problem', () => {
    const done = new Set(['a', 'b', 'c']);
    const grown = book({ problems: [...book().problems, problem('d')] });
    expect(progress(grown, done)).toEqual({ done: 3, total: 4, finished: false });
  });

  it('finishes on what is left when a problem leaves the book', () => {
    const shrunk = book({ problems: [problem('a'), problem('b')] });
    expect(progress(shrunk, new Set(['a', 'b']))).toMatchObject({ finished: true });
  });

  it('never finishes an empty book', () => {
    expect(progress(book({ problems: [] }), new Set())).toEqual({
      done: 0,
      total: 0,
      finished: false,
    });
  });
});

describe('shelves', () => {
  const shelf = arrange(
    [
      book({ id: 'reading', name: '阅读', subject: '语文' }),
      book({ id: 'third', name: '三年级', grade: '三年级' }),
      book({ id: 'shapes', name: '图形' }),
      book({ id: 'counting', name: '数数' }),
    ],
    order,
  );

  it('orders books by grade and subject as the catalogue lists them, then by name', () => {
    expect(shelf.map(({ id }) => id)).toEqual(['counting', 'shapes', 'reading', 'third']);
  });

  it('pages the books a filter matches and lists the grades and subjects there are', () => {
    expect(browse(shelf, order, {}, { offset: 0, size: 2 })).toEqual({
      total: 4,
      grades: ['一年级', '三年级'],
      subjects: ['数学', '语文'],
      books: [shelf[0], shelf[1]],
      hasMore: true,
    });
    expect(browse(shelf, order, {}, { offset: 2, size: 2 })).toMatchObject({ hasMore: false });
    expect(browse(shelf, order, {}, { offset: 8, size: 2 })).toMatchObject({
      total: 4,
      books: [],
      hasMore: false,
    });
  });

  it('keeps the subjects of the chosen grade and the books of the chosen subject', () => {
    expect(browse(shelf, order, { grade: '三年级' }, { offset: 0, size: 24 })).toMatchObject({
      total: 1,
      subjects: ['数学'],
    });
    expect(
      browse(shelf, order, { grade: '一年级', subject: '语文' }, { offset: 0, size: 24 }).books,
    ).toEqual([shelf[2]]);
  });

  it('finds nothing for a grade or subject it does not know', () => {
    expect(browse(shelf, order, { grade: '九年级' }, { offset: 0, size: 24 })).toMatchObject({
      total: 0,
      subjects: [],
      books: [],
    });
  });
});

describe('assigning', () => {
  it('gives only available books that hold a published problem', () => {
    expect(assignable(book())).toBe(true);
    expect(assignable(book({ status: 'unavailable' }))).toBe(false);
    expect(assignable(book({ problems: [] }))).toBe(false);
    expect(assignable(undefined)).toBe(false);
  });
});
