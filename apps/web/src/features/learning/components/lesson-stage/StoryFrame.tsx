import type { ReactNode } from 'react';
import styles from './StoryFrame.module.css';

// The shapes of frame a lesson page gives the stage: a wide screen, a tablet
// held upright, and a phone held upright.
export type FrameShape = 'wide' | 'upright' | 'phone';

// The stage fills whatever frame the lesson page gives it. In the stories it
// gets a frame of one of the shapes it most often has.
export function StoryFrame({
  shape = 'wide',
  children,
}: {
  shape?: FrameShape;
  children: ReactNode;
}) {
  return <div className={styles[shape]}>{children}</div>;
}
