import { ChildRegistrationPage } from '../features/family/pages/ChildRegistrationPage';
import { ChildPage } from '../features/family/pages/ChildPage';
import { RecoveryPage } from '../features/family/pages/RecoveryPage';
import { ResetPasswordPage } from '../features/family/pages/ResetPasswordPage';
import { VerifyEmailPage } from '../features/family/pages/VerifyEmailPage';
import { NavLink, Route, Routes } from 'react-router-dom';
import { LibraryPage } from '../features/library/pages/LibraryPage';
import { ProblemPage } from '../features/library/pages/ProblemPage';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import { Icon } from '../shared/ui/Icon';
import type { IconName } from '../shared/ui/icons';
import { Page } from '../shared/ui/Page';
import { StandaloneLink } from '../shared/ui/StandaloneLink';
import { lessonPages } from './lesson-pages';
import { ReleaseUpdate } from './release/ReleaseUpdate';
import { useDayNightTheme } from './theme/useDayNightTheme';
import styles from './App.module.css';

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

export function App() {
  useDayNightTheme();
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        跳到主要内容
      </a>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brand} aria-label="小小探索家首页">
          <span className={styles.mark}>
            <Icon name="sprout" />
          </span>
          <span className={styles.brandName}>小小探索家</span>
        </NavLink>
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
      <main id="main" tabIndex={-1} className={styles.main}>
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/problems/:id/:version?" element={<ProblemPage pages={lessonPages} />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/child" element={<ChildPage />} />
          <Route path="/join" element={<ChildRegistrationPage />} />
          <Route path="/family/recover" element={<RecoveryPage />} />
          <Route path="/family/reset" element={<ResetPasswordPage />} />
          <Route path="/family/verify" element={<VerifyEmailPage />} />
          <Route
            path="*"
            element={
              <Page titleId="not-found-title" title="这条小路还没找到" className={styles.missing}>
                <StandaloneLink to="/">回到探索首页</StandaloneLink>
              </Page>
            }
          />
        </Routes>
      </main>
      <ReleaseUpdate />
    </div>
  );
}
