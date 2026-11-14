import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../../../shared/ui/Icon';
import styles from './ChildHomeLayout.module.css';

// The pictures of the child's home: a backdrop for the day and one for the
// night, and the teaching character peeking over the books.
export type ChildHomeArt = { day: string; night: string; teacher: string };

type Props = {
  art: ChildHomeArt;
  topBar: ReactNode;
  children: ReactNode;
};

// The child's home: a low lit picture across the top with the top bar laid
// over it, and the 我的书 card pressed onto its lower edge, so the books start
// near the top of the screen. The character stands behind the card, only its
// head and shoulders above the edge. The theme picks the day or the night
// picture, and only that one is fetched. The pictures are decoration.
export function ChildHomeLayout({ art, topBar, children }: Props) {
  const pictures = {
    '--day-picture': `url("${art.day}")`,
    '--night-picture': `url("${art.night}")`,
  } as CSSProperties;
  return (
    <div className={styles.home}>
      <div className={styles.band} style={pictures} aria-hidden="true" />
      {topBar}
      <div className={styles.shelf}>
        <img className={styles.peek} src={art.teacher} alt="" />
        <section className={styles.panel} aria-labelledby="my-books-title">
          <h1 id="my-books-title" className={styles.title}>
            <Icon name="library" className={styles.titleIcon} />
            我的书
          </h1>
          {children}
        </section>
      </div>
    </div>
  );
}
