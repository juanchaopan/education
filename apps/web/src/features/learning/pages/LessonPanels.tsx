import { DraftNotice } from '../components/DraftNotice';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import type { useLessonDraft } from '../data-access/useLessonDraft';
import type { FilmState } from '../interaction/lesson-film';
import type { Subtitle } from '../interaction/subtitle';
import type { LessonFilm } from '../interaction/useLessonFilm';
import { guidance, shotAfter, type LessonDefinition } from '../lessons/lesson-definition';
import type { MicrophoneTurn } from '../voice/microphone-turn';
import { SceneQuestions } from './SceneQuestions';
import { SpokenFinalAnswer } from './SpokenFinalAnswer';

// What the controls read of a lesson: its script and its final count.
type PanelLesson<Shot extends string> = Pick<
  LessonDefinition<FilmState<Shot>, Shot, string, unknown, string, object>,
  'script' | 'answer'
>;

// What the controls need from the playing film: the scene on screen, a way
// to move to another, the teacher's voice, which the answer never listens
// over and a question holds while the child asks, and the lesson's tones.
type PanelFilm<Shot extends string> = Pick<
  LessonFilm<FilmState<Shot>, Shot, unknown>,
  'state' | 'go' | 'telling' | 'speaking' | 'failure' | 'pause' | 'chime'
>;

type Props<Shot extends string> = {
  lesson: PanelLesson<Shot>;
  // The name of the teacher a question is asked of.
  teacher: string;
  scope: LearningScope;
  film: PanelFilm<Shot>;
  // The lesson's one microphone, which the answer and the questions share,
  // and the teacher's subtitle, which they both speak through.
  turn: MicrophoneTurn;
  subtitle: Subtitle;
  draft: ReturnType<typeof useLessonDraft>;
};

// The controls a signed-in child has in the picture: the draft's state under
// the tools; in the answer scene the final count, which the microphone
// listens for by itself, and the hints; in every scene a question about it,
// which in the answer scene counts as help. A correct answer ends the saved
// work, so its draft is discarded, and the film plays on from the scene after
// the answer.
export function LessonPanels<Shot extends string>({
  lesson,
  teacher,
  scope,
  film,
  turn,
  subtitle,
  draft,
}: Props<Shot>) {
  const { shot } = film.state;
  if (shot === 'opening') return null;
  const { answer, script } = lesson;
  return (
    <>
      <StagePlace at="notice">
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
      </StagePlace>
      {shot === answer.shot && (
        <SpokenFinalAnswer
          scope={scope}
          question={answer.question}
          words={answer.words}
          choices={answer.choices}
          hintIds={answer.hints}
          film={film}
          turn={turn}
          subtitle={subtitle}
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
        audio={film.chime.audio}
        subtitle={subtitle}
      />
    </>
  );
}
