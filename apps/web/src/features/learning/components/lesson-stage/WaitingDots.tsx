import { Spoken } from './Spoken';
import styles from './WaitingDots.module.css';

// Three gold dots that rise in turn while something is on its way: words
// being heard, a reply being thought out, an answer being judged. What it
// waits for is said in words to screen readers only.
export function WaitingDots({ label }: { label?: string }) {
  return (
    <span className={styles.dots}>
      <i />
      <i />
      <i />
      {label && <Spoken>{label}</Spoken>}
    </span>
  );
}
