import { DraftNotice } from '../components/DraftNotice';
import type { LearningScope } from '../data-access/learning-request';
import type { useLessonDraft } from '../data-access/useLessonDraft';
import type { LessonFilm } from '../interaction/useLessonFilm';
import { guidance, shotAfter, type Lesson, type LessonState } from '../lessons/lesson-definition';
import { SceneQuestions } from './SceneQuestions';
import { SpokenFinalAnswer } from './SpokenFinalAnswer';

export type PlayingLesson = LessonFilm<LessonState, string, unknown>;

type Props = {
  lesson: Lesson;
  scope: LearningScope;
  film: PlayingLesson;
  draft: ReturnType<typeof useLessonDraft>;
};

// Everything under the film for a signed-in child: in the answer scene the
// final count, which has its own hints and keeps the one microphone for the
// answer; in every other scene a question about it; and the draft's state. A
// correct answer ends the saved work, so its draft is discarded, and the film
// plays on from the scene after the answer.
export function LessonPanels({ lesson, scope, film, draft }: Props) {
  const { shot } = film.state;
  if (shot === 'opening') return null;
  const { answer } = lesson;
  return (
    <>
      {shot === answer.shot ? (
        <SpokenFinalAnswer
          scope={scope}
          question={answer.question}
          words={answer.words}
          choices={answer.choices}
          hintIds={answer.hints}
          narration={film}
          onDone={() => {
            void draft.discard();
            const next = shotAfter(lesson, answer.shot);
            if (next) film.go(next);
          }}
        />
      ) : (
        <SceneQuestions
          scope={scope}
          teacher={lesson.teacher.name}
          stepId={shot}
          guidance={guidance(lesson, shot)}
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
