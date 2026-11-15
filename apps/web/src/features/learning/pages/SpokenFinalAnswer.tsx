import { FireflyHint } from '../components/lesson-stage/FireflyHint';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import type { AnswerEvents } from '../data-access/useAnswerHints';
import { answerInput, useLessonAnswer, type Judgement } from '../data-access/useLessonAnswer';
import { answerStep, hintWords, type CountWords } from '../interaction/spoken-answer';
import type { Subtitle } from '../interaction/subtitle';
import type { ListeningFilm } from '../interaction/useListening';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import type { MicrophoneTurn } from '../voice/microphone-turn';
import { SpokenNumbers } from './SpokenNumbers';

type Props = {
  scope: LearningScope;
  // What the answer answers.
  question: string;
  // The unit the answer is said in, and what a wrong answer most likely is.
  words: CountWords;
  // The answer is every number that fits, sent as a list; otherwise it is
  // one number.
  every?: boolean;
  // Numbers to tap when speech cannot be used.
  choices: readonly number[];
  // The problem's authored hints, in the order the child receives them.
  hintIds: readonly string[];
  film: ListeningFilm;
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  // What the page hears of the hints received and an answer judged right.
  events?: AnswerEvents;
  onDone: () => void;
};

// Whether the child still has an answer to give: none was sent yet, or the
// last one was wrong or unclear.
function answering(judgement: Judgement) {
  if (judgement.status === 'open') return true;
  return (
    judgement.status === 'judged' &&
    (judgement.outcome === 'incorrect' || judgement.outcome === 'uncertain')
  );
}

// A lesson's final answer, said out loud and confirmed in the answer capsule,
// then judged on the server, which records whether it was independent or
// helped. The firefly hint drop beside it gives the authored hints one by
// one; the teacher says each hint, and every step of the answer, in its
// subtitle.
export function SpokenFinalAnswer({ words, every = false, hintIds, ...on }: Props) {
  const answer = useLessonAnswer(on.scope, hintIds, on.events);
  useSubtitleWords(on.subtitle, 'hint', hintWords(answer));
  return (
    <>
      <SpokenNumbers
        scope={on.scope}
        stepId="answer"
        question={on.question}
        unit={words.unit}
        every={every}
        choices={on.choices}
        film={on.film}
        turn={on.turn}
        subtitle={on.subtitle}
        open={answering(answer.judgement)}
        step={(voice, awaiting) => answerStep(voice, answer.judgement, words, { every, awaiting })}
        onSend={(said) => answer.submit(answerInput(said, every))}
        onRetry={answer.retry}
        onContinue={on.onDone}
      />
      <StagePlace at="hint">
        <FireflyHint left={answer.hintsLeft} ready={answer.canHint} onHint={answer.askHint} />
      </StagePlace>
    </>
  );
}
