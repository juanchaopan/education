import { afterAll, describe, expect, it } from 'vitest';
import { createProblemRegistry, type ProblemPlugin } from '@education/problems/server';
import { buildApp } from './app.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';
import { createPreview } from './preview-application.js';

const { pool, household, learner, close } = familyFixtures();

const problem = (id: string, book: string): ProblemPlugin => ({
  summary: { id, version: 1, title: `题目 ${id}`, book, sequence: 1 },
  answering: {
    hints: { count: '先数左边。' },
    checkCompletion: (input) => (input === 9 ? 'correct' : 'incorrect'),
  },
});
const registry = createProblemRegistry(
  [problem('preview-a', 'preview-open'), problem('preview-b', 'preview-closed')],
  [
    { id: 'preview-open', grade: '一年级', subject: '数学', category: '预览开着' },
    {
      id: 'preview-closed',
      grade: '一年级',
      subject: '数学',
      category: '预览暂停',
      status: 'unavailable',
    },
  ],
);
const app = buildApp({ origin: fixtureOrigin, preview: createPreview(pool, registry) });

afterAll(async () => {
  await app.close();
  await close();
});

const send = (id: string, token: string, payload: object) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/problems/${id}/1/preview`,
    headers: { ...sessionHeaders(token), 'content-type': 'application/json' },
    payload,
  });

// The family's rows in every table that keeps learning, which a preview
// leaves as they were.
const learningRows = async (family: string) => {
  const { rows } = await pool.query<{ rows: number }>(
    `SELECT count(*)::int AS rows FROM (
       SELECT child_id FROM attempts UNION ALL SELECT child_id FROM progress
       UNION ALL SELECT child_id FROM help_events UNION ALL SELECT child_id FROM drafts
       UNION ALL SELECT child_id FROM book_assignments UNION ALL SELECT child_id FROM ai_usage
     ) kept JOIN children c ON c.id=kept.child_id WHERE c.family_id=$1`,
    [family],
  );
  return rows[0]!.rows;
};

describe('a parent previewing a problem', () => {
  it('is judged and given hints like a child, and nothing is kept', async () => {
    const parent = await household();
    await learner(parent.family, '小鹿');
    const before = await learningRows(parent.family);
    expect((await send('preview-a', parent.token, { action: 'submit', input: 9 })).json()).toEqual({
      outcome: 'independent',
    });
    expect((await send('preview-a', parent.token, { action: 'submit', input: 8 })).json()).toEqual({
      outcome: 'incorrect',
    });
    expect(
      (await send('preview-a', parent.token, { action: 'hint', hintId: 'count' })).json(),
    ).toEqual({ hint: '先数左边。' });
    expect(await learningRows(parent.family)).toBe(before);
  });

  it('is refused an unavailable book and a problem not on the list', async () => {
    const parent = await household();
    const closed = await send('preview-b', parent.token, { action: 'submit', input: 9 });
    expect(closed.statusCode).toBe(403);
    expect(closed.json()).toEqual({ message: '这本书暂时不可用。', reason: 'unavailable' });
    expect(
      (await send('preview-missing', parent.token, { action: 'submit', input: 9 })).statusCode,
    ).toBe(404);
  });

  it('is open to no child and no parent still verifying', async () => {
    const parent = await household();
    const child = await learner(parent.family, '小猫');
    const unverified = await household(false);
    for (const token of [child.token, unverified.token])
      expect((await send('preview-a', token, { action: 'submit', input: 9 })).statusCode).toBe(401);
  });
});
