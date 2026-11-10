import type { ReactNode } from 'react';
import { Card } from '../../../shared/ui/Card';
import styles from './Panel.module.css';

type Props = { titleId: string; title: string; children: ReactNode };

// One of the cards stacked in the child's space, each named by its own title.
export function Panel({ titleId, title, children }: Props) {
  return (
    <Card className={styles.panel} aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {children}
    </Card>
  );
}
