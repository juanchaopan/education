import { AnswerCapsule } from '../components/lesson-stage/AnswerCapsule';
import { FireflyHint } from '../components/lesson-stage/FireflyHint';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import type { AnswerEvents } from '../data-access/useAnswerHints';
import { answerInput, useLessonAnswer, type Judgement } from '../data-access/useLessonAnswer';
import { useVoiceInput } from '../data-access/useVoiceInput';
import { answerStep, answerWords, hintWords, type CountWords } from '../interaction/spoken-answer';
import type { Subtitle } from '../interaction/subtitle';
import { useListening, type ListeningFilm } from '../interaction/useListening';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import type { MicrophoneTurn } from '../voice/microphone-turn';

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
// helped. The microphone opens by itself when the answer scene opens and
// whenever the child asks to speak again. The firefly hint drop beside it
// gives the authored hints one by one; the teacher says each hint, and every
// step of the answer, in its subtitle.
export function SpokenFinalAnswer({
  scope,
  words,
  every = false,
  choices,
  hintIds,
  subtitle,
  ...on
}: Props) {
  const answer = useLessonAnswer(scope, hintIds, on.events);
  const voice = useVoiceInput(scope, 'answer', 'listen', {
    turn: on.turn,
    audio: on.film.chime.audio,
  });
  const listening = useListening(voice, on.film, answering(answer.judgement));
  const step = answerStep(voice.state, answer.judgement, words, {
    every,
    awaiting: listening.awaiting,
  });
  useSubtitleWords(subtitle, 'answer', { text: answerWords(step) });
  useSubtitleWords(subtitle, 'hint', hintWords(answer));
  const { state } = voice;
  const send = (said: readonly number[]) => answer.submit(answerInput(said, every));
  return (
    <>
      <StagePlace at="answer">
        <AnswerCapsule
          question={on.question}
          step={step}
          unit={words.unit}
          every={every}
          choices={choices}
          blocked={voice.blocked}
          level={state.status === 'recording' ? state.level : undefined}
          onListen={listening.listenAgain}
          onFinish={voice.release}
          onStopWaiting={voice.guide}
          onConfirm={() => {
            if (step.kind === 'confirm' && voice.confirm() !== undefined) send(step.said);
          }}
          onChoose={send}
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
