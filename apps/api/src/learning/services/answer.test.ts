import { randomUUID } from 'node:crypto';
import type { AnswerCommand, AttemptReceipt } from '@education/contracts';
import { describe, expect, it } from 'vitest';
import { createAnswerService, teacherQuestion } from './answer.js';

type Outcome = AttemptReceipt['outcome'];

const problem = { id: 'shape-a', version: 1 };
const credentials = { token: 'token', csrf: 'csrf' };
const policy = {
  checkCompletion: (input: unknown) =>
    input === 9 ? ('correct' as const) : ('incorrect' as const),
};

// One child's answers to one problem, held in memory: the open round, the help
// taken in each round and the committed attempts. Committing a correct answer
// opens the next round, as the database does.
function memoryStore() {
  let round = randomUUID();
  const help = new Map<string, Set<string>>();
  const attempts = new Map<string, { fingerprint: string; outcome: Outcome }>();
  const store = {
    round: async () => round,
    previous: async (id: string) => attempts.get(id),
    fingerprint: (command: { input: unknown }) => JSON.stringify(command.input),
    help: async (at: string, helpId: string) => {
      help.set(at, new Set([...(help.get(at) ?? []), helpId]));
    },
    usedHelp: async (at: string) => help.has(at),
    commit: async ({ attemptId }: { attemptId: string }, fingerprint: string, outcome: Outcome) => {
      attempts.set(attemptId, { fingerprint, outcome });
      if (outcome === 'independent' || outcome === 'assisted') round = randomUUID();
    },
  };
  const answer = createAnswerService(
    (_credentials, _problem, work) => work(store),
    () => policy,
  );
  return { help, answer: (command?: AnswerCommand) => answer(credentials, problem, command) };
}

const submit = (round: string, input: number): AnswerCommand => ({
  action: 'submit',
  round,
  attemptId: randomUUID(),
  input,
  draftRevision: null,
});

async function openRound(answer: ReturnType<typeof memoryStore>['answer']) {
  return ((await answer()) as { round: string }).round;
}

describe('answer service', () => {
  it('counts a correct answer after a question to the teacher as helped, once per round', async () => {
    const { help, answer } = memoryStore();
    const round = await openRound(answer);
    expect(await answer({ action: 'question', round })).toEqual({ helped: true });
    expect(await answer({ action: 'question', round })).toEqual({ helped: true });
    expect(help).toEqual(new Map([[round, new Set([teacherQuestion])]]));
    expect(await answer(submit(round, 9))).toMatchObject({ outcome: 'assisted' });
    const next = await openRound(answer);
    expect(await answer(submit(next, 9))).toMatchObject({ outcome: 'independent' });
  });

  it('refuses a question for a round that is already over', async () => {
    const { help, answer } = memoryStore();
    const round = await openRound(answer);
    await answer(submit(round, 9));
    await expect(answer({ action: 'question', round })).rejects.toMatchObject({ statusCode: 409 });
    expect(help.size).toBe(0);
  });
});
