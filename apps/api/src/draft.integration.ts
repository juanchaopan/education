import { randomBytes, randomUUID } from 'node:crypto';
import { draftBodyLimit } from '@education/contracts';
import { createProblemRegistry, type ProblemPlugin } from '@education/problems/server';
import pg from 'pg';
import { afterAll, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createDrafts } from './draft-application.js';
import { cleanupExpiredDrafts } from './database/draft-retention.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';
import { deleteDraftRevision } from './learning/repositories/postgres-draft.js';
import { createAnswering } from './answer-application.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const origin = 'https://education.example';
const problem = { id: 'test-draft', version: 1 };
const path = '/api/v1/problems/test-draft/1/draft';
const content = { stepId: 'compare', drawing: [[{ x: 0.3, y: 0.4 }]] };
const next = { ...content, stepId: 'explain' };
const answerPath = path.replace('/draft', '/answer');
const book = { id: 'fixture-leaves', grade: '一年级', subject: '数学', category: '对称' };
const leaf = (version: number): ProblemPlugin => ({
  summary: { ...problem, version, title: '叶子对称吗', book: book.id, sequence: 1 },
  answering: {
    hints: { compare: '先比较叶片两边。' },
    checkCompletion: (input) =>
      input === '对称' ? 'correct' : input === '不对称' ? 'incorrect' : 'uncertain',
  },
});
const registry = createProblemRegistry([leaf(1), leaf(Number.MAX_SAFE_INTEGER)], [book]);
const makeApp = () =>
  buildApp({
    origin,
    answering: createAnswering(pool, 'fixture-key', registry),
    drafts: createDrafts(pool, registry),
  });
const first = makeApp();
const second = makeApp();

afterAll(async () => {
  await Promise.all([first.close(), second.close()]);
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

// A child in a family of their own, given the problem's book unless `given`
// is false, who can sign in on as many devices as a test needs.
async function child(given = true) {
  const family = randomUUID();
  families.push(family);
  await pool.query('INSERT INTO families(id,code) VALUES($1,$2)', [
    family,
    family.replaceAll('-', '').slice(0, 12).toUpperCase(),
  ]);
  const id = randomUUID();
  await pool.query(
    `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
     VALUES($1,$2,'小鹿','小鹿','fixture',1)`,
    [id, family],
  );
  if (given)
    await pool.query('INSERT INTO book_assignments(child_id,book_id) VALUES($1,$2)', [id, book.id]);
  async function session() {
    const token = randomBytes(32).toString('base64url');
    await pool.query(
      `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
       VALUES($1,$2,1,1,now()+interval '1 day')`,
      [tokenHash(token), id],
    );
    return {
      origin,
      cookie: `__Host-education_session=${token}`,
      'x-csrf-token': csrfToken(token),
      'x-education-request': 'session',
      'content-type': 'application/json',
    };
  }
  return { id, session };
}

function save(
  headers: Record<string, string>,
  revision: string | null,
  payload = content,
  app = first,
) {
  return app.inject({
    method: 'POST',
    url: path,
    headers,
    payload: { action: 'save', revision, content: payload },
  });
}

it('restores across sessions, lets one competing save win, and isolates other children', async () => {
  const owner = await child();
  const a = await owner.session(),
    b = await owner.session(),
    other = await (await child()).session();
  const created = (await save(a, null)).json().draft;
  const [left, right] = await Promise.all([
    save(a, created.revision, next),
    save(b, created.revision, { ...content, stepId: 'try-again' }, second),
  ]);
  expect([left.statusCode, right.statusCode].sort()).toEqual([200, 409]);
  const winner = (left.statusCode === 200 ? left : right).json();
  expect(left.json()).toEqual(winner);
  expect(right.json()).toEqual(winner);
  expect(winner.draft.revision).not.toBe(created.revision);
  const read = await second.inject({ url: path, headers: b });
  expect(read.json()).toEqual(winner);
  expect(read.headers['cache-control']).toBe('no-store');
  expect((await second.inject({ url: path, headers: other })).json()).toEqual({ draft: null });
  expect((await save(other, winner.draft.revision)).statusCode).toBe(409);
});

it('expires on read without extending unchanged ink and purges unread expired drafts', async () => {
  const owner = await child(),
    headers = await owner.session();
  const saved = (await save(headers, null)).json().draft;
  const ttl = Date.parse(saved.expiresAt) - Date.now();
  expect(ttl).toBeGreaterThan(7 * 86400000 - 60000);
  expect(ttl).toBeLessThan(7 * 86400000 + 1000);
  expect((await save(headers, saved.revision)).json().draft).toEqual(saved);
  await pool.query('UPDATE drafts SET expires_at=now() WHERE child_id=$1', [owner.id]);
  expect((await first.inject({ url: path, headers })).json()).toEqual({ draft: null });
  expect((await pool.query('SELECT 1 FROM drafts WHERE child_id=$1', [owner.id])).rowCount).toBe(0);
  expect((await save(headers, saved.revision)).statusCode).toBe(409);
  await save(headers, null);
  await pool.query('UPDATE drafts SET expires_at=now() WHERE child_id=$1', [owner.id]);
  expect(await cleanupExpiredDrafts(pool)).toBeGreaterThanOrEqual(1);
  expect((await pool.query('SELECT 1 FROM drafts WHERE child_id=$1', [owner.id])).rowCount).toBe(0);
});

it('compares discard versions and supports transactional deletion without erasing a newer draft', async () => {
  const owner = await child(),
    headers = await owner.session();
  const saved = (await save(headers, null)).json().draft;
  const newer = (await save(headers, saved.revision, next)).json().draft;
  const discard = (revision: string) =>
    first.inject({ method: 'POST', url: path, headers, payload: { action: 'discard', revision } });
  expect((await discard(saved.revision)).statusCode).toBe(409);
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    expect(await deleteDraftRevision(connection, owner.id, problem, saved.revision)).toBe(false);
    expect(await deleteDraftRevision(connection, owner.id, problem, newer.revision)).toBe(true);
    await connection.query('ROLLBACK');
  } finally {
    connection.release();
  }
  expect((await first.inject({ url: path, headers })).json().draft).toEqual(newer);
  expect((await discard(newer.revision)).json()).toEqual({ draft: null });
  const recreated = (await save(headers, null)).json().draft;
  expect(recreated.revision).not.toBe(newer.revision);
  expect((await discard(newer.revision)).statusCode).toBe(409);
});

it('rejects unbound sessions, forged inputs, unknown versions and any raw audio field', async () => {
  const owner = await child(),
    headers = await owner.session();
  expect((await first.inject({ url: path })).statusCode).toBe(401);
  expect((await save({ ...headers, origin: 'https://other.example' }, null)).statusCode).toBe(403);
  expect(
    (await first.inject({ url: path, headers: { ...headers, 'x-csrf-token': 'wrong' } }))
      .statusCode,
  ).toBe(403);
  const forged = { ...content, audio: 'fixture' };
  expect((await save(headers, null, forged)).statusCode).toBe(400);
  expect((await save(headers, null, { ...content, drawing: [[{ x: -1, y: 0 }]] })).statusCode).toBe(
    400,
  );
  expect(
    (await first.inject({ url: path.replace('test-draft', 'unknown'), headers })).statusCode,
  ).toBe(404);
  await pool.query('UPDATE children SET credential_version=2 WHERE id=$1', [owner.id]);
  expect((await save(headers, null)).statusCode).toBe(401);
});

it('keeps no draft or answer of a child not given the book, until the book is given', async () => {
  const stranger = await child(false);
  const headers = await stranger.session();
  const refusals = [
    await first.inject({ url: path, headers }),
    await save(headers, null),
    await answer(headers),
    await answer(headers, submission(randomUUID())),
  ];
  for (const refusal of refusals) {
    expect(refusal.statusCode).toBe(403);
    expect(refusal.json()).toEqual({ message: '这本书还没有安排给你。', reason: 'unassigned' });
  }
  for (const table of ['drafts', 'attempts', 'progress', 'help_events'])
    expect(
      (await pool.query(`SELECT 1 FROM ${table} WHERE child_id=$1`, [stranger.id])).rowCount,
    ).toBe(0);
  await pool.query('INSERT INTO book_assignments(child_id,book_id) VALUES($1,$2)', [
    stranger.id,
    book.id,
  ]);
  expect((await save(headers, null)).statusCode).toBe(200);
});

it('supports separate drafts for catalog versions and caps request bytes before validation', async () => {
  const headers = await (await child()).session();
  const versionPath = path.replace('/1/', `/${Number.MAX_SAFE_INTEGER}/`);
  const old = await save(headers, null);
  expect(old.statusCode).toBe(200);
  const modern = await second.inject({
    method: 'POST',
    url: versionPath,
    headers,
    payload: { action: 'save', revision: null, content: next },
  });
  expect(modern.statusCode).toBe(200);
  expect((await second.inject({ url: versionPath, headers })).json().draft.content).toEqual(next);
  expect((await second.inject({ url: path, headers })).json()).toEqual(old.json());
  expect(
    (
      await second.inject({
        method: 'POST',
        url: path,
        headers,
        payload: { data: 'x'.repeat(draftBodyLimit) },
      })
    ).statusCode,
  ).toBe(413);
});

function answer(headers: Record<string, string>, payload?: object, app = first, url = answerPath) {
  return app.inject({ method: payload ? 'POST' : 'GET', url, headers, payload });
}

async function roundFor(headers: Record<string, string>, url = answerPath) {
  const result = await answer(headers, undefined, first, url);
  expect(result.statusCode).toBe(200);
  return result.json<{ round: string }>().round;
}

const submission = (round: string, draftRevision: string | null = null) => ({
  action: 'submit',
  round,
  attemptId: randomUUID(),
  input: '对称',
  draftRevision,
});

it('keeps help across sessions and retries, then opens a new round only after completion', async () => {
  const owner = await child();
  const a = await owner.session();
  const b = await owner.session();
  const round = await roundFor(a);
  const hint = { action: 'hint', round, hintId: 'compare' };
  expect((await answer(a, hint)).json()).toEqual({ hint: '先比较叶片两边。' });
  expect((await answer(b, hint, second)).statusCode).toBe(200);
  const attempt = submission(round);
  expect((await answer(b, { ...attempt, input: '?' }, second)).json()).toMatchObject({
    outcome: 'uncertain',
  });
  expect(
    (await answer(b, { ...attempt, input: '不对称', attemptId: randomUUID() }, second)).json(),
  ).toMatchObject({ outcome: 'incorrect' });
  const complete = await answer(b, submission(round), second);
  expect(complete.json()).toMatchObject({ outcome: 'assisted' });
  expect((await answer(a, submission(round))).statusCode).toBe(409);
  expect((await answer(a, hint)).statusCode).toBe(409);
  const newRound = await roundFor(a);
  expect(newRound).not.toBe(round);
  expect((await answer(a, submission(newRound))).json()).toMatchObject({ outcome: 'independent' });
  const progress = await pool.query(
    'SELECT independent, assisted, incorrect, uncertain FROM progress WHERE child_id=$1',
    [owner.id],
  );
  expect(progress.rows).toEqual([{ independent: 1, assisted: 1, incorrect: 1, uncertain: 1 }]);
  expect(
    (await pool.query('SELECT hint_id FROM help_events WHERE child_id=$1', [owner.id])).rows,
  ).toEqual([{ hint_id: 'compare' }]);
});

it('returns one receipt across concurrent instances and preserves drafts from later edits', async () => {
  const owner = await child();
  const a = await owner.session();
  const b = await owner.session();
  const saved = (await save(a, null)).json().draft;
  const attempt = submission(await roundFor(a), saved.revision);
  const replies = await Promise.all([answer(a, attempt), answer(b, attempt, second)]);
  expect(replies.map((reply) => reply.statusCode)).toEqual([200, 200]);
  expect(replies[0]!.json()).toEqual(replies[1]!.json());
  expect((await first.inject({ url: path, headers: a })).json()).toEqual({ draft: null });
  const fresh = (await save(b, null, next)).json();
  expect((await answer(a, attempt)).json()).toEqual(replies[0]!.json());
  expect((await answer(a, { ...attempt, input: '不对称' })).statusCode).toBe(409);
  expect((await first.inject({ url: path, headers: a })).json()).toEqual(fresh);
  expect((await pool.query('SELECT 1 FROM attempts WHERE child_id=$1', [owner.id])).rowCount).toBe(
    1,
  );
  expect(
    (await pool.query('SELECT independent FROM progress WHERE child_id=$1', [owner.id])).rows,
  ).toEqual([{ independent: 1 }]);
  const newRound = await roundFor(a);
  expect((await answer(a, submission(newRound, saved.revision))).statusCode).toBe(200);
  expect((await first.inject({ url: path, headers: a })).json()).toEqual(fresh);
});

it('serializes concurrent hint disclosure and completion across sessions', async () => {
  const owner = await child();
  const a = await owner.session();
  const b = await owner.session();
  const round = await roundFor(a);
  const [hint, result] = await Promise.all([
    answer(a, { action: 'hint', round, hintId: 'compare' }),
    answer(b, submission(round), second),
  ]);
  expect([200, 409]).toContain(hint.statusCode);
  expect(result.statusCode).toBe(200);
  expect(result.json()).toMatchObject({
    outcome: hint.statusCode === 200 ? 'assisted' : 'independent',
  });
  expect((await answer(a, submission(round))).statusCode).toBe(409);
});

it('replays a structured answer with reordered keys and rejects changed observations', async () => {
  const headers = await (await child()).session();
  const attempt = {
    ...submission(await roundFor(headers)),
    input: { marks: [1, 2], folded: true },
  };
  const initial = await answer(headers, attempt);
  expect(initial.statusCode).toBe(200);
  const reordered = { ...attempt, input: { folded: true, marks: [1, 2] } };
  expect((await answer(headers, reordered)).json()).toEqual(initial.json());
  expect(
    (await answer(headers, { ...attempt, input: { marks: [2, 1], folded: true } })).statusCode,
  ).toBe(409);
});

it('does not commit an attempt or progress if its matching draft cannot be removed', async () => {
  const owner = await child();
  const a = await owner.session();
  const saved = (await save(a, null)).json();
  const attempt = submission(await roundFor(a), saved.draft.revision);
  await pool.query(`CREATE FUNCTION fail_fixture_draft_delete() RETURNS trigger LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'fixture'; END; $$;
    CREATE TRIGGER fail_fixture_draft_delete BEFORE DELETE ON drafts FOR EACH ROW
    WHEN (OLD.child_id = '${owner.id}') EXECUTE FUNCTION fail_fixture_draft_delete();`);
  try {
    expect((await answer(a, attempt)).statusCode).toBe(503);
    expect(
      (await pool.query('SELECT 1 FROM attempts WHERE child_id=$1', [owner.id])).rowCount,
    ).toBe(0);
    expect(
      (await pool.query('SELECT 1 FROM progress WHERE child_id=$1', [owner.id])).rowCount,
    ).toBe(0);
    expect((await first.inject({ url: path, headers: a })).json()).toEqual(saved);
  } finally {
    await pool.query(
      'DROP TRIGGER fail_fixture_draft_delete ON drafts; DROP FUNCTION fail_fixture_draft_delete()',
    );
  }
  expect((await answer(a, attempt)).statusCode).toBe(200);
});

it('isolates children and versions and rejects forged outcomes, hints and stale credentials', async () => {
  const owner = await child();
  const a = await owner.session();
  const b = await (await child()).session();
  const round = await roundFor(a);
  const versionPath = answerPath.replace('/1/', `/${Number.MAX_SAFE_INTEGER}/`);
  const attempt = submission(round);
  expect((await answer(a, { action: 'hint', round, hintId: 'missing' })).statusCode).toBe(404);
  expect((await answer(a, { action: 'hint', round, hintId: 'compare' })).statusCode).toBe(200);
  expect(
    (await answer(a, { ...attempt, outcome: 'independent', assisted: false })).statusCode,
  ).toBe(400);
  expect((await answer(a, { ...attempt, feedback: { status: 'correct' } })).statusCode).toBe(400);
  expect((await answer(a, attempt, first, versionPath)).json()).toMatchObject({
    outcome: 'independent',
  });
  expect((await answer(b, attempt)).json()).toMatchObject({ outcome: 'independent' });
  expect((await answer(a, attempt)).json()).toMatchObject({ outcome: 'assisted' });
  expect((await answer({ ...a, origin: 'https://other.example' }, attempt)).statusCode).toBe(403);
  expect((await answer({ ...a, 'x-csrf-token': 'wrong' }, attempt)).statusCode).toBe(403);
  await pool.query('UPDATE children SET credential_version=2 WHERE id=$1', [owner.id]);
  expect((await answer(a, attempt)).statusCode).toBe(401);
});
