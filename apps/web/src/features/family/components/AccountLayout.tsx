import type { ReactNode } from 'react';
import { Brand } from '../../../shared/ui/Brand';
import { Card } from '../../../shared/ui/Card';
import styles from './AccountLayout.module.css';

// The picture beside the account pages: a backdrop from the lesson scenes and
// the teaching character standing in it.
export type AccountArt = { backdrop: string; teacher: string };

type Props = {
  art: AccountArt;
  titleId: string;
  title: string;
  // A page whose card says what it is without a heading, such as the sign-in
  // with its two tabs, keeps the title for screen readers only.
  titleHidden?: boolean;
  children: ReactNode;
  // The ways on from this page, such as switching to sign-in or going back.
  footer?: ReactNode;
};

// Sign-up, sign-in, email verification and password recovery: the lit scene
// with its character on one half and the page's card on the other, so the
// account pages look like the lessons a family came for. On a phone the scene
// sits on top and the card overlaps its lower edge. The picture is decoration;
// the card carries everything the page says. The backdrop is the largest
// thing on the page, so it is fetched first.
export function AccountLayout({ art, titleId, title, titleHidden, children, footer }: Props) {
  return (
    <div className={styles.layout}>
      <div className={styles.scene}>
        <img className={styles.backdrop} src={art.backdrop} alt="" fetchPriority="high" />
        <img className={styles.teacher} src={art.teacher} alt="" />
      </div>
      <div className={styles.side}>
        <Card className={styles.card} aria-labelledby={titleId}>
          <Brand />
          <h1 id={titleId} className={titleHidden ? styles.hiddenTitle : styles.title}>
            {title}
          </h1>
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </Card>
      </div>
    </div>
  );
}
