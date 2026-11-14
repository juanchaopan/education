import { afterAll, describe, expect, it } from 'vitest';
import { createProblemRegistry, type ProblemPlugin } from '@education/problems/server';
import { buildApp } from './app.js';
import { createBookOpened } from './book-opened-application.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';
import { createProblemOpening } from './problem-opening-application.js';

const { pool, household, learner, close } = familyFixtures();

const problem = (id: string, book: string): ProblemPlugin => ({
  summary: { id, version: 1, title: `题目 ${id}`, book, sequence: 1 },
});
const registry = createProblemRegistry(
  [
    problem('opening-a', 'opening-patterns'),
    problem('opening-b', 'opening-shapes'),
    problem('opening-c', 'opening-closed'),
  ],
  [
    { id: 'opening-patterns', grade: '一年级', subject: '数学', category: '开题规律' },
    { id: 'opening-shapes', grade: '一年级', subject: '数学', category: '开题图形' },
    {
      id: 'opening-closed',
      grade: '一年级',
      subject: '数学',
      category: '开题暂停',
      status: 'unavailable',
    },
  ],
);
const app = buildApp({
  origin: fixtureOrigin,
  problemOpening: createProblemOpening(pool, registry),
  bookOpened: createBookOpened(pool, registry),
});

afterAll(async () => {
  await app.close();
  await close();
});

const give = (childId: string, bookId: string) =>
  pool.query('INSERT INTO book_assignments(child_id,book_id) VALUES($1,$2)', [childId, bookId]);

const openedAt = async (childId: string, bookId: string) =>
  (
    await pool.query<{ opened_at: Date | null }>(
      'SELECT opened_at FROM book_assignments WHERE child_id=$1 AND book_id=$2',
      [childId, bookId],
    )
  ).rows[0]?.opened_at;

const open = (id: string, token?: string) =>
  app.inject({ url: `/api/v1/problems/${id}/1`, headers: token ? sessionHeaders(token) : {} });

const markOpened = (id: string, token: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/problems/${id}/1/opened`,
    headers: { ...sessionHeaders(token), 'content-type': 'application/json' },
    payload: {},
  });

const refusal = (reason: string) => ({
  message: reason === 'unassigned' ? '这本书还没有安排给你。' : '这本书暂时不可用。',
  reason,
});

describe('a child opening a problem', () => {
  it('practises a problem of a book given to them, writing nothing in the opening', async () => {
    const parent = await household();
    const child = await learner(parent.family, '小鹿');
    await give(child.id, 'opening-patterns');
    const opened = await open('opening-a', child.token);
    expect(opened.statusCode).toBe(200);
    expect(opened.json()).toEqual({
      ...registry.summary('opening-a', 1),
      mode: 'practice',
      book: 'opening-patterns',
    });
    expect(opened.headers['cache-control']).toBe('no-store');
    expect(opened.headers.vary).toBe('Cookie');
    expect(
      (
        await app.inject({
          method: 'HEAD',
          url: '/api/v1/problems/opening-a/1',
          headers: sessionHeaders(child.token),
        })
      ).statusCode,
    ).toBe(200);
    expect(await openedAt(child.id, 'opening-patterns')).toBeNull();
  });

  it("is refused a sibling's book and another family's, and marks nothing", async () => {
    const parent = await household();
    const child = await learner(parent.family, '小猫');
    const sibling = await learner(parent.family, '小狗');
    const other = await learner((await household()).family, '小羊');
    await give(sibling.id, 'opening-shapes');
    await give(other.id, 'opening-shapes');
    const refused = await open('opening-b', child.token);
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual(refusal('unassigned'));
    expect(refused.headers.vary).toBe('Cookie');
    expect(await openedAt(sibling.id, 'opening-shapes')).toBeNull();
    expect(await openedAt(other.id, 'opening-shapes')).toBeNull();
  });

  it('is refused an unavailable book, given or not, and a problem not on the list', async () => {
    const parent = await household();
    const given = await learner(parent.family, '小鹿');
    const notGiven = await learner(parent.family, '小猫');
    await give(given.id, 'opening-closed');
    expect((await open('opening-c', given.token)).json()).toEqual(refusal('unavailable'));
    expect((await open('opening-c', notGiven.token)).json()).toEqual(refusal('unassigned'));
    expect(await openedAt(given.id, 'opening-closed')).toBeNull();
    const missing = await open('opening-missing', given.token);
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ message: '这道题或这个版本暂时不可用。' });
  });
});

describe("a child's book, opened and taken back", () => {
  it('is refused once the book is taken back, and finds it new again when given anew', async () => {
    const parent = await household();
    const child = await learner(parent.family, '小鹿');
    await give(child.id, 'opening-patterns');
    expect((await open('opening-a', child.token)).statusCode).toBe(200);
    await pool.query('DELETE FROM book_assignments WHERE child_id=$1', [child.id]);
    expect((await open('opening-a', child.token)).statusCode).toBe(403);
    await give(child.id, 'opening-patterns');
    expect(await openedAt(child.id, 'opening-patterns')).toBeNull();
    expect((await open('opening-a', child.token)).statusCode).toBe(200);
  });
  it('marks the book opened when its page says so, the first time only', async () => {
    const parent = await household();
    const child = await learner(parent.family, '小鹿');
    await give(child.id, 'opening-patterns');
    const marked = await markOpened('opening-a', child.token);
    expect(marked.statusCode).toBe(204);
    const first = await openedAt(child.id, 'opening-patterns');
    expect(first).toBeInstanceOf(Date);
    expect((await markOpened('opening-a', child.token)).statusCode).toBe(204);
    expect(await openedAt(child.id, 'opening-patterns')).toEqual(first);
  });

  it('marks no book not given, unavailable or of a parent, and takes no write from elsewhere', async () => {
    const parent = await household();
    const child = await learner(parent.family, '小鹿');
    const sibling = await learner(parent.family, '小狗');
    await give(sibling.id, 'opening-shapes');
    await give(child.id, 'opening-closed');
    const refused = await markOpened('opening-b', child.token);
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual(refusal('unassigned'));
    expect((await markOpened('opening-c', child.token)).json()).toEqual(refusal('unavailable'));
    expect((await markOpened('opening-b', parent.token)).statusCode).toBe(401);
    const foreign = await app.inject({
      method: 'POST',
      url: '/api/v1/problems/opening-b/1/opened',
      headers: {
        ...sessionHeaders(sibling.token),
        origin: 'https://other.example',
        'content-type': 'application/json',
      },
      payload: {},
    });
    expect(foreign.statusCode).toBe(403);
    expect(await openedAt(sibling.id, 'opening-shapes')).toBeNull();
    expect(await openedAt(child.id, 'opening-closed')).toBeNull();
  });
});

describe('anyone else opening a problem', () => {
  it('previews it as a verified parent, whether given or not, and marks nothing', async () => {
    const parent = await household();
    const child = await learner(parent.family, '小鹿');
    await give(child.id, 'opening-patterns');
    const previewed = await open('opening-a', parent.token);
    expect(previewed.statusCode).toBe(200);
    expect(previewed.json()).toMatchObject({ mode: 'preview', book: 'opening-patterns' });
    expect((await open('opening-b', parent.token)).json()).toMatchObject({ mode: 'preview' });
    expect(await openedAt(child.id, 'opening-patterns')).toBeNull();
    expect((await open('opening-c', parent.token)).json()).toEqual(refusal('unavailable'));
    expect((await open('opening-missing', parent.token)).statusCode).toBe(404);
  });

  it('opens nothing for a parent still verifying or a visitor, real problem or not', async () => {
    const unverified = await household(false);
    for (const token of [unverified.token, undefined])
      for (const id of ['opening-a', 'opening-missing']) {
        const refused = await open(id, token);
        expect(refused.statusCode).toBe(401);
        expect(refused.json()).not.toHaveProperty('reason');
      }
  });
});
