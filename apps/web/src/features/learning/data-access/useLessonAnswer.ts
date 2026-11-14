import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import type { AttemptReceipt } from '@education/contracts';
import {
  AnswerConflictError,
  prepareAttempt,
  readAnswerRound,
  requestHint,
} from './answer-request';
import type { LearningScope } from './learning-request';
import { useAnswerHints, type AnswerEvents } from './useAnswerHints';

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

// One answer on its way to the server. `sent` tells an attempt that reached
// the network, which a retry repeats as it is, from one that never had a round.
type Attempt = { input: AnswerInput; sent: boolean; submit: () => Promise<AttemptReceipt> };

// An answer sent to be judged, as the mutation that sends it holds it.
type Submission = {
  isPending: boolean;
  error: Error | null;
  data?: { outcome: AttemptReceipt['outcome'] };
  variables?: { input: AnswerInput };
};

const offline = '暂时连不上，请重试。';

// The round of the problem the child is answering, read once while the answer
// and the questions about it are on screen.
export function answerRound(scope: LearningScope, enabled = true) {
  return queryOptions({
    queryKey: ['lesson-answer-round', scope],
    queryFn: ({ signal }) => readAnswerRound(scope, signal),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    enabled,
  });
}

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
// per attempt, so retrying after a lost reply never counts twice, and the
// authored hints in their order, each recorded so that a later correct
// answer counts as helped. An answer given before the round is known
// is not lost: it fails visibly and is sent again once the round arrives. A
// round that changed elsewhere starts over with a fresh round instead of
// repeating a refused attempt.
export function useLessonAnswer(
  scope: LearningScope,
  hintIds: readonly string[],
  events: AnswerEvents = {},
) {
  const round = useQuery(answerRound(scope));
  const submit = useMutation({
    mutationFn: (attempt: Attempt) => attempt.submit(),
    onSuccess: (receipt) => {
      if (correct(receipt)) events.onCorrect?.();
    },
  });
  const id = round.data?.round;
  const hints = useAnswerHints(
    hintIds,
    id === undefined ? undefined : (hintId) => requestHint(scope, id, hintId),
    events,
  );

  function attemptFor(input: AnswerInput): Attempt {
    if (!round.data)
      return {
        input,
        sent: false,
        submit: async () => {
          void round.refetch();
          throw new Error(offline);
        },
      };
    const answer = {
      round: round.data.round,
      input: typeof input === 'number' ? input : [...input],
      draftRevision: null,
    };
    return { ...prepareAttempt(scope, answer), input, sent: true };
  }

  return {
    ...hints,
    judgement: judgementOf(submit),
    submit(input: AnswerInput) {
      if (!submit.isPending) submit.mutate(attemptFor(input));
    },
    retry() {
      const last = submit.variables;
      if (!last || submit.isPending) return;
      if (submit.error instanceof AnswerConflictError) {
        submit.reset();
        void round.refetch();
      } else submit.mutate(last.sent ? last : attemptFor(last.input));
    },
  };
}
