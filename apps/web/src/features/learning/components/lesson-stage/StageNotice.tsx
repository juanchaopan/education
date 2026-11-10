import type { ReactNode } from 'react';
import { Icon } from '../../../../shared/ui/Icon';
import type { IconName } from '../../../../shared/ui/icons';
import styles from './StageNotice.module.css';

type Props = {
  icon: IconName;
  // One sentence about what happened, or what the child can do.
  text: string;
  // What is said to screen readers about the notice as a whole.
  label: string;
  // The buttons that act on it.
  children?: ReactNode;
};

// A notice laid into the stage on a pane of smoked glass, the way a toast
// slides over a page: an icon, a sentence, and a button or two. It tells the
// child about things outside the lesson itself, such as a draft that needs a
// choice or the saving that signing in brings.
export function StageNotice({ icon, text, label, children }: Props) {
  return (
    <aside className={styles.notice} aria-label={label}>
      <Icon name={icon} className={styles.icon} />
      <p role="status">{text}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </aside>
  );
}
