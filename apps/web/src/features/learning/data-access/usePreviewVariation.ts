import { HintReceipt, PreviewOutcome, type VariationReason } from '@education/contracts';
import type { LearningScope } from './learning-request';
import { useAnswerHints } from './useAnswerHints';
import { judgementOf } from './useLessonAnswer';
import { nothingRecorded, reasonJudgementOf, type VariationAnswers } from './useLessonVariation';
import { preview, usePreviewSubmission } from './usePreviewSubmission';

// A parent's variation while previewing a problem: the guess and the reason
// are judged on the server by the problem's own rules and the variation's
// hints come one by one, as a child's do, but nothing is kept, so a retry
// simply sends the same again.
export function usePreviewVariation(
  scope: LearningScope,
  hintIds: readonly string[],
): VariationAnswers {
  const guess = usePreviewSubmission(({ input }: { input: number }) =>
    preview(scope, { action: 'variation', guess: input }, PreviewOutcome),
  );
  const reason = usePreviewSubmission((said: VariationReason) =>
    preview(scope, { action: 'variation', reason: said }, PreviewOutcome),
  );
  const hints = useAnswerHints(
    hintIds,
    (hintId) => preview(scope, { action: 'variation', hintId }, HintReceipt),
    {},
  );
  return {
    ...hints,
    recorded: nothingRecorded,
    guess: {
      judgement: judgementOf(guess.submission),
      submit: (input) => guess.submit({ input }),
      retry: guess.retry,
    },
    reason: {
      judgement: reasonJudgementOf(reason.submission),
      submit: reason.submit,
      retry: reason.retry,
    },
  };
}
