import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './icons';
import styles from './EmptyState.module.css';

type Props = {
  icon: IconName;
  title: string;
  description?: string;
  // The title's heading level: a part of a page by default, or 1 when the
  // message is the whole page, such as a path that leads nowhere.
  headingLevel?: 1 | 3;
  actionLabel?: string;
  onAction?: () => void;
};

// The action belongs to the message, such as trying again, so it keeps the
// weight of the text around it.
export function EmptyState({
  icon,
  title,
  description,
  headingLevel = 3,
  actionLabel,
  onAction,
}: Props) {
  const Heading = headingLevel === 1 ? 'h1' : 'h3';
  return (
    <div className={styles.empty} role="status">
      <Icon name={icon} className={styles.icon} />
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {actionLabel && onAction && (
        <Button weight="regular" className={styles.action} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
