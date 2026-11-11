import type { ReactNode } from 'react';
import { useFullscreen } from '../../../shared/lib/useFullscreen';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { LessonStage } from '../components/lesson-stage/LessonStage';
import { DragGhost } from '../components/lesson-stage/Prop';
import type { StageLook } from '../components/lesson-stage/stage-look';
import type { useLessonRecordings } from '../data-access/useLessonRecordings';
import type { FilmState } from '../interaction/lesson-film';
import type { LessonFilm } from '../interaction/useLessonFilm';
import { useStageDrag } from '../interaction/useStageDrag';
import type { LessonDefinition } from '../lessons/lesson-definition';

type Recordings = ReturnType<typeof useLessonRecordings>;

// Where the film starts: a saved scene to resume, or, while the child's saved
// place is still being looked up, nowhere yet, so a quick tap cannot start
// over and overwrite it; and what the page does once the child picks up a
// saved scene.
export type Start<Shot> = {
  resume?: Shot;
  finding?: boolean;
  onResume?: (shot: Shot) => void;
};

// The title card's button: it starts the film once the saved place is known
// and every recording has arrived, and fetches the recordings again when they
// did not all arrive. Starting the film also asks for the whole screen in the
// same tap, the only time a browser grants it, once the teacher's voice has
// had the tap it needs to start.
function entry<Shot extends string>(
  recordings: Recordings,
  { resume, finding, onResume }: Start<Shot>,
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
      if (resume) onResume?.(resume);
      fullscreen();
    },
  };
}

// The film of one lesson filling the screen, with the controls laid into its
// picture, built once for the lesson's own definition. A drag changes only
// this part of the page; the controls it is given are made outside it and
// stay as they are. The film holds the whole screen from its start until it
// leaves the page.
export function lessonScreen<
  State extends FilmState<Shot>,
  Shot extends string,
  Line extends string,
  Move,
  Piece extends string,
  Look extends object,
>(lesson: LessonDefinition<State, Shot, Line, Move, Piece, Look>, look: StageLook) {
  const { props, Scene } = lesson;
  type Props = {
    film: LessonFilm<State, Shot, Move>;
    recordings: Recordings;
    start: Start<Shot>;
    controls: ReactNode;
  };
  return function LessonScreen({ film, recordings, start, controls }: Props) {
    const drag = useStageDrag(film, props);
    const fullscreen = useFullscreen();
    const keyboard = useKeyboardInset();
    const { label, onEnter } = entry(recordings, start, film.enter, fullscreen);
    const { state } = film;
    const { ghost } = drag;
    return (
      <LessonStage
        look={look}
        shot={state.shot}
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
        keyboard={keyboard}
        controls={controls}
        onEnter={onEnter}
        onActivate={drag.activate}
      >
        <Scene state={state} handling={drag.handling} />
      </LessonStage>
    );
  };
}
