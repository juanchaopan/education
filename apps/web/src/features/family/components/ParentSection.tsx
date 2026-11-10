import type { ReactNode } from 'react';
import styles from './ParentSection.module.css';

type Props = {
  titleId: string;
  title: string;
  // What the section offers at its top, beside the title, such as inviting
  // a child.
  actions?: ReactNode;
  children: ReactNode;
};

// One part of the parent space: its title under the space's name, the
// actions it leads with, and its cards.
export function ParentSection({ titleId, title, actions, children }: Props) {
  return (
    <section aria-labelledby={titleId}>
      <header className={styles.header}>
        <div>
          <p className={styles.space}>家长空间</p>
          <h1 id={titleId} className={styles.title}>
            {title}
          </h1>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={styles.cards}>{children}</div>
    </section>
  );
}
