import type { ReactNode } from 'react';
import { Card } from '../../../shared/ui/Card';
import styles from './IntroductionLayout.module.css';

type Props = {
  // A few words beside the form about whose account this is.
  introduction: ReactNode;
  titleId: string;
  title: string;
  children: ReactNode;
};

// The children's sign-in and sign-up put a short introduction beside the
// form's card. On a phone the card comes first, so the form is what a child
// sees.
export function IntroductionLayout({ introduction, titleId, title, children }: Props) {
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
