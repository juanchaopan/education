import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createAnswering } from './answer-application.js';
import { familyFixtures, fixtureOrigin, sessionHeaders } from './family-fixtures.js';
import { createVariation } from './variation-application.js';

const fixtures = familyFixtures();
const { pool } = fixtures;
const app = buildApp({
  origin: fixtureOrigin,
  answering: createAnswering(pool, 'fixture-key', () => ({
    hints: { observe: '仔细观察。' },
    checkCompletion: (input) => (input === 9 ? 'correct' : 'incorrect'),
  })),
  variation: createVariation(pool, 'fixture-key', () => ({
    hints: { 'count-again': '数一数，现在有几组？' },
    checkGuess: (input) =>
      typeof input !== 'number' ? 'uncertain' : input === 6 ? 'correct' : 'incorrect',
    checkReason: (reason) => {
      if (!('say' in reason) || reason.say === '嗯') return 'uncertain';
      return reason.say.includes('还是三组') ? 'correct' : 'incorrect';
    },
  })),
});

afterAll(async () => {
  await app.close();
  await fixtures.close();
});

// A child who can answer the test problem and then do its variation.
async function child() {
  const { family } = await fixtures.household();
  const { id, token } = await fixtures.learner(family, '小鹿');
  const headers = sessionHeaders(token);
  const at = (part: string) => `/api/v1/problems/test-pattern/1/${part}`;
  const post = (part: string, payload: object) =>
    app.inject({ method: 'POST', url: at(part), headers, payload });
  return {
    id,
    family,
    // Answers the problem right in a fresh round and returns that round.
    complete: async () => {
      const { round } = (await app.inject({ url: at('answer'), headers })).json<{
        round: string;
      }>();
      const answer = { round, attemptId: randomUUID(), input: 9, draftRevision: null };
      expect((await post('answer', { action: 'submit', ...answer })).json().outcome).toBe(
        'independent',
      );
      return round;
    },
    state: () => app.inject({ url: at('variation'), headers }),
    guess: (round: string, input: unknown, attemptId = randomUUID()) =>
      post('variation', { action: 'guess', round, attemptId, input }),
    reason: (round: string, say: string, attemptId = randomUUID()) =>
      post('variation', { action: 'reason', round, attemptId, reason: { say } }),
    hint: (round: string) => post('variation', { action: 'hint', round, hintId: 'count-again' }),
    question: (round: string) => post('variation', { action: 'question', round }),
  };
}

async function rows(childId: string) {
  const answers = await pool.query<{ part: string; outcome: string; row: string }>(
    `SELECT part,outcome,row_to_json(v)::text AS row FROM variation_answers v
     WHERE child_id=$1 ORDER BY submitted_at`,
    [childId],
  );
  const help = await pool.query<{ help_id: string }>(
    'SELECT help_id FROM variation_help WHERE child_id=$1 ORDER BY requested_at',
    [childId],
  );
  return { answers: answers.rows, help: help.rows.map(({ help_id }) => help_id) };
}

it('records the guess and the reasons under the completed round, keeping only results', async () => {
  const learner = await child();
  expect((await learner.state()).json()).toEqual({ round: null, guessed: false, explained: false });
  const round = await learner.complete();
  const state = await learner.state();
  expect(state.headers['cache-control']).toBe('no-store');
  expect(state.json()).toEqual({ round, guessed: false, explained: false });

  expect((await learner.guess(round, '六根')).json().outcome).toBe('uncertain');
  const guessId = randomUUID();
  expect((await learner.guess(round, 6, guessId)).json()).toEqual({
    attemptId: guessId,
    outcome: 'independent',
  });
  expect((await learner.guess(round, 6, guessId)).json().outcome).toBe('independent');
  expect((await learner.guess(round, 9, guessId)).statusCode).toBe(409);
  expect((await learner.guess(round, 9)).statusCode).toBe(409);

  expect((await learner.reason(round, '嗯')).json().outcome).toBe('uncertain');
  expect((await learner.reason(round, '变成两组了')).json().outcome).toBe('incorrect');
  expect((await learner.hint(round)).json()).toEqual({ hint: '数一数，现在有几组？' });
  expect((await learner.reason(round, '还是三组，每组两根')).json().outcome).toBe('assisted');
  expect((await learner.reason(round, '还是三组，每组两根')).statusCode).toBe(409);
  expect((await learner.state()).json()).toEqual({ round, guessed: true, explained: true });

  const recorded = await rows(learner.id);
  expect(recorded.answers.map(({ part, outcome }) => [part, outcome])).toEqual([
    ['guess', 'independent'],
    ['reason', 'incorrect'],
    ['reason', 'assisted'],
  ]);
  for (const { row } of recorded.answers) expect(row).not.toMatch(/两组|三组|嗯|六根/);
  expect(recorded.help).toEqual(['count-again']);
});

it('counts help taken before the guess as help, and keeps it apart from the final answer', async () => {
  const learner = await child();
  const round = await learner.complete();
  expect((await learner.question(round)).json()).toEqual({ helped: true });
  expect((await learner.question(round)).statusCode).toBe(200);
  expect((await learner.guess(round, 6)).json().outcome).toBe('assisted');
  expect((await rows(learner.id)).help).toEqual(['teacher:question']);
  const { rows: finalHelp } = await pool.query('SELECT 1 FROM help_events WHERE child_id=$1', [
    learner.id,
  ]);
  expect(finalHelp).toHaveLength(0);
});

it('refuses a variation before a right answer, for an older round, and a reason before the guess', async () => {
  const learner = await child();
  const unknown = randomUUID();
  expect((await learner.guess(unknown, 6)).statusCode).toBe(409);
  expect((await learner.hint(unknown)).statusCode).toBe(409);
  const first = await learner.complete();
  expect((await learner.reason(first, '还是三组')).statusCode).toBe(409);
  const second = await learner.complete();
  expect((await learner.guess(first, 6)).statusCode).toBe(409);
  expect((await learner.guess(second, 6)).statusCode).toBe(200);
  expect((await rows(learner.id)).answers).toHaveLength(1);
});

it('keeps one guess when two different guesses for a round race', async () => {
  const learner = await child();
  const round = await learner.complete();
  const replies = await Promise.all([learner.guess(round, 6), learner.guess(round, 9)]);
  expect(replies.map(({ statusCode }) => statusCode).sort()).toEqual([200, 409]);
  expect((await rows(learner.id)).answers).toHaveLength(1);
});

it('rejects a reason longer than a child sentence and unknown fields', async () => {
  const learner = await child();
  const round = await learner.complete();
  await learner.guess(round, 6);
  expect((await learner.reason(round, '组'.repeat(501))).statusCode).toBe(400);
  const extra = await app.inject({
    method: 'POST',
    url: '/api/v1/problems/test-pattern/1/variation',
    headers: sessionHeaders((await fixtures.learner(learner.family, '小兔')).token),
    payload: { action: 'guess', round, attemptId: randomUUID(), input: 6, transcript: '六' },
  });
  expect(extra.statusCode).toBe(400);
});

it('leaves no variation records once the family is deleted', async () => {
  const learner = await child();
  const round = await learner.complete();
  await learner.hint(round);
  await learner.guess(round, 6);
  await pool.query('DELETE FROM families WHERE id=$1', [learner.family]);
  expect(await rows(learner.id)).toEqual({ answers: [], help: [] });
});
