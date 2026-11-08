import { SpokenAnswerPanel } from '../components/SpokenAnswerPanel';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonAnswer } from '../data-access/useLessonAnswer';
import { useVoiceInput } from '../data-access/useVoiceInput';
import { answerStep, type CountWords } from '../interaction/spoken-answer';
import { spokenNumber } from '../interaction/spoken-number';

type Props = {
  scope: LearningScope;
  question: string;
  // The unit the count is said in, and what a wrong count most likely is.
  words: CountWords;
  // Numbers to tap when speech cannot be used.
  choices: readonly number[];
  // The problem's authored hints, in the order the child receives them.
  hintIds: readonly string[];
  // The narration, held while the child speaks so the microphone hears only them.
  narration: { pause: () => void };
  onDone: () => void;
};

// A lesson's final count, said out loud and confirmed, then judged on the
// server, which records whether it was independent or helped.
export function SpokenFinalAnswer({ scope, question, words, choices, hintIds, ...on }: Props) {
  const answer = useLessonAnswer(scope, hintIds);
  const voice = useVoiceInput(scope, 'answer', (text) => {
    const count = spokenNumber(text, words.unit);
    if (count !== undefined) answer.submit(count);
  });
  return (
    <SpokenAnswerPanel
      question={question}
      step={answerStep(voice.state, answer.judgement, words)}
      choices={choices}
      hint={answer.hint}
      hintFailed={answer.hintFailed}
      canHint={answer.canHint}
      onSpeak={() => {
        on.narration.pause();
        voice.start();
      }}
      onStop={voice.stop}
      onCancel={voice.cancel}
      onStopWaiting={voice.guide}
      onConfirm={voice.confirm}
      onChoose={answer.submit}
      onRetry={answer.retry}
      onHint={answer.askHint}
      onContinue={on.onDone}
    />
  );
}
