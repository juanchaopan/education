import { DraftNotice } from '../components/DraftNotice';
import type { LearningScope } from '../data-access/learning-request';
import type { useLessonDraft } from '../data-access/useLessonDraft';
import type { FilmState } from '../interaction/lesson-film';
import type { LessonFilm } from '../interaction/useLessonFilm';
import { guidance, shotAfter, type LessonDefinition } from '../lessons/lesson-definition';
import { SceneQuestions } from './SceneQuestions';
import { SpokenFinalAnswer } from './SpokenFinalAnswer';

// What the panels read of a lesson: who teaches it, its script and its
// final count.
type PanelLesson<Shot extends string> = Pick<
  LessonDefinition<FilmState<Shot>, Shot, string, unknown, string, object>,
  'teacher' | 'script' | 'answer'
>;

// What the panels need from the playing film: the scene on screen, a way to
// move to another, and the teacher's voice, which questions and the answer
// hold while the child speaks.
type PanelFilm<Shot extends string> = Pick<
  LessonFilm<FilmState<Shot>, Shot, unknown>,
  'state' | 'go' | 'paused' | 'pause' | 'resume'
>;

type Props<Shot extends string> = {
  lesson: PanelLesson<Shot>;
  scope: LearningScope;
  film: PanelFilm<Shot>;
  draft: ReturnType<typeof useLessonDraft>;
};

// Everything under the film for a signed-in child: in the answer scene the
// final count, which has its own hints and keeps the one microphone for the
// answer; in every other scene a question about it; and the draft's state. A
// correct answer ends the saved work, so its draft is discarded, and the film
// plays on from the scene after the answer.
export function LessonPanels<Shot extends string>({ lesson, scope, film, draft }: Props<Shot>) {
  const { shot } = film.state;
  if (shot === 'opening') return null;
  const { answer, script } = lesson;
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
            const next = shotAfter(script, answer.shot);
            if (next) film.go(next);
          }}
        />
      ) : (
        <SceneQuestions
          scope={scope}
          teacher={lesson.teacher.name}
          stepId={shot}
          guidance={guidance(script, shot)}
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
