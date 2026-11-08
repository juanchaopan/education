import type { ReactNode } from 'react';
import styles from './Hint.module.css';

// A short line of secondary detail, such as what a field accepts or what a
// button will change.
export function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className={styles.hint}>
      {children}
    </p>
  );
}
