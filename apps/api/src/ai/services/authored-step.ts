import type { FeedbackStep, ProblemPlugin } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';
import { ruleFeedbackFor, type FeedbackStepScope } from '../domain/teaching-feedback.js';

// A child may only send work for a step the problem's author opened to AI help;
// any other problem version or step is refused before a provider is involved.
export function authoredStep<P extends Pick<ProblemPlugin, 'feedback'>>(
  plugin: P | undefined,
  stepId: string,
): { plugin: P; step: FeedbackStep } {
  const steps = plugin?.feedback;
  const step = steps && Object.hasOwn(steps, stepId) ? steps[stepId] : undefined;
  if (!plugin || !step) throw new RequestError(404, '这一步暂时不能提交。');
  return { plugin, step };
}

// What the author's own rules say about the child's words, when they settle
// it. Rules read text only, so a submission with a drawing is never judged by
// rules that cannot see it, and anything inconclusive is left to the model.
export async function authoredRuling(
  plugin: Pick<ProblemPlugin, 'checkStep'>,
  scope: FeedbackStepScope,
  text?: string,
) {
  if (scope.drawn || text === undefined) return;
  const rule = await plugin.checkStep?.({ stepId: scope.stepId, answer: text });
  return rule && ruleFeedbackFor(rule, scope);
}
