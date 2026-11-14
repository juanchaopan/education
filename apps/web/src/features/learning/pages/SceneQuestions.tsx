import type { LessonRecord } from '@education/contracts';
import { AskMicrophone } from '../components/lesson-stage/AskMicrophone';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import { QuestionBox } from '../components/lesson-stage/QuestionBox';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonQuestion } from '../data-access/useLessonQuestion';
import { questionPhase, questionWords } from '../interaction/question-words';
import type { Subtitle } from '../interaction/subtitle';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import { usesMicrophone, type MicrophoneTurn } from '../voice/microphone-turn';

type Props = {
  scope: LearningScope;
  teacher: string;
  stepId: string;
  // The step of the final answer, where a question counts as help.
  answerStep: string;
  guidance: string;
  // The lesson so far as the page has seen it, which a question carries.
  record: () => LessonRecord;
  // The narration a question holds, until the child carries it on.
  narration: { pause: () => void };
  turn: MicrophoneTurn;
  // The lesson's audio context, which the child's voice is measured on.
  audio: () => AudioContext | undefined;
  subtitle: Subtitle;
};

// Questions about whichever scene is on screen: holding the microphone to ask
// pauses the narration, the question box beside it shows the voice and then
// the words to read over and send, and the teacher's reply is the teacher's
// subtitle. The child carries the narration on from the subtitle.
export function SceneQuestions({
  scope,
  teacher,
  stepId,
  answerStep,
  guidance,
  record,
  narration,
  turn,
  audio,
  subtitle,
}: Props) {
  const question = useLessonQuestion(scope, stepId, record, { answerStep, turn, audio });
  const { voice } = question;
  const phase = questionPhase(question);
  useSubtitleWords(subtitle, 'question', questionWords(question, guidance));
  const waiting = voice.status === 'transcribing' || question.reply.status === 'pending';
  return (
    <>
      {phase && (
        <StagePlace at="question">
          <QuestionBox
            phase={phase}
            text={voice.status === 'review' ? voice.text : (question.asked ?? '')}
            teacher={teacher}
            level={voice.status === 'recording' ? voice.level : undefined}
            sending={question.sending}
            sendFailed={question.sendFailed}
            onEdit={question.edit}
            onSend={() => void question.send()}
            onClose={phase === 'review' ? question.drop : question.guide}
          />
        </StagePlace>
      )}
      <StagePlace at="microphone">
        <AskMicrophone
          label={`按住问${teacher}`}
          holding={usesMicrophone(voice.status)}
          disabled={question.blocked || waiting || question.sending}
          onPress={() => {
            if (question.press()) narration.pause();
          }}
          onRelease={question.release}
        />
      </StagePlace>
    </>
  );
}
