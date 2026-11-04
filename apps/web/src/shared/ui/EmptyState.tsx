import styles from './EmptyState.module.css';

type Props = {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};
export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className={styles.empty} role="status">
      <span aria-hidden="true" className={styles.icon}>
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
