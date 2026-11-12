import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { createProblemRegistry } from '@education/problems/server';
import { aiConsentPolicies } from './identity/domain/ai-consent-policy.js';
import { csrfToken, tokenHash } from './identity/services/session-security.js';
import { createVoiceTranscription } from './voice-transcription-application.js';

if (!process.env.DATABASE_URL?.endsWith('/education_test'))
  throw new Error('Use isolated education_test');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const families: string[] = [];
const env = { OPENAI_API_KEY: 'synthetic-key', OPENAI_TRANSCRIPTION_ELIGIBLE: 'true' };
const problem = { id: 'share-sweets', version: 1 };
const book = { id: 'fixture-numbers', grade: '一年级', subject: '数学', category: '数与运算' };
const registry = createProblemRegistry(
  [
    {
      summary: { ...problem, title: 'fixture', book: book.id, sequence: 1 },
      feedback: {
        'split-evenly': { prompt: '把十二颗糖平均分给三个人。', vocabulary: ['平均分', '每份'] },
      },
    },
  ],
  [book],
);
const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(96)]);
const request = { stepId: 'split-evenly', format: 'webm', audio: webm.toString('base64') } as const;

afterEach(async () => {
  await pool.query('DELETE FROM ai_usage WHERE family_id=ANY($1::uuid[])', [families]);
});

afterAll(async () => {
  await pool.query('DELETE FROM families WHERE id=ANY($1::uuid[])', [families]);
  await pool.end();
});

async function child(scopes: (keyof typeof aiConsentPolicies)[]) {
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
  for (const scope of scopes)
    await pool.query(
      'INSERT INTO ai_consents(family_id,scope,policy_version,granted) VALUES($1,$2,$3,true)',
      [family, scope, aiConsentPolicies[scope].policyVersion],
    );
  return { family, credentials: { token, csrf: csrfToken(token) } };
}

function transcript(text: string) {
  return new Response(JSON.stringify({ text, usage: { type: 'duration', seconds: 4.98 } }), {
    headers: { 'content-type': 'application/json' },
  });
}

function service(send: typeof fetch) {
  return createVoiceTranscription(pool, env, send, registry.find);
}

async function usage(family: string) {
  const { rows } = await pool.query(
    `SELECT state,model,amount_nanodollars::text AS amount,input_tokens FROM ai_usage
     WHERE family_id=$1`,
    [family],
  );
  return rows;
}

it('needs a valid child session and the transcription consent, not the tutoring one', async () => {
  const tutoringOnly = await child(['openai-tutoring']);
  const send = vi.fn<typeof fetch>();
  const transcribe = service(send);
  await expect(
    transcribe({ token: 'invalid', csrf: 'invalid' }, problem, request),
  ).rejects.toMatchObject({ statusCode: 401 });
  await expect(transcribe(tutoringOnly.credentials, problem, request)).resolves.toEqual({
    status: 'fallback',
    reason: 'unauthorized',
  });
  expect(send).not.toHaveBeenCalled();
  expect(await usage(tutoringOnly.family)).toEqual([]);
});

it('withholds an older consent once the disclosed inputs changed', async () => {
  const owner = await child([]);
  await pool.query(
    'INSERT INTO ai_consents(family_id,scope,policy_version,granted) VALUES($1,$2,$3,true)',
    [owner.family, 'openai-transcription', 20261106],
  );
  const send = vi.fn<typeof fetch>();
  await expect(service(send)(owner.credentials, problem, request)).resolves.toEqual({
    status: 'fallback',
    reason: 'unauthorized',
  });
  expect(send).not.toHaveBeenCalled();
});

it('uploads only the recording and step words, and settles the measured duration', async () => {
  const owner = await child(['openai-transcription']);
  const send = vi.fn<typeof fetch>(async () => transcript('每份是四。'));
  await expect(service(send)(owner.credentials, problem, request)).resolves.toEqual({
    status: 'ready',
    text: '每份是四。',
  });
  const form = send.mock.calls[0]?.[1]?.body as FormData;
  expect(form.get('prompt')).toBe('平均分、每份');
  expect(Buffer.from(await (form.get('file') as File).arrayBuffer())).toEqual(webm);
  const fields = [...form.entries()].map(([, value]) => String(value)).join('\n');
  for (const secret of [owner.family, owner.credentials.token, '小鹿', '把十二颗糖'])
    expect(fields).not.toContain(secret);
  expect(await usage(owner.family)).toEqual([
    { state: 'settled', model: 'gpt-transcribe', amount: '373500', input_tokens: null },
  ]);
  const attempts = await pool.query(
    `SELECT 1 FROM attempts a JOIN children c ON c.id=a.child_id WHERE c.family_id=$1`,
    [owner.family],
  );
  expect(attempts.rowCount).toBe(0);
});

it('reports silence as unheard and still settles what the provider measured', async () => {
  const owner = await child(['openai-transcription']);
  const send = vi.fn<typeof fetch>(async () => transcript(''));
  await expect(service(send)(owner.credentials, problem, request)).resolves.toEqual({
    status: 'unheard',
  });
  expect(await usage(owner.family)).toEqual([
    expect.objectContaining({ state: 'settled', amount: '373500' }),
  ]);
});
