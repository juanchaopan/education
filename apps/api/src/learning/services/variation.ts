import type {
  SubmitGuess,
  SubmitReason,
  VariationCommand,
  VariationReceipt,
  VariationState,
} from '@education/contracts';
import type { Judgement, VariationPolicy } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';
import { judgedOutcome, type JudgedOutcome } from '../domain/outcome.js';
import { giveHint, noteQuestion } from './answer.js';

type Credentials = { token?: string; csrf?: string };
type Problem = { id: string; version: number };
type Part = 'guess' | 'reason';
type Answer = {
  attemptId: string;
  round: string;
  part: Part;
  fingerprint: string | null;
};
type VariationStore = {
  completedRound: () => Promise<string | undefined>;
  previous: (
    attemptId: string,
  ) => Promise<{ part: Part; fingerprint: string | null; outcome: JudgedOutcome } | undefined>;
  fingerprint: (command: SubmitGuess) => string;
  recorded: (round: string) => Promise<{ guessed: boolean; explained: boolean }>;
  help: (round: string, helpId: string) => Promise<void>;
  usedHelp: (round: string) => Promise<boolean>;
  record: (answer: Answer & { outcome: JudgedOutcome }) => Promise<void>;
};
type WithVariation = <T>(
  credentials: Credentials,
  problem: Problem,
  work: (store: VariationStore) => Promise<T>,
) => Promise<T>;

// The variation that follows a right final answer, recorded under that
// answer's round: first a guessed number, then a reason, said or tapped, and
// the variation's own help on the way. Only judged answers are recorded; one
// that cannot be judged is returned as uncertain so the child says it again.
// The guess is kept once; reasons are judged until one is clear. A right
// guess or a clear reason after any of the round's variation help counts as
// helped.
export function createVariationService(
  withVariation: WithVariation,
  find: (id: string, version: number) => VariationPolicy | undefined,
) {
  return (credentials: Credentials, problem: Problem, command?: VariationCommand) =>
    withVariation(credentials, problem, async (store) => {
      const policy = find(problem.id, problem.version);
      if (!policy) throw new RequestError(404, '这道题没有变化题。');
      if (!command) return state(store);
      switch (command.action) {
        case 'guess':
          return guess(store, policy, command);
        case 'reason':
          return reason(store, policy, command);
        case 'hint':
          await requireRound(store, command.round);
          return giveHint(store, policy.hints, command.round, command.hintId);
        case 'question':
          await requireRound(store, command.round);
          return noteQuestion(store, command.round);
      }
    });
}

async function state(store: VariationStore): Promise<VariationState> {
  const round = await store.completedRound();
  if (!round) return { round: null, guessed: false, explained: false };
  return { round, ...(await store.recorded(round)) };
}

async function requireRound(store: VariationStore, expected: string) {
  if ((await store.completedRound()) !== expected)
    throw new RequestError(409, '这一轮的变化题已结束，请重新打开题目。');
}

// The receipt of an answer already recorded under the same id. The id of a
// guess cannot be reused for a reason or for a different guess.
async function replay(store: VariationStore, answer: Answer) {
  const previous = await store.previous(answer.attemptId);
  if (!previous) return undefined;
  if (previous.part !== answer.part || previous.fingerprint !== answer.fingerprint)
    throw new RequestError(409, '这次提交的内容已变化，请重新提交。');
  return { attemptId: answer.attemptId, outcome: previous.outcome };
}

async function judge(
  store: VariationStore,
  answer: Answer,
  judgement: Judgement,
): Promise<VariationReceipt> {
  if (judgement === 'uncertain') return { attemptId: answer.attemptId, outcome: 'uncertain' };
  const helped = judgement === 'correct' && (await store.usedHelp(answer.round));
  const outcome = judgedOutcome(judgement, helped);
  await store.record({ ...answer, outcome });
  return { attemptId: answer.attemptId, outcome };
}

async function guess(store: VariationStore, policy: VariationPolicy, command: SubmitGuess) {
  const { attemptId, round } = command;
  const fingerprint = store.fingerprint(command);
  const answer = { attemptId, round, part: 'guess' as const, fingerprint };
  const replayed = await replay(store, answer);
  if (replayed) return replayed;
  await requireRound(store, round);
  if ((await store.recorded(round)).guessed) throw new RequestError(409, '猜的数已经记下了。');
  return judge(store, answer, policy.checkGuess(command.input));
}

async function reason(store: VariationStore, policy: VariationPolicy, command: SubmitReason) {
  const { attemptId, round } = command;
  const answer = { attemptId, round, part: 'reason' as const, fingerprint: null };
  const replayed = await replay(store, answer);
  if (replayed) return replayed;
  await requireRound(store, round);
  const { guessed, explained } = await store.recorded(round);
  if (!guessed) throw new RequestError(409, '先猜一个数，再说理由。');
  if (explained) throw new RequestError(409, '理由已经记下了。');
  return judge(store, answer, policy.checkReason(command.reason));
}

export type VariationService = ReturnType<typeof createVariationService>;
