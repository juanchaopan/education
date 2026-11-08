import type { ReactNode } from 'react';
import { useMediaQuery } from '../../../shared/lib/useMediaQuery';
import { GardenStage } from '../components/garden-balance/GardenStage';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonDraft } from '../data-access/useLessonDraft';
import { useLessonFilm } from '../interaction/useLessonFilm';
import {
  gardenStory,
  savesProgress,
  type GardenFilm,
} from '../lessons/garden-balance/garden-story';
import { gardenBalance, isShot, teacher, type Shot } from '../lessons/garden-balance/script';
import { useGardenDrag } from '../lessons/garden-balance/useGardenDrag';
import { GardenPanels } from './GardenPanels';
import { LessonSignInNotice } from './LessonSignInNotice';
import styles from './GardenBalanceLesson.module.css';

// Where the film starts: a saved scene to resume, or, while the child's saved
// place is still being looked up, nowhere yet, so a quick tap cannot start
// over and overwrite it.
type Start = { resume?: Shot; finding?: boolean };

function entryLabel({ resume, finding }: Start) {
  if (finding) return '正在找上次的地方…';
  return resume ? '接着上次的地方' : '开始短片';
}

// The film and the props the child moves. A drag changes only this part of the
// page, never the panels beneath it.
function GardenScreen({ film, start }: { film: GardenFilm; start: Start }) {
  const drag = useGardenDrag(film);
  const narrow = useMediaQuery('(max-width: 610px)');
  return (
    <GardenStage
      state={film.state}
      handling={drag.handling}
      ghost={drag.ghost}
      caption={film.state.shot === 'opening' ? undefined : film.caption}
      speaking={film.speaking}
      narrow={narrow}
      entryLabel={entryLabel(start)}
      worldRef={drag.world}
      onEnter={start.finding ? undefined : () => film.enter(start.resume)}
      onReplay={film.replay}
      onActivate={drag.activate}
    />
  );
}

type PlayProps = {
  start?: Start;
  onArrive?: (shot: Shot) => void;
  panels: (film: GardenFilm) => ReactNode;
};

function GardenPlay({ start = {}, onArrive, panels }: PlayProps) {
  const film = useLessonFilm(gardenStory, { onArrive });
  return (
    <div className={styles.lesson}>
      <GardenScreen film={film} start={start} />
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
    <GardenPlay
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
  if (!csrf) return <GardenPlay panels={() => <LessonSignInNotice teacher={teacher} />} />;
  return <SignedInGarden scope={{ ...gardenBalance, csrf }} />;
}
