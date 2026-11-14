import Fastify from 'fastify';
import { afterAll, describe, expect, it } from 'vitest';
import { createProblemRegistry, type ProblemPlugin } from '@education/problems/server';
import { createCatalog } from './catalog/services/catalog.js';
import { registerCatalog } from './catalog/routes/catalog.js';
import { familyFixtures, sessionHeaders } from './family-fixtures.js';
import { createProblemOpening } from './problem-opening-application.js';

const { pool, household, learner, close } = familyFixtures();

const problem = (id: string, book: string): ProblemPlugin => ({
  summary: { id, version: 1, title: `题目 ${id}`, book, sequence: 1 },
});
const registry = createProblemRegistry(
  [problem('opening-a', 'opening-patterns'), problem('opening-b', 'opening-shapes')],
  [
    { id: 'opening-patterns', grade: '一年级', subject: '数学', category: '开题规律' },
    { id: 'opening-shapes', grade: '一年级', subject: '数学', category: '开题图形' },
  ],
);
const app = Fastify();
registerCatalog(app, createCatalog(registry), createProblemOpening(pool, registry));

afterAll(async () => {
  await app.close();
  await close();
});

const openedAt = async (childId: string, bookId: string) =>
  (
    await pool.query<{ opened_at: Date | null }>(
      'SELECT opened_at FROM book_assignments WHERE child_id=$1 AND book_id=$2',
      [childId, bookId],
    )
  ).rows[0]?.opened_at;

const open = (id: string, headers = {}) => app.inject({ url: `/api/v1/problems/${id}/1`, headers });

describe('opening a problem', () => {
  it('records the first time a child opens a problem of a book given to them, and only then', async () => {
    const parent = await household();
    const child = await learner(parent.family, '小鹿');
    await pool.query(
      "INSERT INTO book_assignments(child_id,book_id) VALUES($1,'opening-patterns')",
      [child.id],
    );
    expect(await openedAt(child.id, 'opening-patterns')).toBeNull();
    const opened = await open('opening-a', sessionHeaders(child.token));
    expect(opened.statusCode).toBe(200);
    expect(opened.headers['cache-control']).toBe('no-store');
    const first = await openedAt(child.id, 'opening-patterns');
    expect(first).toBeInstanceOf(Date);
    await open('opening-a', sessionHeaders(child.token));
    expect(await openedAt(child.id, 'opening-patterns')).toEqual(first);
  });

  it('records nothing for a book the child was not given, a parent or a visitor', async () => {
    const parent = await household();
    const child = await learner(parent.family, '小猫');
    expect((await open('opening-b', sessionHeaders(child.token))).statusCode).toBe(200);
    expect(await openedAt(child.id, 'opening-shapes')).toBeUndefined();
    expect((await open('opening-a', sessionHeaders(parent.token))).statusCode).toBe(200);
    expect((await open('opening-a')).statusCode).toBe(200);
    expect(
      (await pool.query('SELECT 1 FROM book_assignments WHERE child_id=$1', [child.id])).rowCount,
    ).toBe(0);
  });
});
