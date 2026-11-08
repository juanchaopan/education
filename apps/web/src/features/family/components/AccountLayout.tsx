import type { ReactNode } from 'react';
import { Card } from '../../../shared/ui/Card';
import styles from './AccountLayout.module.css';

type Props = {
  // A few words beside the form about whose account this is.
  introduction: ReactNode;
  titleId: string;
  title: string;
  children: ReactNode;
};

// The sign-in and sign-up pages put a short introduction beside the form's
// card. On a phone the card comes first, so the form is what a person sees.
export function AccountLayout({ introduction, titleId, title, children }: Props) {
  return (
    <div className={styles.layout}>
      <aside className={styles.introduction}>{introduction}</aside>
      <Card className={styles.card} aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </Card>
    </div>
  );
}
