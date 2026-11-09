import type { ReactNode } from 'react';
import styles from './StoryFrame.module.css';

// The stage fills whatever frame the lesson page gives it. In the stories it
// gets a frame of the shape it most often has: a wide screen, or a phone held
// upright, which sees the middle of the world.
export function StoryFrame({
  upright = false,
  children,
}: {
  upright?: boolean;
  children: ReactNode;
}) {
  return <div className={upright ? styles.upright : styles.wide}>{children}</div>;
}
