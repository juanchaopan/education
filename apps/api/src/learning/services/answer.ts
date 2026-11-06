import type { AnswerCommand, AttemptReceipt, SubmitAnswer } from '@education/contracts';
import type { AnsweringPolicy } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';

type Credentials = { token?: string; csrf?: string };
type Problem = { id: string; version: number };
type Outcome = AttemptReceipt['outcome'];
type Submission = Omit<SubmitAnswer, 'action' | 'input'>;
type AnswerStore = {
  round: () => Promise<string>;
  previous: (id: string) => Promise<{ fingerprint: string; outcome: Outcome } | undefined>;
  fingerprint: (input: SubmitAnswer) => string;
  hint: (round: string, hintId: string) => Promise<void>;
  usedHint: (round: string) => Promise<boolean>;
  commit: (input: Submission, fingerprint: string, outcome: Outcome) => Promise<void>;
};
type WithAnswers = <T>(
  credentials: Credentials,
  problem: Problem,
  work: (store: AnswerStore) => Promise<T>,
) => Promise<T>;

export function createAnswerService(
  withAnswers: WithAnswers,
  find: (id: string, version: number) => AnsweringPolicy | undefined,
) {
  return (credentials: Credentials, problem: Problem, command?: AnswerCommand) =>
    withAnswers(credentials, problem, async (store) => {
      const policy = find(problem.id, problem.version);
      if (!policy) throw new RequestError(404, '这道题或这个版本暂时不能提交。');
      if (!command) return { round: await store.round() };
      if (command.action === 'submit') return submit(store, policy, command);
      await requireRound(store, command.round);
      const hint =
        policy.hints && Object.hasOwn(policy.hints, command.hintId) && policy.hints[command.hintId];
      if (!hint || hint.length > 2000) throw new RequestError(404, '这条提示暂时不可用。');
      await store.hint(command.round, command.hintId);
      return { hint };
    });
}

async function requireRound(store: AnswerStore, expected: string) {
  if ((await store.round()) !== expected)
    throw new RequestError(409, '这一轮练习已完成，请重新打开题目。');
}

async function submit(store: AnswerStore, policy: AnsweringPolicy, command: SubmitAnswer) {
  const { attemptId, round, input, draftRevision } = command;
  const fingerprint = store.fingerprint(command);
  const previous = await store.previous(attemptId);
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new RequestError(409, '这次提交的内容已变化，请重新提交。');
    return { attemptId, outcome: previous.outcome };
  }
  await requireRound(store, round);
  const checked = policy.checkCompletion(input);
  const outcome = await classify(store, round, checked);
  await store.commit({ attemptId, round, draftRevision }, fingerprint, outcome);
  return { attemptId, outcome };
}

async function classify(
  store: AnswerStore,
  round: string,
  checked: ReturnType<AnsweringPolicy['checkCompletion']>,
): Promise<Outcome> {
  if (checked === 'correct') return (await store.usedHint(round)) ? 'assisted' : 'independent';
  return checked === 'incorrect' ? 'incorrect' : 'uncertain';
}

export type AnswerService = ReturnType<typeof createAnswerService>;
