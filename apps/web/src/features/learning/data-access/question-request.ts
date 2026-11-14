import { QuestionRequest, QuestionResult } from '@education/contracts';
import { Value } from '@sinclair/typebox/value';
import { postLearning, type LearningScope } from './learning-request';

// Asks the teacher a question about one scene, with the page's record of the
// lesson so far. A question the server would refuse never leaves the
// browser; any question the schema allows fits the server's body limit. The
// reply is checked against the shared schema before the page sees it.
export async function requestTeacherReply(
  scope: LearningScope,
  { stepId, text, record }: QuestionRequest,
  cancel?: AbortSignal,
): Promise<QuestionResult> {
  const question = { stepId, text, record };
  if (!Value.Check(QuestionRequest, question))
    return { status: 'fallback', reason: 'invalid-input' };
  return postLearning(scope, 'question', JSON.stringify(question), QuestionResult, cancel);
}
