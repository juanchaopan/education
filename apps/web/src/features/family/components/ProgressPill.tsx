import { finished } from '../../../shared/lib/book-progress';
import { Icon } from '../../../shared/ui/Icon';
import styles from './ProgressPill.module.css';

type Props = { done: number; total: number; unavailable?: boolean };

// How far a child has come in a book, at the end of a row: "n / m", or a
// green 学完 with a tick once every problem is done. A book that is
// unavailable says so instead.
export function ProgressPill({ done, total, unavailable }: Props) {
  if (unavailable)
    return (
      <span className={styles.pill} data-unavailable>
        暂时不可用
      </span>
    );
  return finished(done, total) ? (
    <span className={styles.pill} data-finished>
      <Icon name="check" className={styles.tick} />
      学完
    </span>
  ) : (
    <span className={styles.pill}>
      {done} / {total}
    </span>
  );
}
