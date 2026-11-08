import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AttemptReceipt } from '@education/contracts';
import { prepareAttempt, readAnswerRound, requestHint } from './answer-request';
import type { LearningScope } from './learning-request';

// Where the final answer stands on the server: not sent yet, being judged,
// judged with the count that was sent, or not confirmed because the request failed.
export type Judgement =
  | { status: 'open' | 'judging' }
  | { status: 'judged'; outcome: AttemptReceipt['outcome']; count: number }
  | { status: 'failed'; message: string };

type Attempt = ReturnType<typeof prepareAttempt> & { count: number };
type Submission = {
  isPending: boolean;
  error: Error | null;
  data?: AttemptReceipt;
  variables?: Attempt;
};

function judgementOf({ isPending, error, data, variables }: Submission): Judgement {
  if (isPending) return { status: 'judging' };
  if (error) return { status: 'failed', message: error.message };
  if (data && variables) return { status: 'judged', outcome: data.outcome, count: variables.count };
  return { status: 'open' };
}

// The final answer of one problem: a counted number sent once per attempt, so
// retrying after a lost reply never counts twice, and the authored hints in
// their order, each recorded so that a later correct answer counts as helped.
export function useLessonAnswer(scope: LearningScope, hintIds: readonly string[]) {
  const round = useQuery({
    queryKey: ['lesson-answer-round', scope],
    queryFn: ({ signal }) => readAnswerRound(scope, signal),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
  const submit = useMutation({ mutationFn: (attempt: Attempt) => attempt.submit() });
  const [hints, setHints] = useState<readonly string[]>([]);
  const hint = useMutation({
    mutationFn: ({ round: id, hintId }: { round: string; hintId: string }) =>
      requestHint(scope, id, hintId),
    onSuccess: ({ hint: text }) => setHints((shown) => [...shown, text]),
  });
  const next = hintIds[hints.length];

  return {
    judgement: judgementOf(submit),
    submit(count: number) {
      if (!round.data || submit.isPending) return;
      const answer = { round: round.data.round, input: count, draftRevision: null };
      submit.mutate({ ...prepareAttempt(scope, answer), count });
    },
    retry() {
      if (submit.variables && !submit.isPending) submit.mutate(submit.variables);
    },
    hint: hints.at(-1),
    hintFailed: hint.isError,
    canHint: round.isSuccess && !hint.isPending && next !== undefined,
    askHint() {
      if (next && round.data && !hint.isPending)
        hint.mutate({ round: round.data.round, hintId: next });
    },
  };
}
