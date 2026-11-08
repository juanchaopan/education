import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './icons';
import styles from './EmptyState.module.css';

type Props = {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

// The action belongs to the message, such as trying again, so it keeps the
// weight of the text around it.
export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className={styles.empty} role="status">
      <Icon name={icon} className={styles.icon} />
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <Button weight="regular" className={styles.action} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
