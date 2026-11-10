import type { ReactNode } from 'react';
import { Card } from '../../../shared/ui/Card';
import { Icon } from '../../../shared/ui/Icon';
import type { IconName } from '../../../shared/ui/icons';
import styles from './ParentCard.module.css';

type Props = {
  titleId: string;
  icon: IconName;
  title: string;
  // One round control at the right of the title, such as a "+".
  action?: ReactNode;
  children: ReactNode;
};

// A card of the parent space: an icon and a title, the action that goes
// with them, then the card's content.
export function ParentCard({ titleId, icon, title, action, children }: Props) {
  return (
    <Card aria-labelledby={titleId} className={styles.card}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          <Icon name={icon} className={styles.icon} />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}
