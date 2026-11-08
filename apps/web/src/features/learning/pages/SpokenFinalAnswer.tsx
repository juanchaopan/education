import { SpokenAnswerPanel } from '../components/SpokenAnswerPanel';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonAnswer } from '../data-access/useLessonAnswer';
import { useVoiceInput } from '../data-access/useVoiceInput';
import { answerStep } from '../interaction/spoken-answer';
import { spokenNumber } from '../interaction/spoken-number';

type Props = {
  scope: LearningScope;
  question: string;
  // Numbers to tap when speech cannot be used.
  choices: readonly number[];
  // The problem's authored hints, in the order the child receives them.
  hintIds: readonly string[];
  // What a wrong count most likely is, in the lesson's own words.
  explain: (count: number) => string;
  onDone: () => void;
};

// A lesson's final count, said out loud and confirmed, then judged on the
// server, which records whether it was independent or helped.
export function SpokenFinalAnswer({ scope, question, choices, hintIds, explain, onDone }: Props) {
  const answer = useLessonAnswer(scope, hintIds);
  const voice = useVoiceInput(scope, 'answer', (text) => {
    const count = spokenNumber(text);
    if (count !== undefined) answer.submit(count);
  });
  return (
    <SpokenAnswerPanel
      question={question}
      step={answerStep(voice.state, answer.judgement, explain)}
      choices={choices}
      hint={answer.hint}
      hintFailed={answer.hintFailed}
      canHint={answer.canHint}
      onSpeak={voice.start}
      onStop={voice.stop}
      onCancel={voice.cancel}
      onStopWaiting={voice.guide}
      onConfirm={voice.confirm}
      onChoose={answer.submit}
      onRetry={answer.retry}
      onHint={answer.askHint}
      onContinue={onDone}
    />
  );
}
