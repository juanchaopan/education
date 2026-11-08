import { DraftNotice } from '../components/DraftNotice';
import type { LearningScope } from '../data-access/learning-request';
import type { useLessonDraft } from '../data-access/useLessonDraft';
import {
  answerChoices,
  answerHints,
  answerQuestion,
  guidance,
  mistakeMessage,
  teacher,
} from '../lessons/garden-balance/script';
import type { GardenStory } from '../lessons/garden-balance/useGardenStory';
import { SceneQuestions } from './SceneQuestions';
import { SpokenFinalAnswer } from './SpokenFinalAnswer';

type Props = {
  scope: LearningScope;
  story: GardenStory;
  draft: ReturnType<typeof useLessonDraft>;
};

// Everything under the film for a signed-in child: the final answer in its
// scene, a question about whichever scene is on screen, and the draft's state.
// A correct answer ends the saved work, so its draft is discarded.
export function GardenPanels({ scope, story, draft }: Props) {
  const { shot } = story.state;
  if (shot === 'opening') return null;
  return (
    <>
      {shot === 'answer' && (
        <SpokenFinalAnswer
          scope={scope}
          question={answerQuestion}
          choices={answerChoices}
          hintIds={answerHints}
          explain={mistakeMessage}
          onDone={() => {
            void draft.discard();
            story.go('variation');
          }}
        />
      )}
      <SceneQuestions
        scope={scope}
        teacher={teacher}
        stepId={shot}
        guidance={guidance(shot)}
        narration={story}
      />
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
