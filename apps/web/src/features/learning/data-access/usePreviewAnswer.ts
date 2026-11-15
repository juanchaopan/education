import { HintReceipt, PreviewOutcome } from '@education/contracts';
import type { LearningScope } from './learning-request';
import { useAnswerHints, type AnswerEvents } from './useAnswerHints';
import { correct, judgementOf, type AnswerInput } from './useLessonAnswer';
import { preview, usePreviewSubmission } from './usePreviewSubmission';

// A parent's answer while previewing a problem: the answer is judged on the
// server by the problem's own rules and the authored hints come one by one,
// as a child's do, but nothing is kept, so a retry simply sends the answer
// again.
export function usePreviewAnswer(
  scope: LearningScope,
  hintIds: readonly string[],
  events: AnswerEvents = {},
) {
  const answer = usePreviewSubmission(
    ({ input }: { input: AnswerInput }) =>
      preview(
        scope,
        { action: 'submit', input: typeof input === 'number' ? input : [...input] },
        PreviewOutcome,
      ),
    (receipt) => {
      if (correct(receipt)) events.onCorrect?.();
    },
  );
  const hints = useAnswerHints(
    hintIds,
    (hintId) => preview(scope, { action: 'hint', hintId }, HintReceipt),
    events,
  );
  return {
    ...hints,
    judgement: judgementOf(answer.submission),
    submit: (input: AnswerInput) => answer.submit({ input }),
    retry: answer.retry,
  };
}
