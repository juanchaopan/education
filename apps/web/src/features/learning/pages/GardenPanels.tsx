import { DraftNotice } from '../components/DraftNotice';
import type { LearningScope } from '../data-access/learning-request';
import type { useLessonDraft } from '../data-access/useLessonDraft';
import type { GardenFilm } from '../lessons/garden-balance/garden-story';
import {
  answerChoices,
  answerHints,
  answerQuestion,
  answerWords,
  guidance,
  teacher,
} from '../lessons/garden-balance/script';
import { SceneQuestions } from './SceneQuestions';
import { SpokenFinalAnswer } from './SpokenFinalAnswer';

type Props = {
  scope: LearningScope;
  film: GardenFilm;
  draft: ReturnType<typeof useLessonDraft>;
};

// Everything under the film for a signed-in child: in the answer scene the
// final count, which has its own hints and keeps the one microphone for the
// answer; in every other scene a question about it; and the draft's state. A
// correct answer ends the saved work, so its draft is discarded.
export function GardenPanels({ scope, film, draft }: Props) {
  const { shot } = film.state;
  if (shot === 'opening') return null;
  return (
    <>
      {shot === 'answer' ? (
        <SpokenFinalAnswer
          scope={scope}
          question={answerQuestion}
          words={answerWords}
          choices={answerChoices}
          hintIds={answerHints}
          narration={film}
          onDone={() => {
            void draft.discard();
            film.go('variation');
          }}
        />
      ) : (
        <SceneQuestions
          scope={scope}
          teacher={teacher}
          stepId={shot}
          guidance={guidance(shot)}
          narration={film}
        />
      )}
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
