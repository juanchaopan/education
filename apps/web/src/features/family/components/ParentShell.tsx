import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Avatar } from '../../../shared/ui/Avatar';
import { Brand } from '../../../shared/ui/Brand';
import { Icon } from '../../../shared/ui/Icon';
import { IconButton } from '../../../shared/ui/IconButton';
import type { IconName } from '../../../shared/ui/icons';
import styles from './ParentShell.module.css';

type Place = { to: string; icon: IconName; label: string; end?: boolean };

// The parts of the parent space, in the order a parent looks after them.
const places: Place[] = [
  { to: '/family', icon: 'home', label: '总览', end: true },
  { to: '/family/children', icon: 'users', label: '孩子' },
  { to: '/family/practice', icon: 'calendar', label: '练习安排' },
  { to: '/family/learning', icon: 'chart', label: '学习记录' },
  { to: '/family/privacy', icon: 'shield', label: '隐私与数据' },
];

type Props = {
  email: string;
  leaving: boolean;
  onLogout: () => void;
  children: ReactNode;
};

// The frame of a verified parent's space. On a wide screen a sidebar holds
// the brand, the parts of the space and the parent's account; on a phone the
// brand and the account sit in a top bar and the parts float in a tab bar at
// the bottom, within reach of a thumb.
export function ParentShell({ email, leaving, onLogout, children }: Props) {
  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <Brand className={styles.brand} nameClassName={styles.brandName} />
        <nav aria-label="家长空间" className={styles.nav}>
          <ul className={styles.places}>
            {places.map(({ to, icon, label, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={styles.place}>
                  <Icon name={icon} className={styles.placeIcon} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.account}>
          <Avatar name={email} />
          <span className={styles.email}>{email}</span>
          <IconButton icon="logout" label="退出账号" disabled={leaving} onClick={onLogout} />
        </div>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
