import type { ReactNode } from 'react';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { useMediaQuery } from '../../../shared/lib/useMediaQuery';
import { GardenStage } from '../components/garden-balance/GardenStage';
import type { LearningScope } from '../data-access/learning-request';
import { useLessonDraft } from '../data-access/useLessonDraft';
import { savesProgress } from '../lessons/garden-balance/garden-story';
import { gardenBalance, isShot, type Shot } from '../lessons/garden-balance/script';
import { useGardenDrag } from '../lessons/garden-balance/useGardenDrag';
import { useGardenStory, type GardenStory } from '../lessons/garden-balance/useGardenStory';
import { GardenPanels } from './GardenPanels';
import styles from './GardenBalanceLesson.module.css';

type FilmProps = {
  resume?: Shot;
  onArrive?: (shot: Shot) => void;
  panels: (story: GardenStory) => ReactNode;
};

function GardenFilm({ resume, onArrive, panels }: FilmProps) {
  const story = useGardenStory(onArrive);
  const drag = useGardenDrag(story);
  const narrow = useMediaQuery('(max-width: 610px)');
  const opening = story.state.shot === 'opening';
  return (
    <div className={styles.lesson}>
      <GardenStage
        state={story.state}
        handling={drag.handling}
        ghost={drag.ghost}
        caption={opening ? undefined : story.caption}
        speaking={story.speaking}
        narrow={narrow}
        entryLabel={resume ? '接着上次的地方' : '开始短片'}
        worldRef={drag.world}
        onEnter={() => story.enter(resume)}
        onReplay={story.replay}
        onActivate={drag.activate}
      />
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

function SignInNotice() {
  return (
    <p className={styles.notice}>
      在孩子空间登录以后，小兔会帮你记住做到哪里，还能回答你的问题、听你说答案。
      <StandaloneLink to="/child">去孩子空间登录</StandaloneLink>
    </p>
  );
}

// 菜园天平：一棵青菜和几根黄瓜一样重。Anyone can watch and play the scenes;
// saving, questions and the answer need a signed-in child.
export function GardenBalanceLesson({ csrf }: { csrf?: string }) {
  if (!csrf) return <GardenFilm panels={() => <SignInNotice />} />;
  return <SignedInGarden scope={{ ...gardenBalance, csrf }} />;
}
