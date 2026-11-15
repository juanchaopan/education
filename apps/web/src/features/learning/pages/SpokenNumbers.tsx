import { AnswerCapsule } from '../components/lesson-stage/AnswerCapsule';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import { useVoiceInput } from '../data-access/useVoiceInput';
import type { VoiceState } from '../data-access/voice-input';
import { answerWords, type AnswerStep } from '../interaction/spoken-answer';
import type { Subtitle } from '../interaction/subtitle';
import { useListening, type ListeningFilm } from '../interaction/useListening';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import type { MicrophoneTurn } from '../voice/microphone-turn';

type Props = {
  scope: LearningScope;
  // The step the child speaks in, which speech recognition is told.
  stepId: string;
  // What the child does in the capsule, which names it for screen readers.
  label?: string;
  // What the numbers answer.
  question: string;
  // The unit the numbers are said in, such as 根.
  unit?: string;
  // Every number that fits is sent as a list; otherwise one number.
  every?: boolean;
  // Numbers to tap when speech cannot be used.
  choices: readonly number[];
  film: ListeningFilm;
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  // Whether the child still has numbers to give.
  open: boolean;
  // What the capsule shows next, from the microphone and whether it is
  // about to open by itself.
  step: (voice: VoiceState, awaiting: boolean) => AnswerStep;
  onSend: (said: readonly number[]) => void;
  onRetry: () => void;
  onContinue?: () => void;
};

const unused = () => {};

// Numbers the child says out loud and confirms in the answer capsule, for
// the final answer or for a guess: the microphone opens by itself when the
// scene that asks has been told and whenever the child asks to speak again,
// and the teacher says every step in its subtitle.
export function SpokenNumbers({ scope, stepId, film, turn, subtitle, ...asked }: Props) {
  const voice = useVoiceInput(scope, stepId, 'listen', { turn, audio: film.chime.audio });
  const listening = useListening(voice, film, asked.open);
  const step = asked.step(voice.state, listening.awaiting);
  useSubtitleWords(subtitle, 'answer', { text: answerWords(step) });
  const { state } = voice;
  return (
    <StagePlace at="answer">
      <AnswerCapsule
        label={asked.label}
        question={asked.question}
        step={step}
        unit={asked.unit}
        every={asked.every}
        choices={asked.choices}
        blocked={voice.blocked}
        level={state.status === 'recording' ? state.level : undefined}
        onListen={listening.listenAgain}
        onFinish={voice.release}
        onStopWaiting={voice.guide}
        onConfirm={() => {
          if (step.kind === 'confirm' && voice.confirm() !== undefined) asked.onSend(step.said);
        }}
        onChoose={asked.onSend}
        onRetry={asked.onRetry}
        onContinue={asked.onContinue ?? unused}
      />
    </StagePlace>
  );
}
