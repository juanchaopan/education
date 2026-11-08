import type { ReactNode } from 'react';
import styles from './Actions.module.css';

// A row of buttons for one step, wrapping onto the next line when it runs out
// of room.
export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
