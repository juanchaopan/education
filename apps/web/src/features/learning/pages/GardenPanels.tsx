import { DraftNotice } from '../components/DraftNotice';
import { LessonQuestionPanel } from '../components/LessonQuestionPanel';
import { SpokenAnswerPanel } from '../components/SpokenAnswerPanel';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonAnswer } from '../data-access/useLessonAnswer';
import type { useLessonDraft } from '../data-access/useLessonDraft';
import { useLessonQuestion } from '../data-access/useLessonQuestion';
import { useVoiceInput } from '../data-access/useVoiceInput';
import { answerStep } from '../interaction/spoken-answer';
import { spokenNumber } from '../interaction/spoken-number';
import {
  answerChoices,
  answerHints,
  answerQuestion,
  guidance,
  mistakeMessage,
  type Shot,
} from '../lessons/garden-balance/script';
import type { GardenStory } from '../lessons/garden-balance/useGardenStory';

type Props = {
  scope: LearningScope;
  story: GardenStory;
  draft: ReturnType<typeof useLessonDraft>;
};

function FinalAnswer({ scope, story, draft }: Props) {
  const answer = useLessonAnswer(scope, answerHints);
  const voice = useVoiceInput(scope, 'answer', (text) => {
    const count = spokenNumber(text);
    if (count !== undefined) answer.submit(count);
  });
  return (
    <SpokenAnswerPanel
      question={answerQuestion}
      step={answerStep(voice.state, answer.judgement, mistakeMessage)}
      choices={answerChoices}
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
      onContinue={() => {
        void draft.discard();
        story.go('variation');
      }}
    />
  );
}

function Questions({ scope, story, shot }: Pick<Props, 'scope' | 'story'> & { shot: Shot }) {
  const question = useLessonQuestion(scope, shot);
  return (
    <LessonQuestionPanel
      stepId={shot}
      voice={question.voice}
      reply={question.reply}
      guidance={guidance(shot)}
      paused={story.paused}
      onAsk={() => {
        story.pause();
        question.start();
      }}
      onStop={question.stop}
      onCancel={question.cancel}
      onStopWaiting={question.guide}
      onResume={story.resume}
    />
  );
}

// Everything under the film for a signed-in child: the final answer in its
// scene, a question about whichever scene is on screen, and the draft's state.
export function GardenPanels({ scope, story, draft }: Props) {
  const { shot } = story.state;
  if (shot === 'opening') return null;
  return (
    <>
      {shot === 'answer' && <FinalAnswer scope={scope} story={story} draft={draft} />}
      <Questions scope={scope} story={story} shot={shot} />
      <DraftNotice
        status={draft.status}
        hasDraft={draft.hasDraft}
        hasRemote={draft.hasRemote}
        message={draft.message}
        onSave={() => void draft.save()}
        onReload={() => void draft.reload()}
        onDiscard={() => void draft.discard()}
        onChoose={draft.resolve}
      />
    </>
  );
}
