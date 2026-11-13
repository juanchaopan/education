import { describe, expect, it } from 'vitest';
import type { ShelvedBook } from './bookshelf.js';
import { childBookPage, filterOf, isFresh, type GivenBook } from './child-books.js';

const day = (n: number) => new Date(Date.UTC(2026, 10, n));

function given(id: string, fields: Partial<GivenBook> & { status?: ShelvedBook['status'] } = {}) {
  const { status = 'available', ...rest } = fields;
  const book: ShelvedBook = {
    id,
    name: id,
    grade: '一年级',
    subject: '数学',
    cover: null,
    status,
    problems: [{ id: `${id}-1`, version: 1, title: id }],
  };
  return { book, assignedAt: day(1), openedAt: day(2), studiedAt: null, finished: false, ...rest };
}

const page = { offset: 0, size: 6 };
const ids = (books: readonly GivenBook[]) => books.map(({ book }) => book.id);

describe('new books', () => {
  it('are new until the child opens one of their problems', () => {
    expect(isFresh(given('a', { openedAt: null }))).toBe(true);
    expect(isFresh(given('a', { openedAt: day(3) }))).toBe(false);
  });

  it('are never the ones the child cannot open', () => {
    expect(isFresh(given('a', { openedAt: null, status: 'unavailable' }))).toBe(false);
  });

  it('stay with the books the child is on, even when an earlier assignment was finished', () => {
    expect(filterOf(given('a', { openedAt: null, finished: true }))).toBe('learning');
  });
});

describe('the order of the child books', () => {
  it('puts new books first, then books in progress, finished books and unavailable ones', () => {
    const books = [
      given('gone', { status: 'unavailable', studiedAt: day(9) }),
      given('done', { finished: true, studiedAt: day(9) }),
      given('on', { studiedAt: day(5) }),
      given('new', { openedAt: null }),
    ];
    expect(ids(childBookPage(books, undefined, page).books)).toEqual(['new', 'on', 'done', 'gone']);
  });

  it('lists new books newest given first', () => {
    const books = [
      given('older', { openedAt: null, assignedAt: day(3) }),
      given('newer', { openedAt: null, assignedAt: day(4) }),
    ];
    expect(ids(childBookPage(books, undefined, page).books)).toEqual(['newer', 'older']);
  });

  it('lists the other groups most recently studied first, never studied last', () => {
    const books = [
      given('never-old', { assignedAt: day(1) }),
      given('long-ago', { studiedAt: day(3) }),
      given('never-new', { assignedAt: day(4) }),
      given('today', { studiedAt: day(8) }),
    ];
    expect(ids(childBookPage(books, undefined, page).books)).toEqual([
      'today',
      'long-ago',
      'never-new',
      'never-old',
    ]);
  });

  it('orders finished and unavailable books by study too', () => {
    const books = [
      given('gone-early', { status: 'unavailable', studiedAt: day(2) }),
      given('done-early', { finished: true, studiedAt: day(2) }),
      given('gone-late', { status: 'unavailable', studiedAt: day(6) }),
      given('done-late', { finished: true, studiedAt: day(6) }),
    ];
    expect(ids(childBookPage(books, undefined, page).books)).toEqual([
      'done-late',
      'done-early',
      'gone-late',
      'gone-early',
    ]);
  });

  it('breaks ties by book id', () => {
    const books = [given('b'), given('a')];
    expect(ids(childBookPage(books, undefined, page).books)).toEqual(['a', 'b']);
  });
});

describe('filters, counts and pages', () => {
  const books = [
    given('new', { openedAt: null }),
    given('on', { studiedAt: day(5) }),
    given('done', { finished: true }),
    given('gone', { status: 'unavailable', openedAt: null }),
  ];

  it('counts every filter and the new books', () => {
    expect(childBookPage(books, undefined, page).counts).toEqual({
      all: 4,
      learning: 2,
      finished: 1,
      unavailable: 1,
      fresh: 1,
    });
  });

  it.each([
    ['learning', ['new', 'on']],
    ['finished', ['done']],
    ['unavailable', ['gone']],
  ] as const)('keeps only the %s books in the same order', (filter, expected) => {
    const found = childBookPage(books, filter, page);
    expect(ids(found.books)).toEqual(expected);
    expect(found.counts.all).toBe(4);
  });

  it('pages the chosen books and says whether more follow', () => {
    const first = childBookPage(books, undefined, { offset: 0, size: 3 });
    const last = childBookPage(books, undefined, { offset: 3, size: 3 });
    expect(ids(first.books)).toEqual(['new', 'on', 'done']);
    expect(first.hasMore).toBe(true);
    expect(ids(last.books)).toEqual(['gone']);
    expect(last.hasMore).toBe(false);
  });

  it('is empty past the end', () => {
    expect(childBookPage(books, undefined, { offset: 6, size: 6 })).toMatchObject({
      books: [],
      hasMore: false,
    });
  });
});
