import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './MoreInfo.module.css';

type Props = {
  // A few words on what the detail is about, shown beside the "?".
  label: string;
  children: ReactNode;
};

// Detail that only some people need, such as how long a link lasts or how
// retries work, folded behind a "?" so the page shows only what a decision
// needs. It is a native disclosure, so a keyboard and a screen reader open it
// like any other.
export function MoreInfo({ label, children }: Props) {
  return (
    <details className={styles.more}>
      <summary className={styles.summary}>
        <Icon name="help" className={styles.icon} />
        {label}
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
