import type { ReactNode } from 'react';
import styles from './Spoken.module.css';

// Words for screen readers only: the stage shows the same thing as a drawing,
// such as dots that rise or bars that move with a voice.
export function Spoken({ children }: { children: ReactNode }) {
  return <span className={styles.spoken}>{children}</span>;
}
