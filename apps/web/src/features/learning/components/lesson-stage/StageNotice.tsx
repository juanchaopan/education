import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '../../../../shared/lib/class-names';
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
// choice.
export function StageNotice({ icon, text, label, children }: Props) {
  return (
    <aside className={styles.notice} aria-label={label}>
      <Icon name={icon} className={styles.icon} />
      <p role="status">{text}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </aside>
  );
}

// The step a notice is for, in gold, or a quieter one in clear glass. Like
// every part laid into the picture, they keep the same colours by day and by
// night.
export function NoticeButton({
  quiet = false,
  ...button
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'className'> & { quiet?: boolean }) {
  return (
    <button
      {...button}
      type="button"
      className={classNames(styles.action, quiet && styles.quiet)}
    />
  );
}
