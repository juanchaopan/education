import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, expect, it, vi } from 'vitest';
import type { AiConsentChange, AiConsentView } from '@education/contracts';
import { buildApp } from './app.js';
import { createAiConsent } from './ai-consent-application.js';
import { createAiTutoring } from './ai-tutoring-application.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const origin = 'https://education.example';
const consent = createAiConsent(pool);
const app = buildApp({ origin, aiConsent: consent });
const url = '/api/v1/parents/ai-consent';
const tutoring = 'openai-tutoring';
const transcription = 'openai-transcription';

afterAll(async () => {
  await app.close();
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

async function household(verified = true) {
  const family = randomUUID();
  const parent = randomBytes(32).toString('base64url');
  const child = randomBytes(32).toString('base64url');
  families.push(family);
  await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
  await pool.query(
    `WITH parent AS (
       INSERT INTO parents(family_id,email,password_hash,email_verified)
       VALUES($1,$2,'fixture',$3) RETURNING id
     )
     INSERT INTO parent_sessions(token_hash,parent_id,credential_version,family_epoch,expires_at,verified)
     SELECT $4,id,1,1,now()+interval '1 day',$3 FROM parent`,
    [family, `${family}@example.test`, verified, tokenHash(parent)],
  );
  await pool.query(
    `WITH child AS (
       INSERT INTO children(family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
       VALUES($1,'小鹿','小鹿','fixture',1) RETURNING id
     )
     INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
     SELECT $2,id,1,1,now()+interval '1 day' FROM child`,
    [family, tokenHash(child)],
  );
  return { family, parent, child };
}

const headers = (token: string) => ({
  cookie: `__Host-education_session=${token}`,
  origin,
  'x-education-request': 'session',
  'x-csrf-token': csrfToken(token),
});
const read = (token: string) => app.inject({ url, headers: headers(token) });
const change = (token: string, payload: AiConsentChange, extra = {}) =>
  app.inject({ method: 'POST', url, headers: { ...headers(token), ...extra }, payload });
const recent = (token: string) =>
  pool.query(
    'UPDATE parent_sessions SET password_verified_at=clock_timestamp() WHERE token_hash=$1',
    [tokenHash(token)],
  );
const dispatch = <T>(token: string, scope: AiConsentChange['scope'], start: () => Promise<T>) =>
  consent.dispatch({ token, csrf: csrfToken(token) }, scope, start);

async function decision(token: string, scope: AiConsentChange['scope'] = tutoring) {
  const reply = await read(token);
  expect(reply.statusCode).toBe(200);
  const { policyVersion, revision } = reply
    .json<AiConsentView>()
    .policies.find((p) => p.scope === scope)!;
  return { scope, policyVersion, revision, granted: true };
}

it('defaults to denial, then permits only the authorized purpose and family', async () => {
  const owner = await household();
  const other = await household();
  const start = vi.fn(async () => 'fixture');
  const grant = await decision(owner.parent);
  await expect(dispatch(owner.child, tutoring, start)).rejects.toMatchObject({ statusCode: 403 });
  expect(start).not.toHaveBeenCalled();
  expect((await change(owner.parent, grant)).statusCode).toBe(403);
  await recent(owner.parent);
  const saved = await change(owner.parent, grant);
  expect(saved.statusCode).toBe(200);
  expect(saved.headers['cache-control']).toBe('no-store');
  expect(saved.json<AiConsentView>().policies).toEqual([
    expect.objectContaining({ scope: tutoring, state: 'granted' }),
    expect.objectContaining({ scope: transcription, state: 'ungranted' }),
  ]);
  await expect(dispatch(owner.child, tutoring, start)).resolves.toBe('fixture');
  await expect(dispatch(owner.child, transcription, start)).rejects.toMatchObject({
    statusCode: 403,
  });
  await expect(dispatch(other.child, tutoring, start)).rejects.toMatchObject({ statusCode: 403 });
  expect(start).toHaveBeenCalledTimes(1);
  expect((await read(other.parent)).json<AiConsentView>().policies[0]?.state).toBe('ungranted');
  const rows = await pool.query('SELECT * FROM ai_consents WHERE family_id=$1', [owner.family]);
  expect(rows.rows).toEqual([
    {
      family_id: owner.family,
      scope: tutoring,
      policy_version: grant.policyVersion,
      granted: true,
      revision: expect.any(String),
      changed_at: expect.any(Date),
    },
  ]);
  await pool.query('DELETE FROM families WHERE id=$1', [owner.family]);
  expect(
    (await pool.query('SELECT 1 FROM ai_consents WHERE family_id=$1', [owner.family])).rowCount,
  ).toBe(0);
});

it('requires verified sessions, CSRF, exact origin, and the current policy and decision revision', async () => {
  const owner = await household();
  const unverified = await household(false);
  await recent(owner.parent);
  const grant = await decision(owner.parent);
  expect((await read(owner.child)).statusCode).toBe(401);
  expect((await change(unverified.parent, grant)).statusCode).toBe(401);
  expect((await change(owner.parent, grant, { origin: 'https://other.example' })).statusCode).toBe(
    403,
  );
  expect((await change(owner.parent, grant, { 'x-csrf-token': 'invalid' })).statusCode).toBe(403);
  const injected = { ...grant, familyId: unverified.family };
  expect((await change(owner.parent, injected)).statusCode).toBe(400);
  expect(
    (await change(owner.parent, { ...grant, policyVersion: grant.policyVersion - 1 })).statusCode,
  ).toBe(409);
  expect((await change(owner.parent, grant)).statusCode).toBe(200);
  await pool.query('UPDATE ai_consents SET policy_version=policy_version-1 WHERE family_id=$1', [
    owner.family,
  ]);
  const start = vi.fn(async () => 'fixture');
  await expect(dispatch(owner.child, tutoring, start)).rejects.toMatchObject({ statusCode: 403 });
  expect(start).not.toHaveBeenCalled();
  expect((await read(owner.parent)).json<AiConsentView>().policies[0]?.state).toBe(
    'policy-changed',
  );
  const regrant = await decision(owner.parent);
  expect((await change(owner.parent, regrant)).statusCode).toBe(200);
  const revoke = { ...(await decision(owner.parent)), granted: false };
  expect((await change(owner.parent, revoke)).statusCode).toBe(200);
  expect((await change(owner.parent, grant)).statusCode).toBe(409);
  expect((await change(owner.parent, regrant)).statusCode).toBe(409);
  await expect(dispatch(owner.child, tutoring, start)).rejects.toMatchObject({ statusCode: 403 });
  await pool.query('UPDATE families SET auth_epoch=auth_epoch+1 WHERE id=$1', [owner.family]);
  await expect(dispatch(owner.child, tutoring, start)).rejects.toMatchObject({ statusCode: 401 });
  expect((await change(owner.parent, revoke)).statusCode).toBe(401);
});

it('holds the family lock during dispatch and denies further sends after revocation commits', async () => {
  const owner = await household();
  await recent(owner.parent);
  expect((await change(owner.parent, await decision(owner.parent))).statusCode).toBe(200);
  const revoke = { ...(await decision(owner.parent)), granted: false };
  let entered!: () => void;
  let release!: (result: string) => void;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const hold = new Promise<string>((resolve) => {
    release = resolve;
  });
  const running = dispatch(owner.child, tutoring, () => {
    entered();
    return hold;
  });
  await ready;
  const revoked = change(owner.parent, revoke);
  const later = vi.fn(async () => 'unexpected');
  try {
    // The same exclusive row lock used by a parent write is unavailable
    // while the provider stub is starting under the child's shared lock.
    await expect(
      pool.query('SELECT id FROM families WHERE id=$1 FOR UPDATE NOWAIT', [owner.family]),
    ).rejects.toMatchObject({ code: '55P03' });
    release('dispatched before revocation');
    await expect(running).resolves.toBe('dispatched before revocation');
    expect((await revoked).statusCode).toBe(200);
    await expect(dispatch(owner.child, tutoring, later)).rejects.toMatchObject({ statusCode: 403 });
    expect(later).not.toHaveBeenCalled();
  } finally {
    release('cleanup');
    await Promise.allSettled([running, revoked]);
  }
});

it('commits consent dispatch before upstream headers arrive and denies new tutoring after withdrawal', async () => {
  const owner = await household();
  const child = { token: owner.child, csrf: csrfToken(owner.child) };
  const context = { step: '观察左边的物体。', question: '从哪里开始？' };
  const entered = Promise.withResolvers<void>();
  const headers = Promise.withResolvers<Response>();
  const send = vi.fn<typeof fetch>(() => {
    entered.resolve();
    return headers.promise;
  });
  const env = { OPENAI_API_KEY: 'synthetic-key' };
  await expect(createAiTutoring(pool, env, send)(child, context)).resolves.toEqual({
    status: 'fallback',
    reason: 'ineligible',
  });
  const request = createAiTutoring(pool, { ...env, OPENAI_TUTORING_ELIGIBLE: 'true' }, send);
  await expect(request(child, context)).resolves.toMatchObject({ reason: 'unauthorized' });
  await recent(owner.parent);
  expect((await change(owner.parent, await decision(owner.parent))).statusCode).toBe(200);
  const revoke = { ...(await decision(owner.parent)), granted: false };
  const running = request(child, context);
  try {
    await Promise.race([
      entered.promise,
      running.then(() => {
        throw new Error('Dispatch never started');
      }),
    ]);
    expect((await change(owner.parent, revoke)).statusCode).toBe(200);
    await expect(request(child, context)).resolves.toMatchObject({ reason: 'unauthorized' });
    expect(send).toHaveBeenCalledTimes(1);
  } finally {
    headers.resolve(new Response('synthetic private provider error', { status: 503 }));
    await expect(running).resolves.toMatchObject({ reason: 'unavailable' });
  }
});
