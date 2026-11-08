import type { ReactNode } from 'react';
import styles from './Notice.module.css';

export type NoticeTone = 'info' | 'success' | 'error';

type Props = {
  tone?: NoticeTone;
  // A paragraph by default; a block holds several paragraphs or a heading.
  as?: 'p' | 'div';
  // A notice that changes after the page is shown is announced: an error
  // interrupts, anything else waits its turn. A notice that is part of the
  // page from the start is not live, so it is read in order with the rest.
  live?: boolean;
  children: ReactNode;
};

export function Notice({ tone = 'info', as: Element = 'p', live = true, children }: Props) {
  const role = live ? (tone === 'error' ? 'alert' : 'status') : undefined;
  return (
    <Element role={role} data-tone={tone} className={styles.notice}>
      {children}
    </Element>
  );
}
