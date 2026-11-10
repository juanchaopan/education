import type { ComponentType, ReactNode } from 'react';
import { useFullscreen } from '../../../shared/lib/useFullscreen';
import { LessonStage } from '../components/lesson-stage/LessonStage';
import { DragGhost } from '../components/lesson-stage/Prop';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonDraft } from '../data-access/useLessonDraft';
import { useLessonRecordings } from '../data-access/useLessonRecordings';
import type { FilmState } from '../interaction/lesson-film';
import { useLessonFilm, type LessonFilm } from '../interaction/useLessonFilm';
import { useStageDrag } from '../interaction/useStageDrag';
import { filmStory, resumed, stageLook, type LessonDefinition } from '../lessons/lesson-definition';
import { LessonPanels } from './LessonPanels';
import { LessonSignInNotice } from './LessonSignInNotice';
import styles from './LessonPage.module.css';

type Recordings = ReturnType<typeof useLessonRecordings>;

// Where the film starts: a saved scene to resume, or, while the child's saved
// place is still being looked up, nowhere yet, so a quick tap cannot start
// over and overwrite it.
type Start<Shot> = { resume?: Shot; finding?: boolean };

// The title card's button: it starts the film once the saved place is known
// and every recording has arrived, and fetches the recordings again when they
// did not all arrive. Starting the film also asks for the whole screen in the
// same tap, the only time a browser grants it, once the teacher's voice has
// had the tap it needs to start.
function entry<Shot extends string>(
  recordings: Recordings,
  { resume, finding }: Start<Shot>,
  enter: (shot?: Shot) => void,
  fullscreen: () => void,
) {
  if (finding) return { label: '正在找上次的地方…' };
  if (recordings.preparation === 'preparing') return { label: '正在准备声音…' };
  if (recordings.preparation === 'failed')
    return { label: '声音没下载好，点这里再试', onEnter: recordings.retry };
  return {
    label: resume ? '接着上次的地方' : '开始短片',
    onEnter: () => {
      enter(resume);
      fullscreen();
    },
  };
}

// One problem's lesson page, built once for its own definition, so the page
// holds the lesson to its own state, scenes, lines, moves and props. Anyone
// can watch and play the scenes; saving, questions and the answer need a
// signed-in child, whose session token the page takes.
export function lessonPage<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
  Piece extends string,
  Look extends object,
>(
  lesson: LessonDefinition<State, Shot, Line, Move, Piece, Look>,
): ComponentType<{ csrf?: string }> {
  const { script, story, props, Scene } = lesson;
  const look = stageLook(lesson);
  const tale = filmStory(script, story);
  const first = { stepId: script.shots[0], drawing: [] };
  type Film = LessonFilm<State, Shot, Move>;
  type ScreenProps = { film: Film; recordings: Recordings; start: Start<Shot> };
  type BodyProps = {
    start?: Start<Shot>;
    onArrive?: (shot: Shot) => void;
    panels: (film: Film) => ReactNode;
  };

  // The film and the props the child moves. A drag changes only this part of
  // the page, never the panels beside it. The film holds the whole screen
  // from its start until it leaves the page.
  function Screen({ film, recordings, start }: ScreenProps) {
    const drag = useStageDrag(film, props);
    const fullscreen = useFullscreen();
    const { label, onEnter } = entry(recordings, start, film.enter, fullscreen);
    const { state } = film;
    const { ghost } = drag;
    return (
      <LessonStage
        look={look}
        shot={state.shot}
        caption={state.shot === 'opening' ? undefined : film.caption}
        speaking={film.speaking}
        failure={film.failure}
        entryLabel={label}
        worldRef={drag.world}
        defs={lesson.defs}
        ambience={lesson.ambience}
        ghost={
          ghost && (
            <DragGhost x={ghost.x} y={ghost.y}>
              {props.carried(ghost)}
            </DragGhost>
          )
        }
        onEnter={onEnter}
        onReplay={film.replay}
        onActivate={drag.activate}
      >
        <Scene state={state} handling={drag.handling} />
      </LessonStage>
    );
  }

  // The playing film filling the screen, with whatever goes with it in a
  // strip of its own, its recordings fetched as the page opens.
  function Body({ start = {}, onArrive, panels }: BodyProps) {
    const recordings = useLessonRecordings(script.lines);
    const film = useLessonFilm(tale, { onArrive });
    return (
      <div className={styles.lesson}>
        <Screen film={film} recordings={recordings} start={start} />
        <div className={styles.panels}>{panels(film)}</div>
      </div>
    );
  }

  // A signed-in child's lesson: each scene reached that is work in progress
  // is saved, so coming back resumes at its start, and the answer, the
  // questions and the draft all belong to this child.
  function SignedIn({ scope }: { scope: LearningScope }) {
    const draft = useLessonDraft(scope, first);
    const saved = draft.status === 'saved' ? draft.content.stepId : undefined;
    const resume = saved === undefined ? undefined : resumed(script, saved);
    return (
      <Body
        start={{ resume, finding: draft.status === 'loading' }}
        onArrive={(shot) => {
          if (story.savesProgress(shot)) void draft.saveAs({ stepId: shot, drawing: [] });
        }}
        panels={(film) => (
          <LessonPanels
            lesson={lesson}
            teacher={look.teacher.name}
            scope={scope}
            film={film}
            draft={draft}
          />
        )}
      />
    );
  }

  return function LessonPage({ csrf }) {
    if (!csrf) return <Body panels={() => <LessonSignInNotice teacher={look.teacher.name} />} />;
    return <SignedIn scope={{ ...lesson.problem, csrf }} />;
  };
}
