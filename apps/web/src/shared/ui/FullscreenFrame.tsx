import type { ReactNode } from 'react';
import { Dewdrop } from './Dewdrop';
import styles from './FullscreenFrame.module.css';

type Props = {
  // The page is waiting for something to finish before it leaves.
  waiting: boolean;
  onBack: () => void;
  // What stays beside the back button the whole time, such as the mark of a
  // preview.
  mark?: ReactNode;
  children: ReactNode;
};

const waitingNote = '正在保存，好了就返回';

// A page that fills the screen without the site's header: whatever it shows
// fills the frame, clear of a phone's notch and rounded corners, under a glass
// back button fixed in the top left, which is also the first thing the
// keyboard reaches, with the page's mark beside it. While the page waits to
// leave, the button says so below it.
export function FullscreenFrame({ waiting, onBack, mark, children }: Props) {
  return (
    <main className={styles.frame}>
      <div className={styles.back}>
        <div className={styles.row}>
          <Dewdrop
            icon="back"
            label={waiting ? waitingNote : '返回'}
            aria-busy={waiting || undefined}
            onClick={onBack}
          />
          {mark}
        </div>
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
