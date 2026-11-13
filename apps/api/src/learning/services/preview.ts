import type { PreviewCommand, PreviewReceipt } from '@education/contracts';
import type { AnsweringPolicy } from '@education/problems/server';
import { RequestError } from '../../shared/request-error.js';
import { authoredHint } from '../domain/hints.js';
import type { Judgement } from '../domain/outcome.js';

type Credentials = { token?: string; csrf?: string };
type Problem = { id: string; version: number };
// Runs work with the problem's answering policy once the parent is let in to
// preview the problem; the policy is missing for a problem with no answer.
type WithPolicy = <T>(
  credentials: Credentials,
  problem: Problem,
  work: (policy: AnsweringPolicy | undefined) => T,
) => Promise<T>;

// A judgement with no help counted: a right answer is independent.
const unhelped = (judgement: Judgement) =>
  judgement === 'correct' ? ('independent' as const) : judgement;

// A parent's answers and hints while previewing a problem, judged by the
// same rules as a child's. Nothing is kept: there is no round, so no help is
// counted, and a correct answer is independent.
export function createPreviewService(withPolicy: WithPolicy) {
  return (credentials: Credentials, problem: Problem, command: PreviewCommand) =>
    withPolicy(credentials, problem, (policy): PreviewReceipt => {
      if (!policy) throw new RequestError(404, '这道题或这个版本暂时不能提交。');
      if (command.action === 'submit')
        return { outcome: unhelped(policy.checkCompletion(command.input)) };
      const hint = authoredHint(policy.hints, command.hintId);
      if (!hint) throw new RequestError(404, '这条提示暂时不可用。');
      return { hint };
    });
}

export type PreviewService = ReturnType<typeof createPreviewService>;
