import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createAnswering } from './answer-application.js';
import { createLearningSummary } from './learning-summary-application.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';
import { teacherQuestion } from './learning/services/answer.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const origin = 'https://education.example';
const answering = createAnswering(pool, 'fixture-key', () => ({
  hints: { observe: '仔细观察。' },
  checkCompletion: (input) =>
    input === true ? 'correct' : input === false ? 'incorrect' : 'uncertain',
}));
const app = buildApp({
  origin,
  answering,
  learningSummary: createLearningSummary(pool, (id, version) =>
    id === 'test-pattern' && version === 2 ? '辨认规律' : undefined,
  ),
});

afterAll(async () => {
  await app.close();
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

async function parent(verified = true) {
  const family = randomUUID();
  families.push(family);
  await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
  const { rows } = await pool.query<{ id: string }>(
    'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,$4) RETURNING id',
    [family, `${family}@example.test`, 'fixture', verified],
  );
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
     VALUES($1,$2,1,1,now()+interval '1 day',$3)`,
    [tokenHash(token), rows[0]!.id, verified],
  );
  return { family, token };
}

async function child(family: string, nickname = '小鹿') {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO children(id,family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
     VALUES($1,$2,$3,$3,'fixture',1)`,
    [id, family, nickname],
  );
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
     VALUES($1,$2,1,1,now()+interval '1 day')`,
    [tokenHash(token), id],
  );
  return { id, token };
}

function cookie(token: string) {
  return { cookie: `__Host-education_session=${token}` };
}

function read(id: string, token: string, query = '') {
  return app.inject({
    url: `/api/v1/parents/children/${id}/learning-summary${query}`,
    headers: cookie(token),
  });
}

// One round of a problem as a child plays it: open hints, ask the teacher
// while answering, and submit answers.
async function lesson(token: string, version: number, id = 'test-pattern') {
  const url = `/api/v1/problems/${id}/${version}/answer`;
  const headers = {
    ...cookie(token),
    origin,
    'x-csrf-token': csrfToken(token),
    'x-education-request': 'session',
  };
  const { round } = (await app.inject({ url, headers })).json<{ round: string }>();
  const post = (payload: object) => app.inject({ method: 'POST', url, headers, payload });
  return {
    hint: (hintId = 'observe') => post({ action: 'hint', round, hintId }),
    question: () => post({ action: 'question', round }),
    submit: (input: unknown, attemptId = randomUUID()) =>
      post({ action: 'submit', round, attemptId, input, draftRevision: null }),
  };
}

it('separates assisted and independent completion by version and removes the recommendation after independent success', async () => {
  const owner = await parent();
  const learner = await child(owner.family);
  const first = await lesson(learner.token, 1);
  const second = await lesson(learner.token, 2);
  const attempt = randomUUID();
  expect((await first.submit(false, attempt)).json().outcome).toBe('incorrect');
  expect((await first.submit(false, attempt)).statusCode).toBe(200);
  expect((await first.hint()).statusCode).toBe(200);
  expect((await first.hint()).statusCode).toBe(200);
  expect((await first.submit(false)).json().outcome).toBe('incorrect');
  expect((await first.submit(true)).json().outcome).toBe('assisted');
  expect((await second.submit(true)).json().outcome).toBe('independent');
  const result = await read(learner.id, owner.token);
  expect(result.statusCode).toBe(200);
  expect(result.headers['cache-control']).toBe('no-store');
  expect(result.headers.vary).toBe('Cookie');
  expect(result.json()).toEqual({
    childId: learner.id,
    hasMore: false,
    problems: [
      {
        id: 'test-pattern',
        version: 1,
        title: null,
        independent: 0,
        assisted: 1,
        incorrect: 2,
        uncertain: 0,
        hints: 1,
        reviewSuggested: true,
      },
      {
        id: 'test-pattern',
        version: 2,
        title: '辨认规律',
        independent: 1,
        assisted: 0,
        incorrect: 0,
        uncertain: 0,
        hints: 0,
        reviewSuggested: false,
      },
    ],
  });
  const next = await lesson(learner.token, 1);
  expect((await next.submit(true)).json().outcome).toBe('independent');
  expect((await read(learner.id, owner.token)).json().problems[0]).toMatchObject({
    incorrect: 2,
    independent: 1,
    reviewSuggested: false,
  });
});

it('counts questions to the teacher while answering as one help per round, beside the hints', async () => {
  const owner = await parent();
  const learner = await child(owner.family);
  const first = await lesson(learner.token, 1);
  expect((await first.question()).json()).toEqual({ helped: true });
  expect((await first.question()).statusCode).toBe(200);
  expect((await first.hint()).statusCode).toBe(200);
  expect((await first.hint(teacherQuestion)).statusCode).toBe(400);
  expect((await first.submit(true)).json().outcome).toBe('assisted');
  expect((await first.question()).statusCode).toBe(409);
  const second = await lesson(learner.token, 1);
  expect((await second.question()).statusCode).toBe(200);
  expect((await second.submit(true)).json().outcome).toBe('assisted');
  expect((await read(learner.id, owner.token)).json().problems).toEqual([
    expect.objectContaining({ id: 'test-pattern', version: 1, assisted: 2, hints: 3 }),
  ]);
  const { rows } = await pool.query<{ hint_id: string }>(
    'SELECT hint_id FROM help_events WHERE child_id=$1 ORDER BY hint_id',
    [learner.id],
  );
  expect(rows.map((row) => row.hint_id)).toEqual(['observe', teacherQuestion, teacherQuestion]);
});

it('includes hint-only records, excludes uncertain results from review evidence, and isolates siblings', async () => {
  const owner = await parent();
  const learner = await child(owner.family);
  const sibling = await child(owner.family, '小猫');
  const uncertain = await lesson(learner.token, 1, 'test-uncertain');
  const hintOnly = await lesson(learner.token, 1, 'test-hint-only');
  expect((await uncertain.submit('未识别')).json().outcome).toBe('uncertain');
  expect((await uncertain.submit('待确认')).json().outcome).toBe('uncertain');
  expect((await hintOnly.hint()).statusCode).toBe(200);
  expect((await read(learner.id, owner.token)).json().problems).toEqual([
    expect.objectContaining({
      id: 'test-hint-only',
      hints: 1,
      incorrect: 0,
      reviewSuggested: false,
    }),
    expect.objectContaining({
      id: 'test-uncertain',
      incorrect: 0,
      uncertain: 2,
      reviewSuggested: false,
    }),
  ]);
  expect((await read(sibling.id, owner.token)).json()).toEqual({
    childId: sibling.id,
    problems: [],
    hasMore: false,
  });
});

it('rejects missing, revoked, child and unverified sessions and gives the same 404 for foreign and unknown children', async () => {
  const owner = await parent();
  const learner = await child(owner.family);
  const other = await parent();
  const unverified = await parent(false);
  const ownUnverifiedChild = await child(unverified.family);
  expect((await read(learner.id, '')).statusCode).toBe(401);
  expect((await read(learner.id, learner.token)).statusCode).toBe(401);
  expect((await read(ownUnverifiedChild.id, unverified.token)).statusCode).toBe(401);
  const foreign = await read(learner.id, other.token);
  expect(foreign.statusCode).toBe(404);
  expect(foreign.json()).toEqual((await read(randomUUID(), other.token)).json());
  expect((await read(learner.id, owner.token, '?offset=-1')).statusCode).toBe(400);
  expect((await read(learner.id, owner.token, '?family=other')).statusCode).toBe(400);
  await pool.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [owner.family]);
  expect((await read(learner.id, owner.token)).statusCode).toBe(401);
});

it('returns a bounded page in stable problem and version order', async () => {
  const owner = await parent();
  const learner = await child(owner.family);
  await pool.query(
    `INSERT INTO help_events(child_id,problem_id,problem_version,round,hint_id)
     SELECT $1,'test-page',n,$2,'observe' FROM generate_series(1,21) n`,
    [learner.id, randomUUID()],
  );
  const first = (await read(learner.id, owner.token)).json();
  const next = (await read(learner.id, owner.token, '?offset=20')).json();
  expect(first.hasMore).toBe(true);
  expect(first.problems.map((item: { version: number }) => item.version)).toEqual(
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
  expect(next.hasMore).toBe(false);
  expect(next.problems).toEqual([expect.objectContaining({ version: 21, hints: 1 })]);
});
