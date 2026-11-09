import { LessonQuestionPanel } from '../components/LessonQuestionPanel';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonQuestion } from '../data-access/useLessonQuestion';
import type { MicrophoneTurn } from '../voice/microphone-turn';

// The narration a question holds and carries on.
type Narration = { paused: boolean; pause: () => void; resume: () => void };

type Props = {
  scope: LearningScope;
  teacher: string;
  stepId: string;
  // The step of the final answer, where a question counts as help.
  answerStep: string;
  guidance: string;
  narration: Narration;
  turn: MicrophoneTurn;
};

// Questions about whichever scene is on screen: holding the button to ask
// pauses the narration, and the child carries it on once the teacher has
// answered.
export function SceneQuestions({
  scope,
  teacher,
  stepId,
  answerStep,
  guidance,
  narration,
  turn,
}: Props) {
  const question = useLessonQuestion(scope, stepId, { answerStep, turn });
  return (
    <LessonQuestionPanel
      teacher={teacher}
      voice={question.voice}
      reply={question.reply}
      guidance={guidance}
      paused={narration.paused}
      blocked={question.blocked}
      sending={question.sending}
      sendFailed={question.sendFailed}
      onPress={() => {
        if (question.press()) narration.pause();
      }}
      onRelease={question.release}
      onEdit={question.edit}
      onSend={() => void question.send()}
      onDrop={question.drop}
      onStopWaiting={question.guide}
      onResume={narration.resume}
    />
  );
}
