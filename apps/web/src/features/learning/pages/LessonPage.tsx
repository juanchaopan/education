import { useMemo, type ReactNode } from 'react';
import { useMediaQuery } from '../../../shared/lib/useMediaQuery';
import { LessonStage } from '../components/lesson-stage/LessonStage';
import { DragGhost } from '../components/lesson-stage/Prop';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonDraft } from '../data-access/useLessonDraft';
import { useLessonRecordings } from '../data-access/useLessonRecordings';
import { useLessonFilm } from '../interaction/useLessonFilm';
import { useStageDrag } from '../interaction/useStageDrag';
import { filmStory, resumes, stageLook, type Lesson } from '../lessons/lesson-definition';
import { LessonPanels, type PlayingLesson } from './LessonPanels';
import { LessonSignInNotice } from './LessonSignInNotice';
import styles from './LessonPage.module.css';

// Where the film starts: a saved scene to resume, or, while the child's saved
// place is still being looked up, nowhere yet, so a quick tap cannot start
// over and overwrite it.
type Start = { resume?: string; finding?: boolean };
type Recordings = ReturnType<typeof useLessonRecordings>;

// The title card's button: it starts the film once the saved place is known
// and every recording has arrived, and fetches the recordings again when they
// did not all arrive.
function entry(film: PlayingLesson, recordings: Recordings, { resume, finding }: Start) {
  if (finding) return { label: '正在找上次的地方…' };
  if (recordings.preparation === 'preparing') return { label: '正在准备声音…' };
  if (recordings.preparation === 'failed')
    return { label: '声音没下载好，点这里再试', onEnter: recordings.retry };
  return {
    label: resume ? '接着上次的地方' : '开始短片',
    onEnter: () => film.enter(resume),
  };
}

type ScreenProps = { lesson: Lesson; film: PlayingLesson; recordings: Recordings; start: Start };

// The film and the props the child moves. A drag changes only this part of the
// page, never the panels beneath it.
function LessonScreen({ lesson, film, recordings, start }: ScreenProps) {
  const drag = useStageDrag(film, lesson.props);
  const narrow = useMediaQuery('(max-width: 610px)');
  const look = useMemo(() => stageLook(lesson), [lesson]);
  const { label, onEnter } = entry(film, recordings, start);
  const { state } = film;
  const { ghost } = drag;
  const { Scene } = lesson;
  return (
    <LessonStage
      look={look}
      shot={state.shot}
      caption={state.shot === 'opening' ? undefined : film.caption}
      speaking={film.speaking}
      failure={film.failure}
      narrow={narrow}
      entryLabel={label}
      worldRef={drag.world}
      defs={lesson.defs}
      ambience={lesson.ambience}
      ghost={
        ghost && (
          <DragGhost x={ghost.x} y={ghost.y}>
            {lesson.props.carried(ghost)}
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

type LessonBodyProps = {
  lesson: Lesson;
  start?: Start;
  onArrive?: (shot: string) => void;
  panels: (film: PlayingLesson) => ReactNode;
};

// The playing film with whatever goes beneath it, its recordings fetched as
// the page opens.
function LessonBody({ lesson, start = {}, onArrive, panels }: LessonBodyProps) {
  const recordings = useLessonRecordings(lesson.script.lines);
  const story = useMemo(() => filmStory(lesson), [lesson]);
  const film = useLessonFilm(story, { onArrive });
  return (
    <div className={styles.lesson}>
      <LessonScreen lesson={lesson} film={film} recordings={recordings} start={start} />
      {panels(film)}
    </div>
  );
}

type SignedInProps = { lesson: Lesson; scope: LearningScope };

// A signed-in child's lesson: each scene reached that is work in progress is
// saved, so coming back resumes at its start, and the answer, the questions
// and the draft all belong to this child.
function SignedInLesson({ lesson, scope }: SignedInProps) {
  const first = useMemo(() => ({ stepId: lesson.script.shots[0], drawing: [] }), [lesson]);
  const draft = useLessonDraft(scope, first);
  const saved = draft.status === 'saved' ? draft.content.stepId : undefined;
  const resume = saved !== undefined && resumes(lesson, saved) ? saved : undefined;
  return (
    <LessonBody
      lesson={lesson}
      start={{ resume, finding: draft.status === 'loading' }}
      onArrive={(shot) => {
        if (lesson.story.savesProgress(shot)) void draft.saveAs({ stepId: shot, drawing: [] });
      }}
      panels={(film) => <LessonPanels lesson={lesson} scope={scope} film={film} draft={draft} />}
    />
  );
}

// Any problem's lesson, from its definition. Anyone can watch and play the
// scenes; saving, questions and the answer need a signed-in child.
export function LessonPage({ lesson, csrf }: { lesson: Lesson; csrf?: string }) {
  if (!csrf)
    return (
      <LessonBody
        lesson={lesson}
        panels={() => <LessonSignInNotice teacher={lesson.teacher.name} />}
      />
    );
  return <SignedInLesson lesson={lesson} scope={{ ...lesson.problem, csrf }} />;
}
