import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import styles from './Frame.module.css';

type Props = {
  // Places the frame on the screen, such as the site's column of pages.
  className?: string;
  // What comes before the page, such as the site's header.
  children?: ReactNode;
};

// What every page outside a lesson sits in: a link that lets a keyboard skip
// straight to the page, whatever comes before the page, and the page the
// route shows, whose parts rise into place one after another.
export function Frame({ className, children }: Props) {
  return (
    <div className={className}>
      <a className={styles.skip} href="#main">
        跳到主要内容
      </a>
      {children}
      <main id="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
