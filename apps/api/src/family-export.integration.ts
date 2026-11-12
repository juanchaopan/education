import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, expect, it } from 'vitest';
import { familyExportScope, type FamilyExport } from '@education/contracts';
import { buildApp } from './app.js';
import { createFamilyExport } from './family-export-application.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const origin = 'https://education.example';
const app = buildApp({ origin, familyExport: createFamilyExport(pool) });
const drawing = [[{ x: 0.25, y: 0.5 }]];

afterAll(async () => {
  await app.close();
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

async function household(nickname: string | null = '小鹿') {
  const family = randomUUID();
  const token = randomBytes(32).toString('base64url');
  families.push(family);
  await pool.query(`INSERT INTO families(id,code) VALUES($1,$2)`, [family, `CODE-${family}`]);
  await pool.query(
    `WITH parent AS (
       INSERT INTO parents(family_id,email,password_hash,email_verified)
       VALUES($1,$2,'private-password-hash',true) RETURNING id
     )
     INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified,password_verified_at)
     SELECT $3,id,1,1,now()+interval '1 day',true,clock_timestamp() FROM parent`,
    [family, `${family}@example.test`, tokenHash(token)],
  );
  await pool.query(
    `INSERT INTO registration_keys(family_id,key_hash,expires_at)
     VALUES($1,$2,now()+interval '1 day')`,
    [family, `private-key-${family}`],
  );
  const child = nickname ? await learner(family, nickname) : undefined;
  return { family, token, child };
}

async function learner(family: string, nickname: string) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO children(family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
     VALUES($1,$2,$2,'private-pin-hash',1) RETURNING id`,
    [family, nickname],
  );
  const child = rows[0]!.id;
  const round = randomUUID();
  await pool.query(
    `INSERT INTO progress(child_id,problem_id,problem_version,round,independent,incorrect)
     VALUES($1,'apples',1,$2,0,2)`,
    [child, round],
  );
  await pool.query(
    `INSERT INTO help_events(child_id,problem_id,problem_version,round,hint_id)
     VALUES($1,'apples',1,$2,'count'),($1,'shapes',2,$2,'look')`,
    [child, round],
  );
  // The maintained book, and a book id the catalogue does not list.
  await pool.query(
    `INSERT INTO book_assignments(child_id,book_id)
     VALUES($1,'g1-math-xueersi'),($1,'fixture-missing-book')`,
    [child],
  );
  await pool.query(
    `INSERT INTO drafts(child_id,problem_id,problem_version,content,expires_at) VALUES
       ($1,'apples',1,$2,now()+interval '1 day'),
       ($1,'shapes',2,$2,now()-interval '1 minute'),
       ($1,'trains',1,'{"stepId":"","drawing":"broken"}',now()+interval '1 day')`,
    [child, { stepId: 'count', drawing }],
  );
  await pool.query(
    `INSERT INTO ai_consents(family_id,scope,policy_version,granted) VALUES($1,'openai-tutoring',1,true)`,
    [family],
  );
  return child;
}

// What the export holds for a child made by `learner`: its learning summary,
// the maintained book without the one the catalogue does not list, and the
// draft that has not expired.
const exportedLearner = {
  nickname: '小鹿',
  learning: [
    {
      id: 'apples',
      version: 1,
      title: null,
      independent: 0,
      assisted: 0,
      incorrect: 2,
      uncertain: 0,
      hints: 1,
      reviewSuggested: true,
    },
    expect.objectContaining({ id: 'shapes', version: 2, hints: 1, reviewSuggested: false }),
  ],
  books: [
    {
      id: 'g1-math-xueersi',
      grade: '一年级',
      subject: '数学',
      name: '学而思',
      status: 'available',
      assignedAt: expect.any(String),
      done: 0,
      total: 1,
      finished: false,
    },
  ],
  drafts: [
    {
      id: 'apples',
      version: 1,
      title: null,
      expiresAt: expect.any(String),
      content: { stepId: 'count', drawing },
    },
  ],
};

const exportFor = (token: string) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/parents/family-export',
    headers: {
      cookie: `__Host-education_session=${token}`,
      origin,
      'content-type': 'application/json',
      'x-education-request': 'session',
      'x-csrf-token': csrfToken(token),
    },
    payload: {},
  });

it('exports only the signed-in family, its books, its live drafts and no credentials', async () => {
  const owner = await household('小鹿');
  const other = await household('小兔');
  const response = await exportFor(owner.token);
  expect(response.statusCode).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  const file = response.json<FamilyExport>();
  expect(file.format).toMatchObject({
    name: 'education-family-export',
    version: 2,
    includes: [...familyExportScope.includes],
  });
  expect(file.parent).toEqual({ email: `${owner.family}@example.test`, emailVerified: true });
  expect(file.aiConsents).toEqual([
    { scope: 'openai-tutoring', policyVersion: 1, granted: true, changedAt: expect.any(String) },
  ]);
  expect(file.children).toEqual([exportedLearner]);
  for (const secret of [
    'private-',
    owner.token,
    tokenHash(owner.token),
    `CODE-${owner.family}`,
    owner.child!,
    other.family,
    '小兔',
    'fixture-missing-book',
  ])
    expect(response.body).not.toContain(secret);
});

it('asks for the password again once the confirmation is no longer recent', async () => {
  const owner = await household();
  await pool.query(
    `UPDATE parent_sessions SET password_verified_at=clock_timestamp()-interval '6 minutes'
     WHERE token_hash=$1`,
    [tokenHash(owner.token)],
  );
  const response = await exportFor(owner.token);
  expect(response.statusCode).toBe(403);
  expect(response.headers['content-disposition']).toBeUndefined();
  expect(response.body).not.toContain('小鹿');
});

it('gives no data when the session is revoked while the export waits for the family', async () => {
  const owner = await household();
  const reset = await pool.connect();
  try {
    await reset.query('BEGIN');
    await reset.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [owner.family]);
    const pending = exportFor(owner.token);
    await waitUntilBlockedBy(reset);
    await reset.query('COMMIT');
    const response = await pending;
    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain('小鹿');
  } finally {
    reset.release();
  }
});

it('gives no data once the family has been deleted', async () => {
  const owner = await household();
  await pool.query('DELETE FROM families WHERE id=$1', [owner.family]);
  const response = await exportFor(owner.token);
  expect(response.statusCode).toBe(401);
  expect(response.body).not.toContain('小鹿');
});

it('exports a family that has no children yet', async () => {
  const owner = await household(null);
  const response = await exportFor(owner.token);
  expect(response.statusCode).toBe(200);
  expect(response.json<FamilyExport>()).toMatchObject({ children: [], aiConsents: [] });
});

// Waits until some backend is waiting for a lock that this connection holds,
// which here can only be the export reading the family row.
async function waitUntilBlockedBy(holder: pg.PoolClient) {
  const { rows } = await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
  for (let attempt = 0; attempt < 100; attempt++) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',
      [rows[0]!.pid],
    );
    if (rowCount) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('The export never waited for the family lock');
}
