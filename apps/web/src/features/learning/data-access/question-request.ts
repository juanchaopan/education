import { questionBodyLimit, QuestionRequest, QuestionResult } from '@education/contracts';
import { Value } from '@sinclair/typebox/value';
import { postLearning, type LearningScope } from './learning-request';

export type Question = { stepId: string; text: string };

// Asks the teacher a question about one scene. A question the server would
// refuse never leaves the browser, and the reply is checked against the shared
// schema before the page sees it.
export async function requestTeacherReply(
  scope: LearningScope,
  { stepId, text }: Question,
  cancel?: AbortSignal,
): Promise<QuestionResult> {
  const question = { stepId, text };
  const body = JSON.stringify(question);
  if (
    !Value.Check(QuestionRequest, question) ||
    new TextEncoder().encode(body).length > questionBodyLimit
  )
    return { status: 'fallback', reason: 'invalid-input' };
  return postLearning(scope, 'question', body, QuestionResult, cancel);
}
