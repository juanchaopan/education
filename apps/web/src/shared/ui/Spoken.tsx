import type { ReactNode } from 'react';
import styles from './Spoken.module.css';

// Words for screen readers only, where the page shows the same thing without
// words: dots that hop while something loads, bars that move with a voice, a
// name a picture already makes plain.
export function Spoken({ children }: { children: ReactNode }) {
  return <span className={styles.spoken}>{children}</span>;
}
