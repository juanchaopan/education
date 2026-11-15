import { Loading } from '../../../shared/ui/Loading';
import styles from './SessionWaiting.module.css';

// What a page shows while it asks who is signed in: the dots in the middle of
// the screen, where the page is about to appear, and what is being opened for
// screen readers.
export function SessionWaiting({ label }: { label: string }) {
  return (
    <div className={styles.waiting}>
      <Loading label={label} />
    </div>
  );
}
