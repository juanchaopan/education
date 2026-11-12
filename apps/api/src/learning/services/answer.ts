import type { AnswerCommand, AttemptReceipt, SubmitAnswer } from '@education/contracts';
import type { AnsweringPolicy } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';
import { authoredHint } from '../domain/hints.js';
import { outcomeOf } from '../domain/outcome.js';

type Credentials = { token?: string; csrf?: string };
type Problem = { id: string; version: number };
type Outcome = AttemptReceipt['outcome'];
type Submission = Omit<SubmitAnswer, 'action' | 'input'>;
type HelpStore = { help: (round: string, helpId: string) => Promise<void> };
type AnswerStore = HelpStore & {
  round: () => Promise<string>;
  previous: (id: string) => Promise<{ fingerprint: string; outcome: Outcome } | undefined>;
  fingerprint: (input: SubmitAnswer) => string;
  usedHelp: (round: string) => Promise<boolean>;
  commit: (input: Submission, fingerprint: string, outcome: Outcome) => Promise<void>;
};
type WithAnswers = <T>(
  credentials: Credentials,
  problem: Problem,
  work: (store: AnswerStore) => Promise<T>,
) => Promise<T>;

// The help id of a question to the teacher while answering. Hint requests
// take only identifiers, which have no colon, so no authored hint can be
// asked for under it; the integration tests hold the two apart.
export const teacherQuestion = 'teacher:question';

// Records one of the authored hints as help taken in the round and returns its
// text; a hint the problem does not have is refused.
export async function giveHint(
  store: HelpStore,
  hints: Readonly<Record<string, string>> | undefined,
  round: string,
  hintId: string,
) {
  const text = authoredHint(hints, hintId);
  if (!text) throw new RequestError(404, '这条提示暂时不可用。');
  await store.help(round, hintId);
  return { hint: text };
}

// Records a question to the teacher as help taken in the round, before the
// question is sent.
export async function noteQuestion(store: HelpStore, round: string) {
  await store.help(round, teacherQuestion);
  return { helped: true as const };
}

// The final answer of one problem and the help taken on the way to it: the
// authored hints and the questions asked of the teacher while answering. Help
// is recorded once per round, and a correct answer after any of it counts as
// helped.
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
      return command.action === 'hint'
        ? giveHint(store, policy.hints, command.round, command.hintId)
        : noteQuestion(store, command.round);
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
  const judgement = policy.checkCompletion(input);
  const helped = judgement === 'correct' && (await store.usedHelp(round));
  const outcome = outcomeOf(judgement, helped);
  await store.commit({ attemptId, round, draftRevision }, fingerprint, outcome);
  return { attemptId, outcome };
}

export type AnswerService = ReturnType<typeof createAnswerService>;
