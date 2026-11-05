import { afterAll, beforeAll, expect, it } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) throw new Error('A migrated, isolated DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const family = randomUUID();
beforeAll(async () => {
  await pool.query('INSERT INTO families(id) VALUES ($1)', [family]);
});
afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=$1', [family]);
  await pool.end();
});

it('enforces nickname uniqueness inside a family and cascades temporary drafts', async () => {
  const child = randomUUID();
  await pool.query(
    'INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash) VALUES ($1,$2,$3,$3,$4)',
    [child, family, '测试昵称', 'test-only-hash'],
  );
  await expect(
    pool.query(
      'INSERT INTO children(family_id,nickname,canonical_nickname,pin_hash) VALUES ($1,$2,$2,$3)',
      [family, '测试昵称', 'test-only-hash'],
    ),
  ).rejects.toMatchObject({ code: '23505' });
  await pool.query(
    'INSERT INTO drafts(child_id,problem_id,problem_version,content,expires_at) VALUES ($1,$2,1,$3,now())',
    [child, 'test-fixture-not-published', '{}'],
  );
  await pool.query('DELETE FROM children WHERE id=$1', [child]);
  const result = await pool.query('SELECT id FROM drafts WHERE child_id=$1', [child]);
  expect(result.rowCount).toBe(0);
});
