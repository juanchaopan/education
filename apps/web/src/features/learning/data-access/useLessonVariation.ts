import { useQuery } from '@tanstack/react-query';
import type { AnswerOutcome, VariationReason, VariationState } from '@education/contracts';
import type { LearningScope } from './learning-request';
import { roundOptions, type RoundSource } from './round-query';
import { useAnswerHints } from './useAnswerHints';
import { judgementOf, type Judgement } from './useLessonAnswer';
import type { QuestionHelp } from './useQuestionHelp';
import { useRoundAttempt } from './useRoundAttempt';
import {
  prepareVariationAnswer,
  readVariationState,
  recordVariationQuestion,
  requestVariationHint,
} from './variation-request';

// Where the reason stands on the server: not sent yet, being judged, judged,
// or not confirmed because the request failed.
export type ReasonJudgement =
  | { status: 'open' | 'judging' }
  | { status: 'judged'; outcome: AnswerOutcome }
  | { status: 'failed'; message: string };

type ReasonSubmission = {
  isPending: boolean;
  error: Error | null;
  data?: { outcome: AnswerOutcome };
};

export function reasonJudgementOf({ isPending, error, data }: ReasonSubmission): ReasonJudgement {
  if (isPending) return { status: 'judging' };
  if (error) return { status: 'failed', message: error.message };
  return data ? { status: 'judged', outcome: data.outcome } : { status: 'open' };
}

type Recorded = Readonly<{ guessed: boolean; explained: boolean }>;

// What the server holds of a variation before anything is sent, and all a
// preview ever holds.
export const nothingRecorded: Recorded = { guessed: false, explained: false };

// What the variation's part of the page works with, whether a child does it
// or a parent previews it: the variation's own hints, what the server holds
// already for this round, and the guess and the reason, each with how it
// was judged, a way to send it and a way to send it again after a failure.
export type VariationAnswers = Readonly<{
  hint?: string;
  hintWaiting: boolean;
  hintFailed: boolean;
  hintsLeft: number;
  canHint: boolean;
  askHint: () => void;
  recorded: Recorded;
  guess: Readonly<{ judgement: Judgement; submit: (input: number) => void; retry: () => void }>;
  reason: Readonly<{
    judgement: ReasonJudgement;
    submit: (reason: VariationReason) => void;
    retry: () => void;
  }>;
}>;

// The variation of the round the child last answered right, read once while
// the variation and the questions in it are on screen.
const variationRound: RoundSource<VariationState> = {
  name: 'lesson-variation-round',
  read: readVariationState,
};

// A question asked during the variation is help on the variation's round.
export const variationHelp: QuestionHelp = {
  round: variationRound,
  record: recordVariationQuestion,
};

// A child's variation: the guessed number and the reason, each sent once per
// attempt under the round of the answer judged right, and the variation's
// own hints in their order, each recorded so that a later right guess or
// clear reason counts as helped.
export function useLessonVariation(
  scope: LearningScope,
  hintIds: readonly string[],
): VariationAnswers {
  const round = useQuery(roundOptions(variationRound, scope));
  const guess = useRoundAttempt(round, (id, input: number) =>
    prepareVariationAnswer(scope, { action: 'guess', round: id, input }),
  );
  const reason = useRoundAttempt(round, (id, said: VariationReason) =>
    prepareVariationAnswer(scope, { action: 'reason', round: id, reason: said }),
  );
  const id = round.data?.round ?? undefined;
  const hints = useAnswerHints(
    hintIds,
    id === undefined ? undefined : (hintId) => requestVariationHint(scope, id, hintId),
    {},
  );
  return {
    ...hints,
    recorded: round.data ?? nothingRecorded,
    guess: { judgement: judgementOf(guess.submission), submit: guess.submit, retry: guess.retry },
    reason: {
      judgement: reasonJudgementOf(reason.submission),
      submit: reason.submit,
      retry: reason.retry,
    },
  };
}
