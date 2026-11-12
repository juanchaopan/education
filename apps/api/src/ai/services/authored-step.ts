import type { FeedbackStep, ProblemPlugin } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';
import { ruleFeedbackFor, type FeedbackStepScope } from '../domain/teaching-feedback.js';

// The entry a record holds of its own under a name a request gives, so that a
// name such as toString finds nothing.
function own<T>(record: Readonly<Record<string, T>> | undefined, name: string) {
  return record && Object.hasOwn(record, name) ? record[name] : undefined;
}

const refused = () => new RequestError(404, '这一步暂时不能提交。');

// A child may only send work for a step the problem's author opened to AI help;
// any other problem version or step is refused before a provider is involved.
export function authoredStep<P extends Pick<ProblemPlugin, 'feedback'>>(
  plugin: P | undefined,
  stepId: string,
): { plugin: P; step: FeedbackStep } {
  const step = own(plugin?.feedback, stepId);
  if (!plugin || !step) throw refused();
  return { plugin, step };
}

// A step opened to AI help, with the problem's lesson and the scene of it the
// step is, as a question about it needs them; a problem version without
// lesson content, or a step that is no scene of its lesson, is refused like a
// step the author did not open.
export function authoredScene<P extends Pick<ProblemPlugin, 'feedback' | 'lesson'>>(
  candidate: P | undefined,
  stepId: string,
) {
  const { plugin, step } = authoredStep(candidate, stepId);
  const { lesson } = plugin;
  const scene = own(lesson?.scenes, stepId);
  if (!lesson || !scene) throw refused();
  return { plugin, step, lesson, scene };
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
