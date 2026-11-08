import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import type { AiConsentChange, AiConsentView } from '@education/contracts';
import { buildApp } from './app.js';
import { createAiConsent } from './ai-consent-application.js';
import { createAiTutoring } from './ai-tutoring-application.js';
import { largestReservationCost } from './ai/domain/ai-budget.js';
import { reservationCost } from './ai/domain/tutoring-cost.js';
import { createTutoringUsage } from './ai/repositories/postgres-tutoring-usage.js';
import { hintTask } from './ai/services/hint-task.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';
import { readConfig } from './shared/config.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const origin = 'https://education.example';
const consent = createAiConsent(pool, readConfig({}).ai);
const app = buildApp({ origin, aiConsent: consent });
const url = '/api/v1/parents/ai-consent';
const tutoring = 'openai-tutoring';
const transcription = 'openai-transcription';

afterEach(async () => {
  await pool.query('DELETE FROM ai_usage WHERE family_id=ANY($1::uuid[])', [families]);
});

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
  expect(saved.json<AiConsentView>().tutoringBudget).toBe('unset');
  expect(saved.json<AiConsentView>().policies).toEqual([
    expect.objectContaining({ scope: tutoring, state: 'granted', availability: 'unavailable' }),
    expect.objectContaining({
      scope: transcription,
      state: 'ungranted',
      availability: 'unavailable',
    }),
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

it('tells the parent which services this deployment can call, whatever the family decided', async () => {
  const owner = await household();
  await recent(owner.parent);
  expect((await change(owner.parent, await decision(owner.parent))).statusCode).toBe(200);
  const parent = { token: owner.parent, csrf: csrfToken(owner.parent) };
  const availability = async (env: NodeJS.ProcessEnv) =>
    (await createAiConsent(pool, readConfig(env).ai).read(parent)).policies.map(
      (policy) => policy.availability,
    );
  expect(await availability({})).toEqual(['unavailable', 'unavailable']);
  expect(await availability({ ...tutoringEnv, PAID_AI_ENABLED: 'false' })).toEqual([
    'unavailable',
    'unavailable',
  ]);
  expect(await availability(tutoringEnv)).toEqual(['ready', 'unavailable']);
});

it('admits only one reservation across pools, releases a rejected send and holds a cancelled one', async () => {
  const first = await tutoringHousehold();
  const second = await tutoringHousehold();
  const env = { ...tutoringEnv, AI_MONTHLY_BUDGET_USD: '0.002112' };
  const status = createAiConsent(pool, {
    ...readConfig(tutoringEnv).ai,
    monthlyBudget: largestReservationCost,
  });
  const parent = { token: first.parent, csrf: csrfToken(first.parent) };
  expect((await status.read(parent)).tutoringBudget).toBe('available');
  const otherPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const { started, finish, send } = pendingProvider();
  const a = hintGateway(pool, env, send);
  const b = hintGateway(otherPool, env, send);
  const firstRequest = a(first.credentials, tutoringContext);
  const secondRequest = b(second.credentials, tutoringContext);
  const both = Promise.all([firstRequest, secondRequest]);
  try {
    await Promise.race([
      started,
      both.then(() => {
        throw new Error('Provider was not called');
      }),
    ]);
    expect((await status.read(parent)).tutoringBudget).toBe('limited');
    await expect(Promise.race([firstRequest, secondRequest])).resolves.toMatchObject({
      reason: 'usage-limited',
    });
    finish(new Response(null, { status: 401 }));
    expect(await both).toContainEqual({ status: 'fallback', reason: 'unavailable' });
    expect((await status.read(parent)).tutoringBudget).toBe('available');
    await verifyCancelledReservation(env, second);
    expect((await status.read(parent)).tutoringBudget).toBe('limited');
    await expect(b(first.credentials, tutoringContext)).resolves.toMatchObject({
      reason: 'usage-limited',
    });
    expect(send).toHaveBeenCalledTimes(1);
  } finally {
    finish(new Response(null, { status: 401 }));
    await both;
    await otherPool.end();
  }
});

it('records only billing metadata and settles once even if a later completion disagrees', async () => {
  const owner = await tutoringHousehold();
  const send = vi.fn<typeof fetch>().mockImplementation(async () => usageResponse());
  const request = hintGateway(pool, tutoringEnv, send);
  await expect(request(owner.credentials, tutoringContext)).resolves.toMatchObject({
    reason: 'unavailable',
  });
  const settled = await usageRows(owner.family);
  expect(settled).toEqual([
    {
      id: expect.any(String),
      state: 'settled',
      amount: '16250',
      model: 'gpt-6-luna',
      input_tokens: '82',
      output_tokens: '12',
    },
  ]);
  const ledger = createTutoringUsage(pool, null);
  await ledger.settle(settled[0]!.id, { status: 'released' });
  expect(await usageRows(owner.family)).toEqual(settled);
});

it('limits repeated requests even with no monetary cap', async () => {
  const owner = await tutoringHousehold();
  const send = vi.fn<typeof fetch>().mockImplementation(async () => usageResponse());
  const request = hintGateway(pool, tutoringEnv, send);
  const results = await Promise.all(
    Array.from({ length: 8 }, () => request(owner.credentials, tutoringContext)),
  );
  expect(
    results.filter((result) => result.status === 'fallback' && result.reason === 'usage-limited'),
  ).toHaveLength(2);
  expect(send).toHaveBeenCalledTimes(6);
});

const tutoringEnv = { OPENAI_API_KEY: 'synthetic-key', OPENAI_TUTORING_ELIGIBLE: 'true' };
const tutoringContext = { step: '数一数左边的物体。', question: '从哪里开始？' };

function hintGateway(db: pg.Pool, env: NodeJS.ProcessEnv, send: typeof fetch) {
  const gateway = createAiTutoring(db, env, send);
  return (
    credentials: Parameters<typeof gateway>[1],
    context: typeof tutoringContext,
    signal?: AbortSignal,
  ) => gateway(hintTask, credentials, context, signal);
}

async function tutoringHousehold() {
  const owner = await household();
  await recent(owner.parent);
  expect((await change(owner.parent, await decision(owner.parent))).statusCode).toBe(200);
  return { ...owner, credentials: { token: owner.child, csrf: csrfToken(owner.child) } };
}

function pendingProvider() {
  let enter!: () => void;
  let finish!: (response: Response) => void;
  const started = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const response = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const send = vi.fn<typeof fetch>(() => {
    enter();
    return response;
  });
  return { started, finish, send };
}

function usageResponse() {
  const body = {
    type: 'response.incomplete',
    response: { status: 'incomplete', usage: { input_tokens: 82, output_tokens: 12 } },
  };
  return new Response(`data: ${JSON.stringify(body)}\n\n`, {
    headers: { 'content-type': 'text/event-stream' },
  });
}

async function verifyCancelledReservation(
  env: typeof tutoringEnv,
  owner: Awaited<ReturnType<typeof tutoringHousehold>>,
) {
  const provider = pendingProvider();
  const controller = new AbortController();
  const request = hintGateway(pool, env, provider.send);
  const running = request(owner.credentials, tutoringContext, controller.signal);
  await Promise.race([
    provider.started,
    running.then(() => {
      throw new Error('Provider was not called');
    }),
  ]);
  controller.abort();
  await expect(running).resolves.toMatchObject({ reason: 'cancelled' });
  expect(await usageRows(owner.family)).toEqual([
    expect.objectContaining({ state: 'reserved', amount: reservationCost.toString() }),
  ]);
  provider.finish(new Response(null, { status: 503 }));
  await vi.waitFor(async () => {
    expect(await usageRows(owner.family)).toEqual([
      expect.objectContaining({ state: 'unknown', amount: reservationCost.toString() }),
    ]);
  });
}

async function usageRows(family: string) {
  const result = await pool.query<{ id: string }>(
    `SELECT id,state,model,amount_nanodollars::text AS amount,input_tokens::text,output_tokens::text
     FROM ai_usage WHERE family_id=$1`,
    [family],
  );
  return result.rows;
}

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
  let entered!: () => void;
  let release!: (response: Response) => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const headers = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const send = vi.fn<typeof fetch>(() => {
    entered();
    return headers;
  });
  const env = { OPENAI_API_KEY: 'synthetic-key' };
  await expect(hintGateway(pool, env, send)(child, context)).resolves.toEqual({
    status: 'fallback',
    reason: 'ineligible',
  });
  const request = hintGateway(pool, { ...env, OPENAI_TUTORING_ELIGIBLE: 'true' }, send);
  await expect(request(child, context)).resolves.toMatchObject({ reason: 'unauthorized' });
  await recent(owner.parent);
  expect((await change(owner.parent, await decision(owner.parent))).statusCode).toBe(200);
  const revoke = { ...(await decision(owner.parent)), granted: false };
  const running = request(child, context);
  try {
    await Promise.race([
      started,
      running.then(() => {
        throw new Error('Dispatch never started');
      }),
    ]);
    expect((await change(owner.parent, revoke)).statusCode).toBe(200);
    await expect(request(child, context)).resolves.toMatchObject({ reason: 'unauthorized' });
    expect(send).toHaveBeenCalledTimes(1);
  } finally {
    release(new Response('synthetic private provider error', { status: 503 }));
    await expect(running).resolves.toMatchObject({ reason: 'unavailable' });
  }
});
