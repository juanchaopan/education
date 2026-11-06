import { regionFits, type TeachingFeedback } from '@education/contracts';
import { feedbackForStep } from '../interaction/lesson-help';

export function drawingFeedback(stepId: string, feedback?: TeachingFeedback) {
  if (!feedback || feedback.stepId !== stepId) return;
  if (
    feedback.status === 'uncertain' ||
    feedback.status === 'recognition-failed' ||
    (feedback.highlight !== undefined && !regionFits(feedback.highlight))
  ) {
    return feedbackForStep(stepId);
  }
  return feedback;
}
