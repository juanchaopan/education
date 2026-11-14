import { AnswerCapsule } from '../components/lesson-stage/AnswerCapsule';
import { FireflyHint } from '../components/lesson-stage/FireflyHint';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import type { AnswerEvents } from '../data-access/useAnswerHints';
import { usePreviewAnswer } from '../data-access/usePreviewAnswer';
import { answerWords, hintWords, tappedStep, type CountWords } from '../interaction/spoken-answer';
import type { Subtitle } from '../interaction/subtitle';
import { useSubtitleWords } from '../interaction/useSubtitleWords';

type Props = {
  scope: LearningScope;
  // What the count answers.
  question: string;
  // The unit the count is said in, and what a wrong count most likely is.
  words: CountWords;
  // Numbers to tap.
  choices: readonly number[];
  // The problem's authored hints, in the order they are received.
  hintIds: readonly string[];
  subtitle: Subtitle;
  // What the page hears of the hints received and a count judged right.
  events?: AnswerEvents;
  onDone: () => void;
};

// Only spoken steps listen or confirm, and a tapped answer never reaches one.
const unused = () => {};

// A parent previewing a lesson answers its final count by tapping a number,
// with no microphone: the capsule shows the numbers from the start, the
// server judges the count by the same rules as a child's, and the teacher
// says each step and each hint in the subtitle, as for a child.
export function TappedFinalAnswer({ scope, words, choices, hintIds, subtitle, ...on }: Props) {
  const answer = usePreviewAnswer(scope, hintIds, on.events);
  const step = tappedStep(answer.judgement, words);
  useSubtitleWords(subtitle, 'answer', { text: answerWords(step) });
  useSubtitleWords(subtitle, 'hint', hintWords(answer));
  return (
    <>
      <StagePlace at="answer">
        <AnswerCapsule
          question={on.question}
          step={step}
          unit={words.unit}
          choices={choices}
          blocked
          onListen={unused}
          onFinish={unused}
          onStopWaiting={unused}
          onConfirm={unused}
          onChoose={answer.submit}
          onRetry={answer.retry}
          onContinue={on.onDone}
        />
      </StagePlace>
      <StagePlace at="hint">
        <FireflyHint left={answer.hintsLeft} ready={answer.canHint} onHint={answer.askHint} />
      </StagePlace>
    </>
  );
}
