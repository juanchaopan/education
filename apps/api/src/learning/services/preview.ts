import type { PreviewCommand, PreviewReceipt } from '@education/contracts';
import type { AnsweringPolicy, VariationPolicy } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';
import { authoredHint } from '../domain/hints.js';
import type { Judgement } from '../domain/outcome.js';

type Credentials = { token?: string; csrf?: string };
type Problem = { id: string; version: number };
// The problem's own rules for its final answer and for its variation; either
// is missing for a problem that has none.
type Policies = { answering?: AnsweringPolicy; variation?: VariationPolicy };
// Runs work with the problem's rules once the parent is let in to preview it.
type WithPolicies = <T>(
  credentials: Credentials,
  problem: Problem,
  work: (policies: Policies) => T,
) => Promise<T>;
type VariationCommand = Extract<PreviewCommand, { action: 'variation' }>;

// A judgement with no help counted: a right answer is independent.
const unhelped = (judgement: Judgement): PreviewReceipt => ({
  outcome: judgement === 'correct' ? 'independent' : judgement,
});

function hinted(hints: Readonly<Record<string, string>> | undefined, hintId: string) {
  const hint = authoredHint(hints, hintId);
  if (!hint) throw new RequestError(404, '这条提示暂时不可用。');
  return { hint };
}

function previewVariation(policy: VariationPolicy, command: VariationCommand) {
  if ('guess' in command) return unhelped(policy.checkGuess(command.guess));
  if ('reason' in command) return unhelped(policy.checkReason(command.reason));
  return hinted(policy.hints, command.hintId);
}

// A parent's answers and hints while previewing a problem, its variation
// included, judged by the same rules as a child's. Nothing is kept: there is
// no round, so no help is counted, and a correct answer is independent.
export function createPreviewService(withPolicies: WithPolicies) {
  return (credentials: Credentials, problem: Problem, command: PreviewCommand) =>
    withPolicies(credentials, problem, ({ answering, variation }): PreviewReceipt => {
      if (command.action === 'variation') {
        if (!variation) throw new RequestError(404, '这道题没有变化题。');
        return previewVariation(variation, command);
      }
      if (!answering) throw new RequestError(404, '这道题或这个版本暂时不能提交。');
      if (command.action === 'submit') return unhelped(answering.checkCompletion(command.input));
      return hinted(answering.hints, command.hintId);
    });
}

export type PreviewService = ReturnType<typeof createPreviewService>;
