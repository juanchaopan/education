import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { createProblemRegistry } from '@education/problems/server';
import { aiConsentPolicies } from './identity/domain/ai-consent-policy.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';
import { createTeachingFeedback } from './teaching-feedback-application.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
// Usage rows whose family was deleted no longer name it, so they are removed by ID.
const anonymousUsage: string[] = [];
const env = { OPENAI_API_KEY: 'synthetic-key', OPENAI_TUTORING_ELIGIBLE: 'true' };
const problem = { id: 'count-dots', version: 1 };
const registry = createProblemRegistry([
  {
    summary: {
      ...problem,
      title: 'fixture',
      grade: '1年级',
      subject: '数学',
      category: '图形',
      sequence: 1,
    },
    feedback: { 'count-left': { prompt: '数一数左边的点。' } },
    checkStep: ({ answer }) => ({
      status: answer === '三个' ? 'correct' : 'uncertain',
      instruction: answer === '三个' ? '数对了！' : '再看看。',
      stepId: 'count-left',
    }),
  },
]);
const modelReply = {
  status: 'needs-work',
  instruction: '再数一数框里的点。',
  confidence: 0.9,
  injection: false,
  highlight: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
};

afterEach(async () => {
  await pool.query('DELETE FROM ai_usage WHERE family_id=ANY($1::uuid[]) OR id=ANY($2::uuid[])', [
    families,
    anonymousUsage,
  ]);
});

afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

async function child(consented: boolean) {
  const family = randomUUID();
  const token = randomBytes(32).toString('base64url');
  families.push(family);
  await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
  await pool.query(
    `WITH child AS (
       INSERT INTO children(family_id,nickname,canonical_nickname,pin_hash,pin_pepper_version)
       VALUES($1,'小鹿','小鹿','fixture',1) RETURNING id
     )
     INSERT INTO child_sessions(token_hash,child_id,credential_version,family_epoch,expires_at)
     SELECT $2,id,1,1,now()+interval '1 day' FROM child`,
    [family, tokenHash(token)],
  );
  if (consented)
    await pool.query(
      'INSERT INTO ai_consents(family_id,scope,policy_version,granted) VALUES($1,$2,$3,true)',
      [family, 'openai-tutoring', aiConsentPolicies['openai-tutoring'].policyVersion],
    );
  return { family, credentials: { token, csrf: csrfToken(token) } };
}

function providerReply(text: string) {
  const body = {
    type: 'response.completed',
    response: {
      status: 'completed',
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }],
      usage: { input_tokens: 300, output_tokens: 60 },
    },
  };
  return new Response(`data: ${JSON.stringify(body)}\n\n`, {
    headers: { 'content-type': 'text/event-stream' },
  });
}

function service(send: typeof fetch) {
  return createTeachingFeedback(pool, env, send, registry.find);
}

async function usage(family: string) {
  const { rows } = await pool.query<{ state: string; input_tokens: string }>(
    'SELECT state,input_tokens::text FROM ai_usage WHERE family_id=$1',
    [family],
  );
  return rows;
}

it('answers conclusive rules without consent, the provider or any usage record', async () => {
  const owner = await child(false);
  const send = vi.fn<typeof fetch>();
  await expect(
    service(send)(owner.credentials, problem, { stepId: 'count-left', text: '三个' }),
  ).resolves.toMatchObject({ status: 'ready', source: 'rules' });
  expect(send).not.toHaveBeenCalled();
  expect(await usage(owner.family)).toEqual([]);
});

it('needs a valid child session and withholds the model without family consent', async () => {
  const owner = await child(false);
  const send = vi.fn<typeof fetch>();
  const request = service(send);
  await expect(
    request({ token: 'invalid', csrf: 'invalid' }, problem, { stepId: 'count-left', text: '好了' }),
  ).rejects.toMatchObject({ statusCode: 401 });
  await expect(
    request(owner.credentials, problem, { stepId: 'count-left', text: '好了' }),
  ).resolves.toEqual({ status: 'fallback', reason: 'unauthorized' });
  expect(send).not.toHaveBeenCalled();
  expect(await usage(owner.family)).toEqual([]);
});

it('sends only the step and the submission to the model and settles the usage', async () => {
  const owner = await child(true);
  const send = vi.fn<typeof fetch>(async () => providerReply(JSON.stringify(modelReply)));
  await expect(
    service(send)(owner.credentials, problem, { stepId: 'count-left', text: '我数了四个' }),
  ).resolves.toEqual({
    status: 'ready',
    source: 'ai',
    feedback: {
      status: 'needs-work',
      instruction: modelReply.instruction,
      stepId: 'count-left',
    },
  });
  const body = String(send.mock.calls[0]?.[1]?.body);
  expect(body).toContain('数一数左边的点。');
  expect(body).toContain('我数了四个');
  expect(body).not.toContain(owner.family);
  expect(body).not.toContain(owner.credentials.token);
  expect(body).not.toContain('小鹿');
  expect(await usage(owner.family)).toEqual([{ state: 'settled', input_tokens: '300' }]);
});

it('falls back to guidance without losing the request when the provider reply is unusable', async () => {
  const owner = await child(true);
  const send = vi.fn<typeof fetch>(async () => providerReply('你画得真好'));
  await expect(
    service(send)(owner.credentials, problem, { stepId: 'count-left', text: '好了' }),
  ).resolves.toEqual({ status: 'fallback', reason: 'unavailable' });
  expect(await usage(owner.family)).toEqual([{ state: 'settled', input_tokens: '300' }]);
});

it('withholds a reply that arrives after the family is deleted and still settles its cost', async () => {
  const owner = await child(true);
  // The family is deleted while the provider is working on the request.
  const send = vi.fn<typeof fetch>(async () => {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM ai_usage WHERE family_id=$1',
      [owner.family],
    );
    anonymousUsage.push(...rows.map(({ id }) => id));
    await pool.query('DELETE FROM families WHERE id=$1', [owner.family]);
    return providerReply(JSON.stringify(modelReply));
  });
  await expect(
    service(send)(owner.credentials, problem, { stepId: 'count-left', text: '我数了四个' }),
  ).resolves.toEqual({ status: 'fallback', reason: 'unauthorized' });
  expect(send).toHaveBeenCalledOnce();
  const { rows } = await pool.query(
    `SELECT state,input_tokens::text,family_id,child_id FROM ai_usage WHERE id=ANY($1::uuid[])`,
    [anonymousUsage],
  );
  expect(rows).toEqual([
    { state: 'settled', input_tokens: '300', family_id: null, child_id: null },
  ]);
});
