import { useQuery } from '@tanstack/react-query';
import type { AttemptReceipt } from '@education/contracts';
import { prepareAttempt, readAnswerRound, recordQuestion, requestHint } from './answer-request';
import type { LearningScope } from './learning-request';
import { roundOptions } from './round-query';
import { useAnswerHints, type AnswerEvents } from './useAnswerHints';
import type { QuestionHelp } from './useQuestionHelp';
import { useRoundAttempt } from './useRoundAttempt';

// What the child answers: one number, or, when the answer is every number
// that fits, the list of them.
export type AnswerInput = number | readonly number[];

// Where the final answer stands on the server: not sent yet, being judged,
// judged with the numbers that were sent, or not confirmed because the
// request failed.
export type Judgement =
  | { status: 'open' | 'judging' }
  | { status: 'judged'; outcome: AttemptReceipt['outcome']; said: readonly number[] }
  | { status: 'failed'; message: string };

// An answer sent to be judged, as the mutation that sends it holds it.
type Submission = {
  isPending: boolean;
  error: Error | null;
  data?: { outcome: AttemptReceipt['outcome'] };
  variables?: { input: AnswerInput };
};

// The round of the problem the child is answering, read once while the answer
// and the questions about it are on screen.
const answerRound = { name: 'lesson-answer-round', read: readAnswerRound };

// A question asked while the child gives the final answer is help on the
// answer's round.
export const answerHelp: QuestionHelp = { round: answerRound, record: recordQuestion };

const numbersOf = (input: AnswerInput): readonly number[] =>
  typeof input === 'number' ? [input] : input;

// What is sent for the numbers given: every number that fits, from the
// smallest, or the one number that is the answer.
export function answerInput(said: readonly number[], every: boolean): AnswerInput {
  return every ? [...said].sort((a, b) => a - b) : (said[0] ?? 0);
}

export function judgementOf({ isPending, error, data, variables }: Submission): Judgement {
  if (isPending) return { status: 'judging' };
  if (error) return { status: 'failed', message: error.message };
  if (data && variables)
    return { status: 'judged', outcome: data.outcome, said: numbersOf(variables.input) };
  return { status: 'open' };
}

export const correct = ({ outcome }: { outcome: AttemptReceipt['outcome'] }) =>
  outcome === 'independent' || outcome === 'assisted';

// The final answer of one problem: one number, or a list of them, sent once
// per attempt about the problem's round, and the authored hints in their
// order, each recorded so that a later correct answer counts as helped.
export function useLessonAnswer(
  scope: LearningScope,
  hintIds: readonly string[],
  events: AnswerEvents = {},
) {
  const round = useQuery(roundOptions(answerRound, scope));
  const answer = useRoundAttempt(
    round,
    (id, input: AnswerInput) =>
      prepareAttempt(scope, {
        round: id,
        input: typeof input === 'number' ? input : [...input],
        draftRevision: null,
      }).submit,
    (receipt: AttemptReceipt) => {
      if (correct(receipt)) events.onCorrect?.();
    },
  );
  const id = round.data?.round;
  const hints = useAnswerHints(
    hintIds,
    id === undefined ? undefined : (hintId) => requestHint(scope, id, hintId),
    events,
  );
  return {
    ...hints,
    judgement: judgementOf(answer.submission),
    submit: answer.submit,
    retry: answer.retry,
  };
}
