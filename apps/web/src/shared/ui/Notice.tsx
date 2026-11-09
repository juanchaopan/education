import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import styles from './Notice.module.css';

export type NoticeTone = 'info' | 'success' | 'error';

const toneIcons: Record<NoticeTone, IconName> = { info: 'info', success: 'check', error: 'alert' };

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

// An icon for the tone, then the message; the words carry the meaning, so
// the tone never rests on the colour or the icon alone.
export function Notice({ tone = 'info', as: Element = 'p', live = true, children }: Props) {
  const role = live ? (tone === 'error' ? 'alert' : 'status') : undefined;
  const Body = Element === 'p' ? 'span' : 'div';
  return (
    <Element role={role} data-tone={tone} className={styles.notice}>
      <Icon name={toneIcons[tone]} className={styles.icon} />
      <Body className={styles.body}>{children}</Body>
    </Element>
  );
}
