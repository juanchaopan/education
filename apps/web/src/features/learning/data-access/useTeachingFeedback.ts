import { useEffect, useState } from 'react';
import type { AiHelpFallback, TeachingFeedback } from '@education/contracts';
import { exportInk } from '../drawing/export-ink';
import type { Drawing } from '../drawing/ink';
import { createAiHelpRequest } from './ai-help-request';
import { requestTeachingFeedback } from './feedback-request';
import type { LearningScope } from './learning-request';

// `drawing` is the snapshot the feedback was written for, so a later edit hides it.
type Ready = {
  status: 'ready';
  source: 'rules' | 'ai';
  feedback: TeachingFeedback;
  drawing: Drawing;
};
export type FeedbackState =
  | { status: 'idle' | 'pending' | 'guidance' }
  | { status: 'fallback'; reason: AiHelpFallback }
  | Ready;

type Ask = { stepId: string; text?: string; drawing: Drawing };

export function useTeachingFeedback(scope: LearningScope) {
  const [state, setState] = useState<FeedbackState>({ status: 'idle' });
  const [requests] = useState(() => createAiHelpRequest<Ready>(setState));
  useEffect(() => () => requests.dispose(), [requests]);

  return {
    state,
    ask: ({ stepId, text, drawing }: Ask) =>
      requests.request(async (signal) => {
        const image = drawing.length ? await exportInk(drawing) : undefined;
        if (drawing.length && !image) return { status: 'fallback', reason: 'invalid-input' };
        const result = await requestTeachingFeedback(scope, { stepId, text, image }, signal);
        return result.status === 'ready' ? { ...result, drawing } : result;
      }),
    guide: requests.guide,
  };
}
