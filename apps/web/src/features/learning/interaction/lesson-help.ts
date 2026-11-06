import type { TeachingFeedback } from '@education/contracts';

type HelpKind = 'hint' | 'replay' | 'retry';
type HelpEvent = Readonly<{ stepId: string; kind: HelpKind }>;

export function createLessonHelp() {
  const events: HelpEvent[] = [];
  return {
    record: (stepId: string, kind: HelpKind) => {
      events.push({ stepId, kind });
    },
    entries: () => events.map((event) => ({ ...event })),
  };
}

export function feedbackForStep(
  stepId: string,
  feedback?: TeachingFeedback,
): TeachingFeedback | undefined {
  if (feedback) return feedback.stepId === stepId ? feedback : undefined;
  return {
    stepId,
    status: 'uncertain',
    instruction: '我还不能确定你的意思。你可以确认一下，或者换个方法再试。',
  };
}
