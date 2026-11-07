import type { NarrationStatus } from '../interaction/narration';
import { LessonButton as Button } from './LessonButton';
import panel from './LessonPanel.module.css';
import styles from './NarrationCaption.module.css';

type Props = {
  text: string;
  status: NarrationStatus;
  onReplay: () => void;
  onPause: () => void;
  onResume: () => void;
};

function Actions({ status, onReplay, onPause, onResume }: Omit<Props, 'text'>) {
  switch (status) {
    case 'silent':
      return null;
    case 'playing':
      return (
        <>
          <Button label="暂停" onClick={onPause} />
          <Button label="从头听" onClick={onReplay} />
        </>
      );
    case 'paused':
      return (
        <>
          <Button label="继续" onClick={onResume} />
          <Button label="从头听" onClick={onReplay} />
        </>
      );
    default:
      return <Button label="再听一遍" onClick={onReplay} />;
  }
}

// The words of the current cue stay on screen whether or not any sound plays,
// so a child who cannot hear it still has the same instruction.
export function NarrationCaption({ text, ...controls }: Props) {
  return (
    <section className={panel.panel} aria-label="这一步要做什么">
      <p className={styles.caption} aria-live="polite">
        {text}
      </p>
      {controls.status === 'failed' && (
        <p role="status" className={panel.message}>
          声音没有放出来，看上面的字也可以。
        </p>
      )}
      <div className={panel.actions}>
        <Actions {...controls} />
      </div>
    </section>
  );
}
