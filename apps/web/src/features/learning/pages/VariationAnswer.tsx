import type { ProblemMode } from '@education/contracts';
import { FireflyHint } from '../components/lesson-stage/FireflyHint';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonVariation, type VariationAnswers } from '../data-access/useLessonVariation';
import { usePreviewVariation } from '../data-access/usePreviewVariation';
import { hintWords } from '../interaction/spoken-answer';
import type { Subtitle } from '../interaction/subtitle';
import type { ListeningFilm } from '../interaction/useListening';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import type { VariationPlay } from '../lessons/lesson-definition';
import type { MicrophoneTurn } from '../voice/microphone-turn';
import { SpokenGuess, TappedGuess } from './VariationGuess';
import { SpokenReason, TappedReason } from './VariationReason';

type Props<Shot extends string> = {
  play: VariationPlay<Shot>;
  // The scene on screen, one of those the child answers the variation in.
  shot: Shot;
  scope: LearningScope;
  film: ListeningFilm;
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  go: (shot: Shot) => void;
};

// The variation's parts in the scenes it is answered in: the guess in its
// guess scene, the reason in its reason scene, and the variation's own
// hints at hand in every one but the guess scene, said by the teacher in its
// subtitle. A guess is a first thought, so it has no hint. A child says the
// guess and the reason; a parent previewing taps them.
function VariationParts<Shot extends string>({
  answers,
  spoken,
  play,
  shot,
  go,
  ...on
}: Props<Shot> & Readonly<{ answers: VariationAnswers; spoken: boolean }>) {
  useSubtitleWords(on.subtitle, 'hint', hintWords(answers));
  const { scenes, answer } = play;
  const guess = {
    scope: on.scope,
    stepId: scenes.guessScene,
    guess: answers.guess,
    guessed: answers.recorded.guessed,
    settings: answer.guess,
    subtitle: on.subtitle,
    onGuessed: () => go(play.afterGuess),
  };
  const reason = {
    scope: on.scope,
    stepId: scenes.reasonScene,
    reason: answers.reason,
    explained: answers.recorded.explained,
    settings: answer.reason,
    choices: scenes.choices,
    subtitle: on.subtitle,
    onExplained: () => go(scenes.revealScene),
  };
  return (
    <>
      {shot === scenes.guessScene &&
        (spoken ? (
          <SpokenGuess {...guess} film={on.film} turn={on.turn} />
        ) : (
          <TappedGuess {...guess} />
        ))}
      {shot === scenes.reasonScene &&
        (spoken ? (
          <SpokenReason {...reason} film={on.film} turn={on.turn} />
        ) : (
          <TappedReason {...reason} />
        ))}
      {shot !== scenes.guessScene && (
        <StagePlace at="hint">
          <FireflyHint left={answers.hintsLeft} ready={answers.canHint} onHint={answers.askHint} />
        </StagePlace>
      )}
    </>
  );
}

function SpokenVariation<Shot extends string>(props: Props<Shot>) {
  const answers = useLessonVariation(props.scope, props.play.answer.hints);
  return <VariationParts {...props} answers={answers} spoken />;
}

function TappedVariation<Shot extends string>(props: Props<Shot>) {
  const answers = usePreviewVariation(props.scope, props.play.answer.hints);
  return <VariationParts {...props} answers={answers} spoken={false} />;
}

// A lesson's variation, once the final answer is right, in whatever flow
// the lesson follows: a child says the guess and the reason, and what they
// come to is recorded; a parent previewing the lesson taps them, judged the
// same way, and nothing is kept. It shows only in the scenes the variation
// is answered in.
export function VariationAnswer<Shot extends string>({
  mode,
  ...props
}: Omit<Props<Shot>, 'play'> & Readonly<{ mode: ProblemMode; play?: VariationPlay<Shot> }>) {
  const { play } = props;
  if (!play?.answering.includes(props.shot)) return null;
  const parts = { ...props, play };
  return mode === 'preview' ? <TappedVariation {...parts} /> : <SpokenVariation {...parts} />;
}
