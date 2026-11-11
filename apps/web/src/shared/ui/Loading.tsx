import { Spoken } from './Spoken';
import styles from './Loading.module.css';

// Three bouncing dots show that something is on its way. What is being
// opened is said only to screen readers, as a status announced without
// moving focus.
export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className={styles.loading}>
      <span className={styles.dots} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <Spoken>{label}</Spoken>
    </p>
  );
}
