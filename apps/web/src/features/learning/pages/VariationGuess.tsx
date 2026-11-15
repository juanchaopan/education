import { AnswerCapsule } from '../components/lesson-stage/AnswerCapsule';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import type { Judgement } from '../data-access/useLessonAnswer';
import type { VariationAnswers } from '../data-access/useLessonVariation';
import { answerWords } from '../interaction/spoken-answer';
import type { Subtitle } from '../interaction/subtitle';
import type { ListeningFilm } from '../interaction/useListening';
import { useMoveOn } from '../interaction/useMoveOn';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import { guessStep, tappedGuessStep } from '../interaction/variation-steps';
import type { LessonVariationAnswer } from '../lessons/lesson-definition';
import type { MicrophoneTurn } from '../voice/microphone-turn';
import { SpokenNumbers } from './SpokenNumbers';

// How long the recorded guess stays in sight before the lesson moves on.
export const guessShownFor = 1500;

const guessLabel = '说出你猜的数';
const unused = () => {};

type Props = {
  scope: LearningScope;
  // The scene the guess is asked in.
  stepId: string;
  guess: VariationAnswers['guess'];
  // The server holds a guess for this round already.
  guessed: boolean;
  settings: LessonVariationAnswer['guess'];
  subtitle: Subtitle;
  onGuessed: () => void;
};

// Whether the guess is recorded, right or wrong; one that could not be
// judged is said again.
const recorded = (judgement: Judgement) =>
  judgement.status === 'judged' && judgement.outcome !== 'uncertain';

// The guess is recorded once; the lesson then moves on by itself, after a
// moment with the guess in sight, or at once when it was recorded before.
function useGuessed({ guess, guessed, onGuessed }: Props) {
  const done = recorded(guess.judgement);
  useMoveOn(done || guessed, onGuessed, done ? guessShownFor : 0);
  return done || guessed;
}

// One number tapped or confirmed is the guess.
const sendGuess =
  (guess: Props['guess']) =>
  ([said]: readonly number[]) => {
    if (said !== undefined) guess.submit(said);
  };

// The variation's guess, said out loud and confirmed in the answer capsule as
// the final answer is, then recorded, right or wrong, with no word of which:
// the capsule shows "记下了 6 根" for a moment and the lesson moves on.
export function SpokenGuess(
  props: Props & Readonly<{ film: ListeningFilm; turn: MicrophoneTurn }>,
) {
  const { guess, settings } = props;
  const done = useGuessed(props);
  const { status } = guess.judgement;
  return (
    <SpokenNumbers
      scope={props.scope}
      stepId={props.stepId}
      label={guessLabel}
      question={settings.question}
      unit={settings.unit}
      choices={settings.choices}
      film={props.film}
      turn={props.turn}
      subtitle={props.subtitle}
      open={!done && (status === 'open' || status === 'judged')}
      step={(voice, awaiting) =>
        guessStep(voice, guess.judgement, { unit: settings.unit, awaiting })
      }
      onSend={sendGuess(guess)}
      onRetry={guess.retry}
    />
  );
}

// The guess tapped, as a parent previewing the lesson gives it: the numbers
// from the start, recorded and moving on as a child's guess does.
export function TappedGuess(props: Props) {
  const { guess, settings, subtitle } = props;
  useGuessed(props);
  const step = tappedGuessStep(guess.judgement);
  useSubtitleWords(subtitle, 'answer', { text: answerWords(step) });
  return (
    <StagePlace at="answer">
      <AnswerCapsule
        label={guessLabel}
        question={settings.question}
        step={step}
        unit={settings.unit}
        choices={settings.choices}
        blocked
        onListen={unused}
        onFinish={unused}
        onStopWaiting={unused}
        onConfirm={unused}
        onChoose={sendGuess(guess)}
        onRetry={guess.retry}
        onContinue={unused}
      />
    </StagePlace>
  );
}
