import { useEffect, useState } from 'react';
import { useLatest } from '../../../shared/lib/useLatest';
import { AnswerCapsule } from '../components/lesson-stage/AnswerCapsule';
import { FireflyHint } from '../components/lesson-stage/FireflyHint';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonAnswer, type Judgement } from '../data-access/useLessonAnswer';
import { useVoiceInput } from '../data-access/useVoiceInput';
import { chimeMs, type Chime } from '../interaction/chime';
import type { NarrationFailure } from '../interaction/narration';
import { answerStep, answerWords, type CountWords } from '../interaction/spoken-answer';
import { spokenNumber } from '../interaction/spoken-number';
import type { Subtitle, Words } from '../interaction/subtitle';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import { usesMicrophone, type MicrophoneTurn } from '../voice/microphone-turn';

// The teacher's voice, which the microphone never listens over, and the
// lesson's tones and audio context, which the listening uses.
type Film = {
  telling: boolean;
  speaking: boolean;
  failure?: NarrationFailure;
  chime: Pick<Chime, 'play' | 'audio'>;
};

type Props = {
  scope: LearningScope;
  // What the count answers.
  question: string;
  // The unit the count is said in, and what a wrong count most likely is.
  words: CountWords;
  // Numbers to tap when speech cannot be used.
  choices: readonly number[];
  // The problem's authored hints, in the order the child receives them.
  hintIds: readonly string[];
  film: Film;
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  onDone: () => void;
};

// The short rising cue that tells the child the microphone is open. The
// microphone opens once it has sounded, so it is not heard as speech.
const listenTones = [523, 784];

const hintFailed = '提示暂时打不开，可以再试一次。';

// What the teacher says about the hints: thinking while one is on its way,
// so the last hint is not said again, then the new hint or why none came.
function hintWords(answer: ReturnType<typeof useLessonAnswer>): Words {
  if (answer.hintWaiting) return { thinking: true };
  return { text: answer.hintFailed ? hintFailed : answer.hint };
}

// Whether the child still has an answer to give: none was sent yet, or the
// last one was wrong or unclear.
function answering(judgement: Judgement) {
  if (judgement.status === 'open') return true;
  return (
    judgement.status === 'judged' &&
    (judgement.outcome === 'incorrect' || judgement.outcome === 'uncertain')
  );
}

// Opens the microphone by itself when the child is meant to answer: once the
// teacher has finished speaking, or a line could not be heard, and no one
// else is using the microphone, after a short cue. That happens when the
// answer scene opens and whenever the child asks to speak again. A line the
// teacher says again stops the listening, so the two never overlap.
function useListening(voice: ReturnType<typeof useVoiceInput>, film: Film, open: boolean) {
  const [wanted, setWanted] = useState(true);
  const latest = useLatest(voice);
  const { chime } = film;
  const quiet = !film.speaking && (!film.telling || film.failure !== undefined);
  const listening = usesMicrophone(voice.state.status);
  const ready = wanted && open && quiet && !voice.blocked;
  useEffect(() => {
    if (!ready) return;
    chime.play(listenTones);
    const timer = setTimeout(() => {
      if (latest.current.start()) setWanted(false);
    }, chimeMs(listenTones));
    return () => clearTimeout(timer);
  }, [ready, chime, latest]);
  useEffect(() => {
    if (!quiet && listening) latest.current.cancel();
  }, [quiet, listening, latest]);
  return { awaiting: wanted && open, listenAgain: () => setWanted(true) };
}

// A lesson's final count, said out loud and confirmed in the answer capsule,
// then judged on the server, which records whether it was independent or
// helped. The firefly hint drop beside it gives the authored hints one by
// one; the teacher says each hint, and every step of the answer, in its
// subtitle.
export function SpokenFinalAnswer({ scope, words, choices, hintIds, subtitle, ...on }: Props) {
  const answer = useLessonAnswer(scope, hintIds);
  const voice = useVoiceInput(scope, 'answer', 'listen', {
    turn: on.turn,
    audio: on.film.chime.audio,
  });
  const listening = useListening(voice, on.film, answering(answer.judgement));
  const step = answerStep(voice.state, answer.judgement, words, listening.awaiting);
  useSubtitleWords(subtitle, 'answer', { text: answerWords(step) });
  useSubtitleWords(subtitle, 'hint', hintWords(answer));
  const { state } = voice;
  return (
    <>
      <StagePlace at="answer">
        <AnswerCapsule
          question={on.question}
          step={step}
          unit={words.unit}
          choices={choices}
          blocked={voice.blocked}
          level={state.status === 'recording' ? state.level : undefined}
          onListen={listening.listenAgain}
          onFinish={voice.release}
          onStopWaiting={voice.guide}
          onConfirm={() => {
            const text = voice.confirm();
            const count = text === undefined ? undefined : spokenNumber(text, words.unit);
            if (count !== undefined) answer.submit(count);
          }}
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
