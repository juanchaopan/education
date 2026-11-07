import type { FeedbackStep, ProblemPlugin } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';

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
