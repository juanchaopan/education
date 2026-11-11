import type { ReactNode } from 'react';
import { storyLook } from './story-look';
import styles from './StoryPainting.module.css';

// The stories of the parts laid into a stage show each part on the stories'
// own dusk painting, the way it sits on a lesson's backdrop.
export function StoryPainting({ children }: { children: ReactNode }) {
  return (
    <div
      className={styles.painting}
      style={{ backgroundImage: `url("${storyLook.backdrop.image}")` }}
    >
      {children}
    </div>
  );
}
