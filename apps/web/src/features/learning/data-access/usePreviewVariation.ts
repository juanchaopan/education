import { useMutation } from '@tanstack/react-query';
import {
  HintReceipt,
  PreviewOutcome,
  type PreviewCommand,
  type VariationReason,
} from '@education/contracts';
import type { TSchema } from '@sinclair/typebox';
import { postLearning, type LearningScope } from './learning-request';
import { useAnswerHints } from './useAnswerHints';
import { judgementOf } from './useLessonAnswer';
import { reasonJudgementOf, type VariationAnswers } from './useLessonVariation';

const preview = <R extends TSchema>(scope: LearningScope, command: PreviewCommand, reply: R) =>
  postLearning(scope, 'preview', JSON.stringify(command), reply);

const nothingKept = { guessed: false, explained: false };

// A parent's variation while previewing a problem: the guess and the reason
// are judged on the server by the problem's own rules and the variation's
// hints come one by one, as a child's do, but nothing is kept, so a retry
// simply sends the same again.
export function usePreviewVariation(
  scope: LearningScope,
  hintIds: readonly string[],
): VariationAnswers {
  const guess = useMutation({
    mutationFn: ({ input }: { input: number }) =>
      preview(scope, { action: 'variation', guess: input }, PreviewOutcome),
  });
  const reason = useMutation({
    mutationFn: ({ said }: { said: VariationReason }) =>
      preview(scope, { action: 'variation', reason: said }, PreviewOutcome),
  });
  const hints = useAnswerHints(
    hintIds,
    (hintId) => preview(scope, { action: 'variation', hintId }, HintReceipt),
    {},
  );
  return {
    ...hints,
    recorded: nothingKept,
    guess: {
      judgement: judgementOf(guess),
      submit(input) {
        if (!guess.isPending) guess.mutate({ input });
      },
      retry() {
        if (guess.variables && !guess.isPending) guess.mutate(guess.variables);
      },
    },
    reason: {
      judgement: reasonJudgementOf(reason),
      submit(said) {
        if (!reason.isPending) reason.mutate({ said });
      },
      retry() {
        if (reason.variables && !reason.isPending) reason.mutate(reason.variables);
      },
    },
  };
}
