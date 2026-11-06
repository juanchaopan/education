import type { TeachingFeedback } from '@education/contracts';
import { describe, expect, it } from 'vitest';
import { drawingFeedback } from './drawing-feedback';

const feedback: TeachingFeedback = {
  stepId: 'compare-leaf-veins',
  status: 'needs-work',
  instruction: '再看看这片叶子的叶脉。',
  highlight: { x: 0.25, y: 0.2, width: 0.5, height: 0.4 },
};

describe('drawing feedback', () => {
  it('keeps valid region and step-only feedback for the active step', () => {
    expect(drawingFeedback(feedback.stepId, feedback)).toEqual(feedback);
    const { highlight: _highlight, ...stepOnly } = feedback;
    expect(drawingFeedback(feedback.stepId, stepOnly)).toEqual(stepOnly);
    expect(drawingFeedback('another-step', feedback)).toBeUndefined();
    expect(drawingFeedback(feedback.stepId)).toBeUndefined();
  });

  it.each([
    { x: -0.1, y: 0, width: 0.2, height: 0.2 },
    { x: 0.9, y: 0, width: 0.2, height: 0.2 },
    { x: 0, y: 0.9, width: 0.2, height: 0.2 },
    { x: 0, y: 0, width: 0, height: 0.2 },
    { x: 0, y: 0, width: -0.2, height: 0.2 },
    { x: NaN, y: 0, width: 0.2, height: 0.2 },
    { x: 0, y: 0, width: Infinity, height: 0.2 },
  ])('asks for confirmation instead of showing an invalid region %o', (highlight) => {
    expect(drawingFeedback(feedback.stepId, { ...feedback, highlight })).toMatchObject({
      status: 'uncertain',
      instruction: expect.stringContaining('确认'),
    });
    expect(drawingFeedback(feedback.stepId, { ...feedback, highlight })?.highlight).toBeUndefined();
  });

  it.each(['uncertain', 'recognition-failed'] as const)('suppresses a %s judgment', (status) => {
    expect(drawingFeedback(feedback.stepId, { ...feedback, status })).toEqual({
      stepId: feedback.stepId,
      status: 'uncertain',
      instruction: expect.stringContaining('确认'),
    });
  });
});
