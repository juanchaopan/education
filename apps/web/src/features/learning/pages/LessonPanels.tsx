import { useFlash } from '../../../shared/lib/useFlash';
import { DraftNotice } from '../components/DraftNotice';
import { StagePlace } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import type { AnswerEvents } from '../data-access/useLessonAnswer';
import type { useLessonDraft } from '../data-access/useLessonDraft';
import { useStudyTime } from '../data-access/useStudyTime';
import type { FilmState } from '../interaction/lesson-film';
import type { Subtitle } from '../interaction/subtitle';
import type { LessonFilm } from '../interaction/useLessonFilm';
import { guidance, shotAfter, type LessonDefinition } from '../lessons/lesson-definition';
import type { MicrophoneTurn } from '../voice/microphone-turn';
import { flowAnswers } from './flows/flow-answers';
import { SceneQuestions } from './SceneQuestions';

// How long the draft notice tells the child the lesson picked up where it was
// left, long enough to reach its button, and how long it tells them a save
// landed.
const resumedFor = 6000;
const savedFor = 3000;

// What the controls read of a lesson: the flow its content follows, its
// script and its answer settings.
type PanelLesson<Shot extends string> = Pick<
  LessonDefinition<FilmState<Shot>, Shot, string, unknown, string, object>,
  'content' | 'script' | 'answer'
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
  // The scene the child last picked up a saved lesson at, a fresh value each
  // time, and how the child starts over from there.
  resumed?: { shot: Shot };
  onRestart: () => void;
  // What the page hears of the hints received and a count judged right.
  answerEvents?: AnswerEvents;
};

// What the draft notice shows for a moment: picking up where the lesson was
// left while the child is still in that scene, otherwise a save that just
// landed.
function useDraftMoment<Shot extends string>(
  { saves }: Pick<Props<Shot>['draft'], 'saves'>,
  shot: Shot | 'opening',
  resumed?: { shot: Shot },
) {
  const picked = useFlash(resumed, resumedFor) && resumed?.shot === shot;
  const saved = useFlash(saves || undefined, savedFor);
  if (picked) return 'resumed';
  return saved ? 'saved' : undefined;
}

// The controls a signed-in child has in the picture: the draft's notice under
// the tools; the answer part of the lesson's flow, which for 逐幕探究 is the
// final count in the answer scene, which the microphone listens for by
// itself, and the hints; in every scene a question about it, which in the
// answer scene counts as help. A correct answer ends the saved work, so its
// draft is discarded, and the film plays on from the scene after the answer.
// The controls appear once the child pressed to start or resume the lesson;
// from that press on, the time the child works on the page counts as study
// time.
export function LessonPanels<Shot extends string>({
  lesson,
  teacher,
  scope,
  film,
  turn,
  subtitle,
  draft,
  resumed,
  onRestart,
  answerEvents,
}: Props<Shot>) {
  const { shot } = film.state;
  const moment = useDraftMoment(draft, shot, resumed);
  useStudyTime(scope.csrf);
  if (shot === 'opening') return null;
  const { answer, script } = lesson;
  const FlowAnswer = flowAnswers[lesson.content.flow];
  return (
    <>
      <StagePlace at="notice">
        <DraftNotice
          status={draft.status}
          moment={moment}
          hasDraft={draft.hasDraft}
          hasRemote={draft.hasRemote}
          message={draft.message}
          onSave={() => void draft.save()}
          onReload={() => void draft.reload()}
          onDiscard={() => void draft.discard()}
          onChoose={draft.resolve}
          onRestart={onRestart}
        />
      </StagePlace>
      <FlowAnswer
        answer={answer}
        shot={shot}
        scope={scope}
        film={film}
        turn={turn}
        subtitle={subtitle}
        events={answerEvents}
        onDone={() => {
          void draft.discard();
          const next = shotAfter(script, answer.shot);
          if (next) film.go(next);
        }}
      />
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
