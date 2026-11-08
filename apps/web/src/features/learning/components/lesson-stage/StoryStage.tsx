import type { ReactNode } from 'react';
import { LessonStage } from './LessonStage';
import { storyLook } from './story-look';

// The stories of the parts drawn on a lesson stage show each part on the
// stories' own stage, in its palette, without a caption over the scene.
export function StoryStage({ children }: { children: ReactNode }) {
  return (
    <LessonStage
      look={storyLook}
      shot="first"
      speaking={false}
      narrow={false}
      entryLabel="开始短片"
      onReplay={() => {}}
      onActivate={() => {}}
    >
      {children}
    </LessonStage>
  );
}
