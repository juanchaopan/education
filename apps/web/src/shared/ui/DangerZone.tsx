import type { ReactNode } from 'react';
import styles from './DangerZone.module.css';

// The last step of something that cannot be undone, such as a new PIN that
// signs a child out everywhere: tinted and edged in the danger colour, apart
// from the ordinary steps around it. Its button is the danger button.
export function DangerZone({ children }: { children: ReactNode }) {
  return <div className={styles.zone}>{children}</div>;
}
