import { useState } from 'react';
import { DraftNotice } from '../components/DraftNotice';
import type { LearningScope } from '../data-access/learning-request';
import type { useLessonDraft } from '../data-access/useLessonDraft';
import type { FilmState } from '../interaction/lesson-film';
import type { LessonFilm } from '../interaction/useLessonFilm';
import { guidance, shotAfter, type LessonDefinition } from '../lessons/lesson-definition';
import { createMicrophoneTurn } from '../voice/microphone-turn';
import { SceneQuestions } from './SceneQuestions';
import { SpokenFinalAnswer } from './SpokenFinalAnswer';

// What the panels read of a lesson: its script and its final count.
type PanelLesson<Shot extends string> = Pick<
  LessonDefinition<FilmState<Shot>, Shot, string, unknown, string, object>,
  'script' | 'answer'
>;

// What the panels need from the playing film: the scene on screen, a way to
// move to another, the teacher's voice, which the answer never listens over
// and a question holds while the child asks, and the lesson's tones.
type PanelFilm<Shot extends string> = Pick<
  LessonFilm<FilmState<Shot>, Shot, unknown>,
  'state' | 'go' | 'telling' | 'speaking' | 'failure' | 'paused' | 'pause' | 'resume' | 'chime'
>;

type Props<Shot extends string> = {
  lesson: PanelLesson<Shot>;
  // The name of the teacher a question is asked of.
  teacher: string;
  scope: LearningScope;
  film: PanelFilm<Shot>;
  draft: ReturnType<typeof useLessonDraft>;
};

// Everything under the film for a signed-in child: in the answer scene the
// final count, which the microphone listens for by itself; in every scene a
// question about it, which in the answer scene counts as help; and the
// draft's state. The answer and the questions share the lesson's one
// microphone. A correct answer ends the saved work, so its draft is
// discarded, and the film plays on from the scene after the answer.
export function LessonPanels<Shot extends string>({
  lesson,
  teacher,
  scope,
  film,
  draft,
}: Props<Shot>) {
  const [turn] = useState(createMicrophoneTurn);
  const { shot } = film.state;
  if (shot === 'opening') return null;
  const { answer, script } = lesson;
  return (
    <>
      {shot === answer.shot && (
        <SpokenFinalAnswer
          scope={scope}
          question={answer.question}
          words={answer.words}
          choices={answer.choices}
          hintIds={answer.hints}
          film={film}
          turn={turn}
          onDone={() => {
            void draft.discard();
            const next = shotAfter(script, answer.shot);
            if (next) film.go(next);
          }}
        />
      )}
      <SceneQuestions
        scope={scope}
        teacher={teacher}
        stepId={shot}
        answerStep={answer.shot}
        guidance={guidance(script, shot)}
        narration={film}
        turn={turn}
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
