import { useEffect, useState } from 'react';
import type { AiHelpFallback, QuestionResult } from '@education/contracts';
import { useReloadReadiness } from '../../../shared/lib/reload-readiness';
import { createAiHelpRequest } from './ai-help-request';
import type { LearningScope } from './learning-request';
import { requestTeacherReply, type Question } from './question-request';

type Ready = Extract<QuestionResult, { status: 'ready' }>;
export type QuestionReplyState =
  | { status: 'idle' | 'pending' | 'guidance' }
  | { status: 'fallback'; reason: AiHelpFallback }
  | Ready;

// The teacher's reply to the question the child sent. A reload waits for a
// reply on its way, which it would otherwise throw away.
export function useQuestionReply(scope: LearningScope) {
  const [state, setState] = useState<QuestionReplyState>({ status: 'idle' });
  const [requests] = useState(() => createAiHelpRequest<Ready>(setState));
  useEffect(() => () => requests.dispose(), [requests]);
  useReloadReadiness(state.status === 'pending' ? 'saving' : 'ready');

  return {
    state,
    ask: (question: Question) =>
      requests.request((signal) => requestTeacherReply(scope, question, signal)),
    guide: requests.guide,
  };
}
