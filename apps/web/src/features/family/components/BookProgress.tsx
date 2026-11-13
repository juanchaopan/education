import { finished } from '../../../shared/lib/book-progress';
import { Icon } from '../../../shared/ui/Icon';
import styles from './BookProgress.module.css';

type Props = { done: number; total: number };

// How far a child has come in a book, at the end of a row: "n / m" above a
// thin bar filled as far, or a green 学完 with a tick and a full bar once
// every problem is done.
export function BookProgress({ done, total }: Props) {
  const complete = finished(done, total);
  return (
    <span className={styles.progress} data-finished={complete || undefined}>
      <span className={styles.count}>
        {complete ? (
          <>
            <Icon name="check" className={styles.tick} />
            学完
          </>
        ) : (
          `${done} / ${total}`
        )}
      </span>
      <span className={styles.bar} aria-hidden="true">
        <span
          className={styles.fill}
          style={{ inlineSize: `${total ? (Math.min(done, total) / total) * 100 : 0}%` }}
        />
      </span>
    </span>
  );
}
