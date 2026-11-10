import type { ReactNode } from 'react';
import styles from './StatusBadge.module.css';

type Props = {
  // ok for a state that is settled, such as verified or granted; wait for
  // one that still needs the parent, such as an address to verify.
  tone: 'ok' | 'wait';
  // A state that can change while the page is open, such as a KEY or a
  // consent, is announced to screen readers when it does.
  live?: boolean;
  children: ReactNode;
};

// A small pill that says where something stands. The words carry the
// meaning; the tint only echoes them.
export function StatusBadge({ tone, live, children }: Props) {
  return (
    <span role={live ? 'status' : undefined} className={styles.badge} data-tone={tone}>
      {children}
    </span>
  );
}
