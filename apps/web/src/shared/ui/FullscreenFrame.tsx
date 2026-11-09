import type { ReactNode } from 'react';
import { IconButton } from './IconButton';
import styles from './FullscreenFrame.module.css';

type Props = {
  // The page is waiting for something to finish before it leaves.
  waiting: boolean;
  onBack: () => void;
  children: ReactNode;
};

const waitingNote = '正在保存，好了就返回';

// A page that fills the screen without the site's header: whatever it shows
// fills the frame, clear of a phone's notch and rounded corners, under a back
// button fixed in the top left, which is also the first thing the keyboard
// reaches. While the page waits to leave, the button says so beside it. The
// frame tells what it holds, as `--frame-corner`, how far in from the edge
// the button reaches, so nothing else is drawn under it.
export function FullscreenFrame({ waiting, onBack, children }: Props) {
  return (
    <main className={styles.frame}>
      <div className={styles.back}>
        <IconButton
          icon="back"
          glass
          label={waiting ? waitingNote : '返回'}
          aria-busy={waiting || undefined}
          onClick={onBack}
        />
        {waiting && (
          <span className={styles.note} aria-hidden="true">
            {waitingNote}
          </span>
        )}
      </div>
      <div className={styles.content}>{children}</div>
    </main>
  );
}
