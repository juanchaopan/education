import { Icon } from '../../../shared/ui/Icon';
import type { IconName } from '../../../shared/ui/icons';
import styles from './ProblemRows.module.css';

export type ProblemRow = {
  key: string;
  title: string;
  // Whose problem it is and what happened, in a few words.
  detail: string;
};

// Problems in rows: an icon tile for the kind of list, then the title and a
// short detail.
export function ProblemRows({ icon, rows }: { icon: IconName; rows: readonly ProblemRow[] }) {
  return (
    <ul className={styles.rows}>
      {rows.map((row) => (
        <li key={row.key} className={styles.row}>
          <span className={styles.tile} aria-hidden="true">
            <Icon name={icon} />
          </span>
          <span className={styles.text}>
            <span className={styles.title}>{row.title}</span>
            <span className={styles.detail}>{row.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
