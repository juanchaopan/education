import { AnswerCapsule } from '../components/lesson-stage/AnswerCapsule';
import { FireflyHint } from '../components/lesson-stage/FireflyHint';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import type { AnswerEvents } from '../data-access/useAnswerHints';
import { answerInput } from '../data-access/useLessonAnswer';
import { usePreviewAnswer } from '../data-access/usePreviewAnswer';
import { answerWords, hintWords, tappedStep, type CountWords } from '../interaction/spoken-answer';
import type { Subtitle } from '../interaction/subtitle';
import { useSubtitleWords } from '../interaction/useSubtitleWords';

type Props = {
  scope: LearningScope;
  // What the answer answers.
  question: string;
  // The unit the answer is said in, and what a wrong answer most likely is.
  words: CountWords;
  // The answer is every number that fits, sent as a list; otherwise it is
  // one number.
  every?: boolean;
  // Numbers to tap.
  choices: readonly number[];
  // The problem's authored hints, in the order they are received.
  hintIds: readonly string[];
  subtitle: Subtitle;
  // What the page hears of the hints received and an answer judged right.
  events?: AnswerEvents;
  onDone: () => void;
};

// Only spoken steps listen or confirm, and a tapped answer never reaches one.
const unused = () => {};

// A parent previewing a lesson answers its final answer by tapping numbers,
// with no microphone: the capsule shows the numbers from the start, the
// server judges the answer by the same rules as a child's, and the teacher
// says each step and each hint in the subtitle, as for a child.
export function TappedFinalAnswer({
  scope,
  words,
  every = false,
  choices,
  hintIds,
  subtitle,
  ...on
}: Props) {
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
          every={every}
          choices={choices}
          blocked
          onListen={unused}
          onFinish={unused}
          onStopWaiting={unused}
          onConfirm={unused}
          onChoose={(said) => answer.submit(answerInput(said, every))}
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
