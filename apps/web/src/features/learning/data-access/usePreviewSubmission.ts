import { useMutation } from '@tanstack/react-query';
import type { PreviewCommand } from '@education/contracts';
import type { TSchema } from '@sinclair/typebox';
import { postLearning, type LearningScope } from './learning-request';

// A command a parent previewing a problem sends, judged by the problem's own
// rules, with the reply it is trusted with.
export const preview = <R extends TSchema>(
  scope: LearningScope,
  command: PreviewCommand,
  reply: R,
) => postLearning(scope, 'preview', JSON.stringify(command), reply);

// Something a parent previewing a problem hands in, one at a time. Nothing
// is kept, so a retry simply sends the same again.
export function usePreviewSubmission<Variables, Reply>(
  send: (variables: Variables) => Promise<Reply>,
  onJudged?: (reply: Reply) => void,
) {
  const submission = useMutation({ mutationFn: send, onSuccess: onJudged });
  return {
    submission,
    submit(variables: Variables) {
      if (!submission.isPending) submission.mutate(variables);
    },
    retry() {
      const last = submission.variables;
      if (last !== undefined && !submission.isPending) submission.mutate(last);
    },
  };
}
