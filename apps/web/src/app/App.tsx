import { ChildRegistrationPage } from '../features/family/pages/ChildRegistrationPage';
import { ChildPage } from '../features/family/pages/ChildPage';
import { RecoveryPage } from '../features/family/pages/RecoveryPage';
import { ResetPasswordPage } from '../features/family/pages/ResetPasswordPage';
import { VerifyEmailPage } from '../features/family/pages/VerifyEmailPage';
import { Route, Routes } from 'react-router-dom';
import { LibraryPage } from '../features/library/pages/LibraryPage';
import { ProblemPage } from '../features/library/pages/ProblemPage';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import { Page } from '../shared/ui/Page';
import { StandaloneLink } from '../shared/ui/StandaloneLink';
import { lessonPages } from './lesson-pages';
import { ReleaseUpdate } from './release/ReleaseUpdate';
import { SiteLayout } from './SiteLayout';
import { useDayNightTheme } from './theme/useDayNightTheme';
import styles from './App.module.css';

// Two layouts: the site's pages under its header, and a problem's page,
// which fills the screen on its own with a back button in place of the
// header. The update notice lies over both.
export function App() {
  useDayNightTheme();
  return (
    <>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<LibraryPage />} />
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
        </Route>
        <Route path="/problems/:id/:version?" element={<ProblemPage pages={lessonPages} />} />
      </Routes>
      <ReleaseUpdate />
    </>
  );
}
