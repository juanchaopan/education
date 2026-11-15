import { useState } from 'react';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import { ReasonCapsule } from '../components/lesson-stage/ReasonCapsule';
import type { ChosenReason } from '../components/lesson-stage/ReasonChoices';
import type { LearningScope } from '../data-access/learning-request';
import type { ReasonJudgement, VariationAnswers } from '../data-access/useLessonVariation';
import { useVoiceInput } from '../data-access/useVoiceInput';
import type { VoiceState } from '../data-access/voice-input';
import type { Subtitle } from '../interaction/subtitle';
import { useListening, type ListeningFilm } from '../interaction/useListening';
import { useMoveOn } from '../interaction/useMoveOn';
import { useSubtitleWords } from '../interaction/useSubtitleWords';
import {
  missesAfter,
  missesBeforeTapping,
  reasonStep,
  reasonTry,
  reasonWords,
  tappedReasonStep,
} from '../interaction/variation-steps';
import type { LessonVariationAnswer } from '../lessons/lesson-definition';
import type { MicrophoneTurn } from '../voice/microphone-turn';

type Props = {
  scope: LearningScope;
  // The scene the reason is asked in.
  stepId: string;
  reason: VariationAnswers['reason'];
  // The server holds a clear reason for this round already.
  explained: boolean;
  settings: LessonVariationAnswer['reason'];
  // The lesson's reasons to tap by id, with their words.
  choices: Readonly<Record<string, string>>;
  subtitle: Subtitle;
  onExplained: () => void;
};

const unused = () => {};

const clear = (judgement: ReasonJudgement) =>
  judgement.status === 'judged' &&
  (judgement.outcome === 'independent' || judgement.outcome === 'assisted');

// Whether the child still has a reason to give: none was sent yet, or the
// last one was not clear or could not be judged.
const giving = (judgement: ReasonJudgement) =>
  judgement.status === 'open' || (judgement.status === 'judged' && !clear(judgement));

// The tapped reason as it is sent.
const tapped = ({ kept, changed }: ChosenReason) => ({
  choose: { kept: [...kept], changed: [...changed] },
});

// Once the reason is clear the lesson moves on at once to say what the
// variation came to.
function useExplained({ reason, explained, onExplained }: Props) {
  useMoveOn(clear(reason.judgement) || explained, onExplained, 0);
}

// How many tries in a row came to nothing, counted as each try ends.
function useMisses(voice: VoiceState, judgement: ReasonJudgement) {
  const now = reasonTry(voice, judgement);
  const [last, setLast] = useState(now);
  const [misses, setMisses] = useState(0);
  if (now !== last) {
    setLast(now);
    setMisses((count) => missesAfter(count, now));
  }
  return misses;
}

// The variation's reason, said out loud and confirmed in its capsule, then
// judged on the server by the problem's own rule. A reason that is not clear
// gets the lesson's words and is said again, with the variation's hints at
// hand; once speech has proved unusable, or two tries in a row came to
// nothing, the child taps what stayed and what changed instead.
export function SpokenReason(
  props: Props & Readonly<{ film: ListeningFilm; turn: MicrophoneTurn }>,
) {
  const { scope, stepId, reason, settings, film, turn } = props;
  useExplained(props);
  const voice = useVoiceInput(scope, stepId, 'listen', { turn, audio: film.chime.audio });
  const tapping = useMisses(voice.state, reason.judgement) >= missesBeforeTapping;
  const listening = useListening(voice, film, giving(reason.judgement) && !tapping);
  const step = reasonStep(voice.state, reason.judgement, {
    unclear: settings.unclear,
    awaiting: listening.awaiting,
    tapping,
  });
  useSubtitleWords(props.subtitle, 'answer', { text: reasonWords(step) });
  const { state } = voice;
  return (
    <StagePlace at="answer">
      <ReasonCapsule
        question={settings.question}
        step={step}
        choices={props.choices}
        blocked={voice.blocked}
        level={state.status === 'recording' ? state.level : undefined}
        onListen={listening.listenAgain}
        onFinish={voice.release}
        onStopWaiting={voice.guide}
        onConfirm={() => {
          const said = step.kind === 'confirm' ? voice.confirm() : undefined;
          if (said !== undefined) reason.submit({ say: said });
        }}
        onChoose={(chosen) => reason.submit(tapped(chosen))}
        onRetry={reason.retry}
      />
    </StagePlace>
  );
}

// The reason tapped, as a parent previewing the lesson gives it: the words
// from the start, judged and moving on as a child's reason is.
export function TappedReason(props: Props) {
  const { reason, settings } = props;
  useExplained(props);
  const step = tappedReasonStep(reason.judgement, settings.unclear);
  useSubtitleWords(props.subtitle, 'answer', { text: reasonWords(step) });
  return (
    <StagePlace at="answer">
      <ReasonCapsule
        question={settings.question}
        step={step}
        choices={props.choices}
        blocked
        onListen={unused}
        onFinish={unused}
        onStopWaiting={unused}
        onConfirm={unused}
        onChoose={(chosen) => reason.submit(tapped(chosen))}
        onRetry={reason.retry}
      />
    </StagePlace>
  );
}
