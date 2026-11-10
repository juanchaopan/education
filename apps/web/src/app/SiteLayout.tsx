import { NavLink } from 'react-router-dom';
import { Brand } from '../shared/ui/Brand';
import { Icon } from '../shared/ui/Icon';
import type { IconName } from '../shared/ui/icons';
import { Frame } from './Frame';
import { useScrollMemory } from './useScrollMemory';
import styles from './SiteLayout.module.css';

type Destination = { to: string; icon: IconName; label: string; end?: boolean };

// The children's places sit together in the middle of the header; the
// parents' space stands apart on the right. Both are the main navigation.
const childPlaces: Destination[] = [
  { to: '/', icon: 'sparkle', label: '探索题目', end: true },
  { to: '/child', icon: 'user', label: '孩子空间' },
  { to: '/join', icon: 'key', label: '孩子注册' },
];
const parentSpace: Destination = { to: '/family', icon: 'users', label: '家长空间' };

// A header link with its icon. When the header is too narrow for labels only
// the icon shows; the label stays as the link's name for screen readers.
function SiteLink({ to, icon, label, end, className }: Destination & { className: string }) {
  return (
    <NavLink to={to} end={end} className={className}>
      <Icon name={icon} className={styles.linkIcon} />
      <span className={styles.linkLabel}>{label}</span>
    </NavLink>
  );
}

// The site's own pages: the header with the main navigation above the page
// the route shows, which keeps its scroll position for the child coming back.
export function SiteLayout() {
  useScrollMemory();
  return (
    <Frame className={styles.shell}>
      <header className={styles.header}>
        <Brand className={styles.brand} nameClassName={styles.brandName} />
        <nav aria-label="主导航" className={styles.nav}>
          <ul className={styles.tabs}>
            {childPlaces.map((place) => (
              <li key={place.to}>
                <SiteLink {...place} className={styles.tab} />
              </li>
            ))}
          </ul>
          <SiteLink {...parentSpace} className={styles.parent} />
        </nav>
      </header>
    </Frame>
  );
}
