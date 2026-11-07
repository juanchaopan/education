import { feedbackBodyLimit, FeedbackRequest, TeachingFeedbackResult } from '@education/contracts';
import { Value } from '@sinclair/typebox/value';
import { postLearning, toBase64, type LearningScope } from './learning-request';

export type FeedbackSubmission = { stepId: string; text?: string; image?: Blob };

async function encode({ stepId, text, image }: FeedbackSubmission) {
  const request = {
    stepId,
    ...(text !== undefined && { text }),
    ...(image && { image: await toBase64(image) }),
  };
  const body = JSON.stringify(request);
  if (
    !Value.Check(FeedbackRequest, request) ||
    new TextEncoder().encode(body).length > feedbackBodyLimit
  )
    return;
  return body;
}

// Asks for feedback on what the child just submitted. A submission the server
// would refuse never leaves the browser, and anything the server sends back is
// checked against the shared schema before the page sees it.
export async function requestTeachingFeedback(
  scope: LearningScope,
  submission: FeedbackSubmission,
  cancel?: AbortSignal,
): Promise<TeachingFeedbackResult> {
  const body = await encode(submission);
  if (!body) return { status: 'fallback', reason: 'invalid-input' };
  return postLearning(scope, 'feedback', body, TeachingFeedbackResult, cancel);
}
