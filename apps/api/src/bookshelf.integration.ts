import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createProblemRegistry, type Book, type ProblemPlugin } from '@education/problems/server';
import { buildApp } from './app.js';
import { createBookshelf } from './bookshelf-application.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';

const { pool, household, learner, close } = familyFixtures();

// In shelf order the first grade's maths books are 规律, 旧书 and 图形.
const shelfBooks: Book[] = [
  { id: 'fixture-patterns', grade: '一年级', subject: '数学', category: '规律' },
  { id: 'fixture-shapes', grade: '一年级', subject: '数学', category: '图形' },
  { id: 'fixture-reading', grade: '二年级', subject: '语文', category: '阅读' },
  {
    id: 'fixture-withdrawn',
    grade: '一年级',
    subject: '数学',
    category: '旧书',
    status: 'unavailable',
    cover: 'old-cover',
  },
  { id: 'fixture-empty', grade: '一年级', subject: '语文', category: '空书' },
];
const problem = (id: string, book: string, sequence: number, version = 1): ProblemPlugin => ({
  summary: { id, version, title: `题目 ${id}`, book, sequence },
});
const registry = createProblemRegistry(
  [
    problem('pattern-a', 'fixture-patterns', 1),
    problem('pattern-a', 'fixture-patterns', 1, 2),
    problem('pattern-b', 'fixture-patterns', 2),
    problem('shape-a', 'fixture-shapes', 1),
    problem('reading-a', 'fixture-reading', 1),
    problem('old-a', 'fixture-withdrawn', 1),
  ],
  shelfBooks,
);
const app = buildApp({ origin: fixtureOrigin, bookshelf: createBookshelf(pool, registry) });

afterAll(async () => {
  await app.close();
  await close();
});

// A family with two children, listed by nickname: 小猫, then 小鹿.
async function familyOfTwo() {
  const parent = await household();
  const kitten = await learner(parent.family, '小猫');
  const fawn = await learner(parent.family, '小鹿');
  return { parent, kitten, fawn };
}

async function answered(
  childId: string,
  problemId: string,
  outcome: 'independent' | 'assisted' | 'incorrect',
  version = 1,
) {
  await pool.query(
    `INSERT INTO progress(child_id,problem_id,problem_version,round,${outcome})
     VALUES($1,$2,$3,$4,1)`,
    [childId, problemId, version, randomUUID()],
  );
}

// A book held by a child that no parent could give now, written directly.
async function held(childId: string, bookId: string) {
  await pool.query('INSERT INTO book_assignments(child_id,book_id) VALUES($1,$2)', [
    childId,
    bookId,
  ]);
}

// The child opens a problem of the book, as opening it in practice records.
async function opened(childId: string, bookId: string) {
  await pool.query('UPDATE book_assignments SET opened_at=now() WHERE child_id=$1 AND book_id=$2', [
    childId,
    bookId,
  ]);
}

const read = (url: string, token: string) => app.inject({ url, headers: sessionHeaders(token) });
const change = (
  method: 'PUT' | 'DELETE',
  childId: string,
  bookId: string,
  token: string,
  extra = {},
) =>
  app.inject({
    method,
    url: `/api/v1/parents/children/${childId}/assignments/${bookId}`,
    headers: { ...sessionHeaders(token), 'content-type': 'application/json', ...extra },
    payload: {},
  });
const give = (childId: string, bookId: string, token: string, extra = {}) =>
  change('PUT', childId, bookId, token, extra);
const takeBack = (childId: string, bookId: string, token: string) =>
  change('DELETE', childId, bookId, token);
const ids = (page: { books: { id: string }[] }) => page.books.map(({ id }) => id);
const shelfOf = async (name: 'library' | 'family', token: string) =>
  (await read(`/api/v1/parents/books?shelf=${name}`, token)).json();
const childBooks = async (token: string, filter = '') =>
  (await read(`/api/v1/children/assignments${filter}`, token)).json();

describe('the library and the family shelf', () => {
  it('moves a given book from the library to the family shelf and back when taken back', async () => {
    const { parent, kitten, fawn } = await familyOfTwo();
    const library = await read('/api/v1/parents/books?shelf=library', parent.token);
    expect(library.headers['cache-control']).toBe('no-store');
    expect(library.json()).toMatchObject({
      total: 3,
      grades: ['一年级', '二年级'],
      subjects: ['数学', '语文'],
      hasMore: false,
    });
    expect(ids(library.json())).toEqual(['fixture-patterns', 'fixture-shapes', 'fixture-reading']);

    expect((await give(fawn.id, 'fixture-patterns', parent.token)).statusCode).toBe(204);
    expect(ids(await shelfOf('library', parent.token))).toEqual([
      'fixture-shapes',
      'fixture-reading',
    ]);
    expect((await shelfOf('family', parent.token)).books).toEqual([
      {
        id: 'fixture-patterns',
        name: '规律',
        grade: '一年级',
        subject: '数学',
        cover: null,
        status: 'available',
        problems: 2,
        children: [
          { childId: kitten.id, assigned: false, done: 0 },
          { childId: fawn.id, assigned: true, done: 0 },
        ],
      },
    ]);

    expect((await takeBack(fawn.id, 'fixture-patterns', parent.token)).statusCode).toBe(204);
    expect((await takeBack(fawn.id, 'fixture-patterns', parent.token)).statusCode).toBe(204);
    expect(await shelfOf('family', parent.token)).toMatchObject({ total: 0, books: [] });
  });

  it('keeps a withdrawn book on the family shelf while a child has it', async () => {
    const { parent, fawn } = await familyOfTwo();
    await held(fawn.id, 'fixture-withdrawn');
    expect((await shelfOf('family', parent.token)).books).toMatchObject([
      { id: 'fixture-withdrawn', status: 'unavailable', cover: 'old-cover' },
    ]);
    expect(ids(await shelfOf('library', parent.token))).not.toContain('fixture-withdrawn');
    expect((await takeBack(fawn.id, 'fixture-withdrawn', parent.token)).statusCode).toBe(204);
    expect(ids(await shelfOf('family', parent.token))).toEqual([]);
  });

  it('filters by grade and subject and finds nothing for one it does not know', async () => {
    const { parent } = await familyOfTwo();
    const grade = encodeURIComponent('二年级');
    expect(
      (await read(`/api/v1/parents/books?shelf=library&grade=${grade}`, parent.token)).json(),
    ).toMatchObject({ total: 1, subjects: ['语文'], books: [{ id: 'fixture-reading' }] });
    const unknown = encodeURIComponent('九年级');
    expect(
      (await read(`/api/v1/parents/books?shelf=library&grade=${unknown}`, parent.token)).json(),
    ).toMatchObject({ total: 0, books: [], hasMore: false });
  });
});

describe('giving and taking back', () => {
  it('gives a book once however often or concurrently it is given', async () => {
    const { parent, fawn } = await familyOfTwo();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => give(fawn.id, 'fixture-shapes', parent.token)),
    );
    expect(results.map(({ statusCode }) => statusCode)).toEqual([204, 204, 204, 204, 204]);
    const given = () =>
      pool.query('SELECT assigned_at FROM book_assignments WHERE child_id=$1', [fawn.id]);
    const { rows } = await given();
    expect(rows).toHaveLength(1);
    await give(fawn.id, 'fixture-shapes', parent.token);
    expect((await given()).rows).toEqual(rows);
  });

  it('refuses to give a withdrawn, empty or unknown book but takes any of them back', async () => {
    const { parent, fawn } = await familyOfTwo();
    for (const book of ['fixture-withdrawn', 'fixture-empty', 'fixture-missing']) {
      const refused = await give(fawn.id, book, parent.token);
      expect(refused.statusCode).toBe(409);
      expect(refused.json()).toEqual({ message: '这本书暂时不能安排，请刷新书架。' });
      expect((await takeBack(fawn.id, book, parent.token)).statusCode).toBe(204);
    }
  });

  it('keeps every family to its own children and every request to a verified parent', async () => {
    const { parent, fawn } = await familyOfTwo();
    const other = await household();
    const unverified = await household(false);
    expect((await give(fawn.id, 'fixture-shapes', other.token)).statusCode).toBe(404);
    expect((await takeBack(fawn.id, 'fixture-shapes', other.token)).statusCode).toBe(404);
    expect((await read(`/api/v1/parents/children/${fawn.id}/books`, other.token)).json()).toEqual(
      (await read(`/api/v1/parents/children/${randomUUID()}/books`, other.token)).json(),
    );
    expect((await give(fawn.id, 'fixture-shapes', fawn.token)).statusCode).toBe(401);
    expect((await give(fawn.id, 'fixture-shapes', unverified.token)).statusCode).toBe(401);
    expect((await read('/api/v1/parents/books?shelf=family', fawn.token)).statusCode).toBe(401);
    const foreignOrigin = { origin: 'https://other.example' };
    expect((await give(fawn.id, 'fixture-shapes', parent.token, foreignOrigin)).statusCode).toBe(
      403,
    );
    const forged = { 'x-csrf-token': 'invalid' };
    expect((await give(fawn.id, 'fixture-shapes', parent.token, forged)).statusCode).toBe(403);
    expect(
      (await pool.query('SELECT 1 FROM book_assignments WHERE child_id=$1', [fawn.id])).rowCount,
    ).toBe(0);
    await pool.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [parent.family]);
    expect((await give(fawn.id, 'fixture-shapes', parent.token)).statusCode).toBe(401);
  });

  it("goes with the child when the child's account is removed", async () => {
    const { parent, fawn } = await familyOfTwo();
    await give(fawn.id, 'fixture-shapes', parent.token);
    await pool.query('DELETE FROM children WHERE id=$1', [fawn.id]);
    expect(
      (await pool.query('SELECT 1 FROM book_assignments WHERE child_id=$1', [fawn.id])).rowCount,
    ).toBe(0);
  });
});

describe("a child's shelf and progress", () => {
  it('lists the books that can be given and those the child has, by state', async () => {
    const { parent, kitten, fawn } = await familyOfTwo();
    await give(fawn.id, 'fixture-patterns', parent.token);
    await held(fawn.id, 'fixture-withdrawn');
    const shelf = async (state?: string, child = fawn.id) =>
      (
        await read(
          `/api/v1/parents/children/${child}/books${state ? `?state=${state}` : ''}`,
          parent.token,
        )
      ).json();
    expect(ids(await shelf())).toEqual([
      'fixture-patterns',
      'fixture-withdrawn',
      'fixture-shapes',
      'fixture-reading',
    ]);
    expect(ids(await shelf('assigned'))).toEqual(['fixture-patterns', 'fixture-withdrawn']);
    expect(ids(await shelf('unassigned'))).toEqual(['fixture-shapes', 'fixture-reading']);
    expect(ids(await shelf(undefined, kitten.id))).not.toContain('fixture-withdrawn');
    expect((await shelf('assigned')).books[0]).toMatchObject({ assigned: true, done: 0 });
  });

  it('counts problems done alone or with help, at any version, and keeps them when given again', async () => {
    const { parent, fawn } = await familyOfTwo();
    await answered(fawn.id, 'pattern-a', 'assisted', 1);
    await answered(fawn.id, 'pattern-b', 'incorrect');
    const progress = async () =>
      (await read(`/api/v1/parents/children/${fawn.id}/books?state=assigned`, parent.token)).json()
        .books[0];
    await give(fawn.id, 'fixture-patterns', parent.token);
    expect(await progress()).toMatchObject({ id: 'fixture-patterns', problems: 2, done: 1 });
    await answered(fawn.id, 'pattern-b', 'independent', 2);
    await takeBack(fawn.id, 'fixture-patterns', parent.token);
    await give(fawn.id, 'fixture-patterns', parent.token);
    expect(await progress()).toMatchObject({ problems: 2, done: 2 });
  });

  it('marks a book unfinished again once it gains a problem', async () => {
    const { parent, fawn } = await familyOfTwo();
    await answered(fawn.id, 'shape-a', 'independent');
    await give(fawn.id, 'fixture-shapes', parent.token);
    const grown = createProblemRegistry(
      [problem('shape-a', 'fixture-shapes', 1), problem('shape-b', 'fixture-shapes', 2)],
      shelfBooks,
    );
    const larger = buildApp({ origin: fixtureOrigin, bookshelf: createBookshelf(pool, grown) });
    try {
      const reply = await larger.inject({
        url: '/api/v1/children/assignments',
        headers: sessionHeaders(fawn.token),
      });
      expect(reply.json().books).toMatchObject([{ id: 'fixture-shapes', problems: 2, done: 1 }]);
    } finally {
      await larger.close();
    }
  });
});

describe("the child's books", () => {
  it("lists only the child's books, new ones first, with every problem and the counts", async () => {
    const { parent, kitten, fawn } = await familyOfTwo();
    await answered(fawn.id, 'shape-a', 'independent');
    await give(fawn.id, 'fixture-shapes', parent.token);
    await held(fawn.id, 'fixture-withdrawn');
    await give(fawn.id, 'fixture-patterns', parent.token);
    await held(fawn.id, 'fixture-gone');
    const reply = await read('/api/v1/children/assignments', fawn.token);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.json()).toEqual({
      counts: { all: 3, learning: 2, finished: 0, unavailable: 1, fresh: 2 },
      hasMore: false,
      books: [
        expect.objectContaining({
          id: 'fixture-patterns',
          done: 0,
          fresh: true,
          studiedAt: null,
          assignedAt: expect.any(String),
          items: [
            { id: 'pattern-a', version: 2, title: '题目 pattern-a', done: false },
            { id: 'pattern-b', version: 1, title: '题目 pattern-b', done: false },
          ],
        }),
        expect.objectContaining({
          id: 'fixture-shapes',
          done: 1,
          fresh: true,
          studiedAt: expect.any(String),
        }),
        expect.objectContaining({ id: 'fixture-withdrawn', status: 'unavailable', fresh: false }),
      ],
    });
    expect(await childBooks(kitten.token)).toEqual({
      counts: { all: 0, learning: 0, finished: 0, unavailable: 0, fresh: 0 },
      books: [],
      hasMore: false,
    });
    expect((await read('/api/v1/children/assignments', parent.token)).statusCode).toBe(401);
  });
});

describe('new books', () => {
  it('stops counting a book as new once the child opened one of its problems, until given again', async () => {
    const { parent, fawn } = await familyOfTwo();
    await answered(fawn.id, 'shape-a', 'independent');
    await give(fawn.id, 'fixture-shapes', parent.token);
    await give(fawn.id, 'fixture-patterns', parent.token);
    await opened(fawn.id, 'fixture-shapes');
    expect(await childBooks(fawn.token)).toMatchObject({
      counts: { all: 2, learning: 1, finished: 1, fresh: 1 },
      books: [
        { id: 'fixture-patterns', fresh: true },
        { id: 'fixture-shapes', fresh: false },
      ],
    });
    expect(ids(await childBooks(fawn.token, '?books=finished'))).toEqual(['fixture-shapes']);
    expect(ids(await childBooks(fawn.token, '?books=learning'))).toEqual(['fixture-patterns']);
    await takeBack(fawn.id, 'fixture-shapes', parent.token);
    await give(fawn.id, 'fixture-shapes', parent.token);
    expect((await childBooks(fawn.token)).counts).toMatchObject({
      learning: 2,
      finished: 0,
      fresh: 2,
    });
  });
});

describe("the order of the child's books", () => {
  it('lists books studied most recently first, by their latest answer', async () => {
    const { parent, fawn } = await familyOfTwo();
    await give(fawn.id, 'fixture-patterns', parent.token);
    await give(fawn.id, 'fixture-reading', parent.token);
    await opened(fawn.id, 'fixture-patterns');
    await opened(fawn.id, 'fixture-reading');
    await answered(fawn.id, 'reading-a', 'incorrect');
    await answered(fawn.id, 'pattern-b', 'incorrect');
    await pool.query(
      `UPDATE progress SET updated_at=now()-interval '2 days'
       WHERE child_id=$1 AND problem_id='reading-a'`,
      [fawn.id],
    );
    const books = await childBooks(fawn.token);
    expect(ids(books)).toEqual(['fixture-patterns', 'fixture-reading']);
    expect(Date.parse(books.books[0].studiedAt)).toBeGreaterThan(
      Date.parse(books.books[1].studiedAt),
    );
  });
});

describe('pages', () => {
  it('holds 24 books a shelf page and six books a page of the child books', async () => {
    const many: Book[] = Array.from({ length: 30 }, (_, index) => ({
      id: `fixture-book-${index}`,
      grade: '三年级',
      subject: '英语',
      category: `书 ${String(index).padStart(2, '0')}`,
    }));
    const large = createProblemRegistry(
      many.map((book, index) => problem(`problem-${index}`, book.id, 1)),
      many,
    );
    const shelf = buildApp({ origin: fixtureOrigin, bookshelf: createBookshelf(pool, large) });
    const { parent, fawn } = await familyOfTwo();
    const page = async (url: string, token: string) =>
      (await shelf.inject({ url, headers: sessionHeaders(token) })).json();
    try {
      const library = (offset: number) =>
        page(`/api/v1/parents/books?shelf=library&offset=${offset}`, parent.token);
      const first = await library(0);
      expect(first).toMatchObject({ total: 30, hasMore: true });
      expect(first.books).toHaveLength(24);
      const last = await library(24);
      expect(last).toMatchObject({ total: 30, hasMore: false });
      expect(last.books).toHaveLength(6);
      expect(await library(60)).toMatchObject({ total: 30, books: [], hasMore: false });

      for (const book of many.slice(0, 8)) await held(fawn.id, book.id);
      const own = (offset: number) =>
        page(`/api/v1/children/assignments?offset=${offset}`, fawn.token);
      const firstOwn = await own(0);
      expect(firstOwn).toMatchObject({ counts: { all: 8 }, hasMore: true });
      expect(firstOwn.books).toHaveLength(6);
      expect(await own(6)).toMatchObject({ hasMore: false, books: [{}, {}] });
    } finally {
      await shelf.close();
    }
  });
});
