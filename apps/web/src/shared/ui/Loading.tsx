import { Spoken } from './Spoken';
import styles from './Loading.module.css';

// Three bouncing dots, as tall as the text around them, which say nothing to
// screen readers; whatever holds them says what is on its way.
export function Dots() {
  return (
    <span className={styles.dots} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

// Three bouncing dots show that something is on its way. What is being
// opened is said only to screen readers, as a status announced without
// moving focus.
export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className={styles.loading}>
      <Dots />
      <Spoken>{label}</Spoken>
    </p>
  );
}
