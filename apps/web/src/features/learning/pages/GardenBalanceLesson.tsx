import type { ReactNode } from 'react';
import { useMediaQuery } from '../../../shared/lib/useMediaQuery';
import { CarriedPart, Fireflies } from '../components/garden-balance/garden-art';
import { GardenDefs } from '../components/garden-balance/garden-defs';
import { GardenScene } from '../components/garden-balance/garden-scenes';
import { LessonStage } from '../components/lesson-stage/LessonStage';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonDraft } from '../data-access/useLessonDraft';
import { useLessonRecordings } from '../data-access/useLessonRecordings';
import { useLessonFilm } from '../interaction/useLessonFilm';
import { useStageDrag } from '../interaction/useStageDrag';
import { gardenLook } from '../lessons/garden-balance/garden-look';
import { gardenProps } from '../lessons/garden-balance/garden-props';
import { gardenStory, savesProgress } from '../lessons/garden-balance/garden-story';
import { gardenBalance, isShot, teacher, type Shot } from '../lessons/garden-balance/script';
import { GardenPanels, type GardenFilm } from './GardenPanels';
import { LessonSignInNotice } from './LessonSignInNotice';
import styles from './GardenBalanceLesson.module.css';

// Where the film starts: a saved scene to resume, or, while the child's saved
// place is still being looked up, nowhere yet, so a quick tap cannot start
// over and overwrite it.
type Start = { resume?: Shot; finding?: boolean };
type Recordings = ReturnType<typeof useLessonRecordings>;

// The title card's button: it starts the film once the saved place is known
// and every recording has arrived, and fetches the recordings again when they
// did not all arrive.
function entry(film: GardenFilm, recordings: Recordings, { resume, finding }: Start) {
  if (finding) return { label: '正在找上次的地方…' };
  if (recordings.preparation === 'preparing') return { label: '正在准备声音…' };
  if (recordings.preparation === 'failed')
    return { label: '声音没下载好，点这里再试', onEnter: recordings.retry };
  return {
    label: resume ? '接着上次的地方' : '开始短片',
    onEnter: () => film.enter(resume),
  };
}

// The garden's paints and fireflies never change while the film plays.
const defs = <GardenDefs />;
const fireflies = <Fireflies />;

type ScreenProps = { film: GardenFilm; recordings: Recordings; start: Start };

// The film and the props the child moves. A drag changes only this part of the
// page, never the panels beneath it.
function GardenScreen({ film, recordings, start }: ScreenProps) {
  const drag = useStageDrag(film, gardenProps);
  const narrow = useMediaQuery('(max-width: 610px)');
  const { label, onEnter } = entry(film, recordings, start);
  const { state } = film;
  return (
    <LessonStage
      look={gardenLook}
      shot={state.shot}
      caption={state.shot === 'opening' ? undefined : film.caption}
      speaking={film.speaking}
      failure={film.failure}
      narrow={narrow}
      entryLabel={label}
      worldRef={drag.world}
      defs={defs}
      ambience={fireflies}
      ghost={drag.ghost && <CarriedPart ghost={drag.ghost} />}
      onEnter={onEnter}
      onReplay={film.replay}
      onActivate={drag.activate}
    >
      <GardenScene state={state} handling={drag.handling} />
    </LessonStage>
  );
}

type LessonBodyProps = {
  start?: Start;
  onArrive?: (shot: Shot) => void;
  panels: (film: GardenFilm) => ReactNode;
};

// The playing film with whatever goes beneath it, its recordings fetched as
// the page opens.
function GardenLessonBody({ start = {}, onArrive, panels }: LessonBodyProps) {
  const recordings = useLessonRecordings(gardenStory.lines);
  const film = useLessonFilm(gardenStory, { onArrive });
  return (
    <div className={styles.lesson}>
      <GardenScreen film={film} recordings={recordings} start={start} />
      {panels(film)}
    </div>
  );
}

const first = { stepId: 'leaves', drawing: [] };

// A signed-in child's lesson: each scene reached before the answer is saved,
// so coming back resumes at its start, and the answer, the questions and the
// draft all belong to this child.
function SignedInGarden({ scope }: { scope: LearningScope }) {
  const draft = useLessonDraft(scope, first);
  const saved = draft.status === 'saved' ? draft.content.stepId : undefined;
  const resume = saved && isShot(saved) && saved !== 'leaves' ? saved : undefined;
  return (
    <GardenLessonBody
      start={{ resume, finding: draft.status === 'loading' }}
      onArrive={(shot) => {
        if (savesProgress(shot)) void draft.saveAs({ stepId: shot, drawing: [] });
      }}
      panels={(film) => <GardenPanels scope={scope} film={film} draft={draft} />}
    />
  );
}

// 菜园天平：一棵青菜和几根黄瓜一样重。Anyone can watch and play the scenes;
// saving, questions and the answer need a signed-in child.
export function GardenBalanceLesson({ csrf }: { csrf?: string }) {
  if (!csrf) return <GardenLessonBody panels={() => <LessonSignInNotice teacher={teacher} />} />;
  return <SignedInGarden scope={{ ...gardenBalance, csrf }} />;
}
