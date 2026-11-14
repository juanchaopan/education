import { useMutation } from '@tanstack/react-query';
import { HintReceipt, PreviewOutcome, type PreviewCommand } from '@education/contracts';
import type { TSchema } from '@sinclair/typebox';
import { postLearning, type LearningScope } from './learning-request';
import { useAnswerHints, type AnswerEvents } from './useAnswerHints';
import { correct, judgementOf } from './useLessonAnswer';

const preview = <R extends TSchema>(scope: LearningScope, command: PreviewCommand, reply: R) =>
  postLearning(scope, 'preview', JSON.stringify(command), reply);

// A parent's answer while previewing a problem: the count is judged on the
// server by the problem's own rules and the authored hints come one by one,
// as a child's do, but nothing is kept, so a retry simply sends the count
// again.
export function usePreviewAnswer(
  scope: LearningScope,
  hintIds: readonly string[],
  events: AnswerEvents = {},
) {
  const submit = useMutation({
    mutationFn: ({ count }: { count: number }) =>
      preview(scope, { action: 'submit', input: count }, PreviewOutcome),
    onSuccess: (receipt) => {
      if (correct(receipt)) events.onCorrect?.();
    },
  });
  const hints = useAnswerHints(
    hintIds,
    (hintId) => preview(scope, { action: 'hint', hintId }, HintReceipt),
    events,
  );
  return {
    ...hints,
    judgement: judgementOf(submit),
    submit(count: number) {
      if (!submit.isPending) submit.mutate({ count });
    },
    retry() {
      const last = submit.variables;
      if (last && !submit.isPending) submit.mutate(last);
    },
  };
}
