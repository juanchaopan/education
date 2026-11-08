import { LessonQuestionPanel } from '../components/LessonQuestionPanel';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonQuestion } from '../data-access/useLessonQuestion';

// The narration a question holds and carries on.
type Narration = { paused: boolean; pause: () => void; resume: () => void };

type Props = {
  scope: LearningScope;
  teacher: string;
  stepId: string;
  guidance: string;
  narration: Narration;
};

// Questions about whichever scene is on screen: asking pauses the narration,
// and the child carries it on once the teacher has answered.
export function SceneQuestions({ scope, teacher, stepId, guidance, narration }: Props) {
  const question = useLessonQuestion(scope, stepId);
  return (
    <LessonQuestionPanel
      teacher={teacher}
      stepId={stepId}
      voice={question.voice}
      reply={question.reply}
      guidance={guidance}
      paused={narration.paused}
      onAsk={() => {
        narration.pause();
        question.start();
      }}
      onStop={question.stop}
      onCancel={question.cancel}
      onStopWaiting={question.guide}
      onResume={narration.resume}
    />
  );
}
