import type { ReactNode } from 'react';
import { useMediaQuery } from '../../../shared/lib/useMediaQuery';
import { GardenStage } from '../components/garden-balance/GardenStage';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonDraft } from '../data-access/useLessonDraft';
import { savesProgress } from '../lessons/garden-balance/garden-story';
import { gardenBalance, isShot, teacher, type Shot } from '../lessons/garden-balance/script';
import { useGardenDrag } from '../lessons/garden-balance/useGardenDrag';
import { useGardenStory, type GardenStory } from '../lessons/garden-balance/useGardenStory';
import { GardenPanels } from './GardenPanels';
import { LessonSignInNotice } from './LessonSignInNotice';
import styles from './GardenBalanceLesson.module.css';

// The film and the props the child moves. A drag changes only this part of the
// page, never the panels beneath it.
function GardenScreen({ story, resume }: { story: GardenStory; resume?: Shot }) {
  const drag = useGardenDrag(story);
  const narrow = useMediaQuery('(max-width: 610px)');
  return (
    <GardenStage
      state={story.state}
      handling={drag.handling}
      ghost={drag.ghost}
      caption={story.state.shot === 'opening' ? undefined : story.caption}
      speaking={story.speaking}
      narrow={narrow}
      entryLabel={resume ? '接着上次的地方' : '开始短片'}
      worldRef={drag.world}
      onEnter={() => story.enter(resume)}
      onReplay={story.replay}
      onActivate={drag.activate}
    />
  );
}

type FilmProps = {
  resume?: Shot;
  onArrive?: (shot: Shot) => void;
  panels: (story: GardenStory) => ReactNode;
};

function GardenFilm({ resume, onArrive, panels }: FilmProps) {
  const story = useGardenStory(onArrive);
  return (
    <div className={styles.lesson}>
      <GardenScreen story={story} resume={resume} />
      {panels(story)}
    </div>
  );
}

const start = { stepId: 'leaves', drawing: [] };

// A signed-in child's lesson: each scene reached before the answer is saved,
// so coming back resumes at its start, and the answer, the questions and the
// draft all belong to this child.
function SignedInGarden({ scope }: { scope: LearningScope }) {
  const draft = useLessonDraft(scope, start);
  const saved = draft.status === 'saved' ? draft.content.stepId : undefined;
  const resume = saved && isShot(saved) && saved !== 'leaves' ? saved : undefined;
  return (
    <GardenFilm
      resume={resume}
      onArrive={(shot) => {
        if (savesProgress(shot)) void draft.saveAs({ stepId: shot, drawing: [] });
      }}
      panels={(story) => <GardenPanels scope={scope} story={story} draft={draft} />}
    />
  );
}

// 菜园天平：一棵青菜和几根黄瓜一样重。Anyone can watch and play the scenes;
// saving, questions and the answer need a signed-in child.
export function GardenBalanceLesson({ csrf }: { csrf?: string }) {
  if (!csrf) return <GardenFilm panels={() => <LessonSignInNotice teacher={teacher} />} />;
  return <SignedInGarden scope={{ ...gardenBalance, csrf }} />;
}
