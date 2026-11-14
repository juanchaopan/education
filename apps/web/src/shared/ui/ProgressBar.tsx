import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import styles from './ProgressBar.module.css';

type Props = {
  done: number;
  total: number;
  // A book that cannot be opened now shows its progress greyed, and says so.
  unavailable?: boolean;
};

// How far a child is through a book: a raised strip in a trough pressed into
// the card, with "5 / 12" beside it. A finished book's strip is green and
// says 学完 with a tick; an unavailable one is grey and says 暂时不可用.
export function ProgressBar({ done, total, unavailable }: Props) {
  const finished = !unavailable && total > 0 && done === total;
  const share = total > 0 ? Math.min(done / total, 1) : 0;
  const state = unavailable ? 'off' : finished ? 'finished' : 'going';
  return (
    <div className={styles.bar} data-state={state}>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ '--share': share } as CSSProperties} />
      </span>
      <span className={styles.label}>
        {unavailable ? (
          '暂时不可用'
        ) : finished ? (
          <>
            <Icon name="check" />
            学完
          </>
        ) : (
          `${done} / ${total}`
        )}
      </span>
    </div>
  );
}
