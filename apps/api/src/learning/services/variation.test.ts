import { randomUUID } from 'node:crypto';
import type { VariationCommand, VariationReason } from '@education/contracts';
import type { VariationPolicy } from '@education/problems/server';
import { describe, expect, it } from 'vitest';
import { teacherQuestion } from './answer.js';
import { createVariationService } from './variation.js';

type Part = 'guess' | 'reason';
type Row = { round: string; part: Part; fingerprint: string | null; outcome: string };

const problem = { id: 'shape-a', version: 1 };
const credentials = { token: 'token', csrf: 'csrf' };
const policy: VariationPolicy = {
  hints: { 'count-again': '再数一数。' },
  checkGuess: (input) =>
    typeof input !== 'number' ? 'uncertain' : input === 6 ? 'correct' : 'incorrect',
  checkReason: (reason) => {
    if (!('say' in reason)) return 'uncertain';
    if (reason.say === '嗯') return 'uncertain';
    return reason.say === '还是三组' ? 'correct' : 'incorrect';
  },
};

// One child's variation of one problem, held in memory: the round the final
// answer completed, the recorded answers by id and the help taken per round.
function memoryStore(completed: string | null = randomUUID()) {
  let round = completed ?? undefined;
  const answers = new Map<string, Row>();
  const help = new Map<string, Set<string>>();
  const inRound = (at: string) => [...answers.values()].filter((row) => row.round === at);
  const store = {
    completedRound: async () => round,
    previous: async (id: string) => answers.get(id) as never,
    fingerprint: (command: { input: unknown }) => JSON.stringify(command.input),
    recorded: async (at: string) => ({
      guessed: inRound(at).some(({ part }) => part === 'guess'),
      explained: inRound(at).some(
        ({ part, outcome }) => part === 'reason' && outcome !== 'incorrect',
      ),
    }),
    help: async (at: string, id: string) => {
      help.set(at, new Set([...(help.get(at) ?? []), id]));
    },
    usedHelp: async (at: string) => help.has(at),
    record: async ({ attemptId, ...row }: Row & { attemptId: string }) => {
      answers.set(attemptId, row);
    },
  };
  const variation = createVariationService(
    (_credentials, _problem, work) => work(store),
    (id) => (id === problem.id ? policy : undefined),
  );
  return {
    answers,
    help,
    round: () => round!,
    completeAgain: () => {
      round = randomUUID();
    },
    send: (command?: VariationCommand) => variation(credentials, problem, command),
    other: () => variation(credentials, { id: 'shape-b', version: 1 }),
  };
}

const guess = (round: string, input: number | string, attemptId = randomUUID()) =>
  ({ action: 'guess', round, attemptId, input }) as const;
const reason = (round: string, said: VariationReason, attemptId = randomUUID()) =>
  ({ action: 'reason', round, attemptId, reason: said }) as const;
const say = (text: string) => ({ say: text });

describe('variation state', () => {
  it('names no round before the problem has been answered right', async () => {
    const { send } = memoryStore(null);
    expect(await send()).toEqual({ round: null, guessed: false, explained: false });
  });

  it('names the completed round with what is recorded under it', async () => {
    const { send, round } = memoryStore();
    await send(guess(round(), 6));
    expect(await send()).toEqual({ round: round(), guessed: true, explained: false });
    await send(reason(round(), say('还是三组')));
    expect(await send()).toEqual({ round: round(), guessed: true, explained: true });
  });

  it('refuses a problem without a variation', async () => {
    await expect(memoryStore().other()).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('variation guess', () => {
  it('records a right guess as independent and a wrong one as incorrect', async () => {
    const first = memoryStore();
    expect(await first.send(guess(first.round(), 6))).toMatchObject({ outcome: 'independent' });
    const second = memoryStore();
    expect(await second.send(guess(second.round(), 9))).toMatchObject({ outcome: 'incorrect' });
  });

  it('records a right guess after a hint or a question as assisted', async () => {
    for (const help of [
      (round: string) => ({ action: 'hint', round, hintId: 'count-again' }) as const,
      (round: string) => ({ action: 'question', round }) as const,
    ]) {
      const { send, round } = memoryStore();
      await send(help(round()));
      expect(await send(guess(round(), 6))).toMatchObject({ outcome: 'assisted' });
    }
  });

  it('records nothing for a guess it cannot judge, and the child may guess again', async () => {
    const { send, round, answers } = memoryStore();
    expect(await send(guess(round(), '六'))).toMatchObject({ outcome: 'uncertain' });
    expect(answers.size).toBe(0);
    expect(await send(guess(round(), 6))).toMatchObject({ outcome: 'independent' });
  });

  it('keeps the first judged guess and refuses another', async () => {
    const { send, round } = memoryStore();
    await send(guess(round(), 9));
    await expect(send(guess(round(), 6))).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns the same receipt for a retry and refuses the id with another number', async () => {
    const { send, round, answers } = memoryStore();
    const id = randomUUID();
    const receipt = await send(guess(round(), 6, id));
    expect(await send(guess(round(), 6, id))).toEqual(receipt);
    await expect(send(guess(round(), 9, id))).rejects.toMatchObject({ statusCode: 409 });
    expect(answers.size).toBe(1);
  });

  it('refuses a round other than the one the final answer completed last', async () => {
    const { send, round, completeAgain } = memoryStore();
    const old = round();
    completeAgain();
    await expect(send(guess(old, 6))).rejects.toMatchObject({ statusCode: 409 });
    await expect(memoryStore(null).send(guess(old, 6))).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('variation reason', () => {
  it('refuses a reason before the guess', async () => {
    const { send, round } = memoryStore();
    await expect(send(reason(round(), say('还是三组')))).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('records nothing for a reason it cannot judge', async () => {
    const { send, round, answers } = memoryStore();
    await send(guess(round(), 6));
    expect(await send(reason(round(), say('嗯')))).toMatchObject({ outcome: 'uncertain' });
    expect(await send(reason(round(), { choose: { kept: [], changed: [] } }))).toMatchObject({
      outcome: 'uncertain',
    });
    expect(answers.size).toBe(1);
  });

  it('lets the child say it again after a reason that is not clear, assisted after a hint', async () => {
    const { send, round, answers } = memoryStore();
    await send(guess(round(), 6));
    expect(await send(reason(round(), say('变成两组了')))).toMatchObject({ outcome: 'incorrect' });
    await send({ action: 'hint', round: round(), hintId: 'count-again' });
    expect(await send(reason(round(), say('还是三组')))).toMatchObject({ outcome: 'assisted' });
    expect([...answers.values()].map(({ part, outcome }) => [part, outcome])).toEqual([
      ['guess', 'independent'],
      ['reason', 'incorrect'],
      ['reason', 'assisted'],
    ]);
  });

  it('records a clear reason without help as independent and refuses more reasons', async () => {
    const { send, round } = memoryStore();
    await send(guess(round(), 9));
    expect(await send(reason(round(), say('还是三组')))).toMatchObject({ outcome: 'independent' });
    await expect(send(reason(round(), say('还是三组')))).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('replays a reason by its id without keeping the words, and refuses a guess id', async () => {
    const { send, round, answers } = memoryStore();
    const guessId = randomUUID();
    await send(guess(round(), 6, guessId));
    const id = randomUUID();
    const receipt = await send(reason(round(), say('变成两组了'), id));
    expect(await send(reason(round(), say('变成两组了'), id))).toEqual(receipt);
    expect(answers.get(id)).toMatchObject({ fingerprint: null });
    expect(JSON.stringify([...answers.values()])).not.toContain('两组');
    await expect(send(reason(round(), say('还是三组'), guessId))).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('variation help', () => {
  it("records the variation's own hints and questions once per round", async () => {
    const { send, round, help } = memoryStore();
    expect(await send({ action: 'hint', round: round(), hintId: 'count-again' })).toEqual({
      hint: '再数一数。',
    });
    expect(await send({ action: 'question', round: round() })).toEqual({ helped: true });
    expect(await send({ action: 'question', round: round() })).toEqual({ helped: true });
    expect(help.get(round())).toEqual(new Set(['count-again', teacherQuestion]));
  });

  it('refuses a hint the variation does not have, and help for another round', async () => {
    const { send, round, help } = memoryStore();
    await expect(
      send({ action: 'hint', round: round(), hintId: 'one-cabbage' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(send({ action: 'question', round: randomUUID() })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(help.size).toBe(0);
  });
});
