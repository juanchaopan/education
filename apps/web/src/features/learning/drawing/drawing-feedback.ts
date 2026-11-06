import type { TeachingFeedback } from '@education/contracts';
import { feedbackForStep } from '../interaction/lesson-help';

function fitsSheet(region: NonNullable<TeachingFeedback['highlight']>) {
  if (!region) return false;
  const { x, y, width, height } = region;
  if (![x, y, width, height].every(Number.isFinite)) return false;
  return (
    x >= 0 &&
    y >= 0 &&
    x < 1 &&
    y < 1 &&
    width > 0 &&
    height > 0 &&
    x + width <= 1 &&
    y + height <= 1
  );
}

export function drawingFeedback(stepId: string, feedback?: TeachingFeedback) {
  if (!feedback || feedback.stepId !== stepId) return;
  if (
    feedback.status === 'uncertain' ||
    feedback.status === 'recognition-failed' ||
    (feedback.highlight !== undefined && !fitsSheet(feedback.highlight))
  ) {
    return feedbackForStep(stepId);
  }
  return feedback;
}
