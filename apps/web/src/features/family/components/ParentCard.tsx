import type { ReactNode } from 'react';
import { Card } from '../../../shared/ui/Card';
import { Icon } from '../../../shared/ui/Icon';
import type { IconName } from '../../../shared/ui/icons';
import styles from './ParentCard.module.css';

type Props = {
  titleId: string;
  icon: IconName;
  title: string;
  // A control at the end of the title row, such as a round "+" or a text
  // button that reads the card's state again.
  action?: ReactNode;
  // A card whose action cannot be undone is edged and titled in the danger
  // colour, so it stands apart from every other card.
  tone?: 'danger';
  children: ReactNode;
};

// A card of the parent space: an icon and a title, the action that goes
// with them, then the card's content.
export function ParentCard({ titleId, icon, title, action, tone, children }: Props) {
  return (
    <Card aria-labelledby={titleId} tone={tone} className={styles.card}>
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
