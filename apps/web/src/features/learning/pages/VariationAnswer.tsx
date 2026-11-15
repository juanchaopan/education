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

type Props = {
  play: VariationPlay;
  // The scene on screen, one of those the child answers the variation in.
  shot: string;
  scope: LearningScope;
  film: ListeningFilm;
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  go: (shot: string) => void;
};

// The variation's parts in the scenes it is answered in: the guess in its
// guess scene, the reason in its reason scene, and the variation's own
// hints at hand in every one of them, said by the teacher in its subtitle.
// A child says the guess and the reason; a parent previewing taps them.
function VariationParts({
  answers,
  spoken,
  play,
  shot,
  go,
  ...on
}: Props & Readonly<{ answers: VariationAnswers; spoken: boolean }>) {
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
      <StagePlace at="hint">
        <FireflyHint left={answers.hintsLeft} ready={answers.canHint} onHint={answers.askHint} />
      </StagePlace>
    </>
  );
}

function SpokenVariation(props: Props) {
  const answers = useLessonVariation(props.scope, props.play.answer.hints);
  return <VariationParts {...props} answers={answers} spoken />;
}

function TappedVariation(props: Props) {
  const answers = usePreviewVariation(props.scope, props.play.answer.hints);
  return <VariationParts {...props} answers={answers} spoken={false} />;
}

// A lesson's variation, once the final answer is right: a child says the
// guess and the reason, and what they come to is recorded; a parent
// previewing the lesson taps them, judged the same way, and nothing is kept.
export function VariationAnswer({ mode, ...props }: Props & Readonly<{ mode: ProblemMode }>) {
  return mode === 'preview' ? <TappedVariation {...props} /> : <SpokenVariation {...props} />;
}
