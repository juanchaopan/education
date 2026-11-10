import { Route, Routes } from 'react-router-dom';
import { ChildPage } from '../features/family/pages/ChildPage';
import { ChildRegistrationPage } from '../features/family/pages/ChildRegistrationPage';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import { RecoveryPage } from '../features/family/pages/RecoveryPage';
import { ResetPasswordPage } from '../features/family/pages/ResetPasswordPage';
import { VerifyEmailPage } from '../features/family/pages/VerifyEmailPage';
import { LibraryPage } from '../features/library/pages/LibraryPage';
import { ProblemPage } from '../features/library/pages/ProblemPage';
import { Page } from '../shared/ui/Page';
import { StandaloneLink } from '../shared/ui/StandaloneLink';
import { accountArt } from './account-art';
import { lessonPages } from './lesson-pages';
import { PlainLayout } from './PlainLayout';
import { ReleaseUpdate } from './release/ReleaseUpdate';
import { SiteLayout } from './SiteLayout';
import { useDayNightTheme } from './theme/useDayNightTheme';
import styles from './App.module.css';

// Three layouts: the children's pages under the site's header; the parents'
// pages, which bring their own frame and show a lesson scene beside their
// card; and a problem's page, which fills the screen on its own with a back
// button in place of the header. The update notice lies over all of them.
export function App() {
  useDayNightTheme();
  return (
    <>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/child" element={<ChildPage />} />
          <Route path="/join" element={<ChildRegistrationPage />} />
          <Route
            path="*"
            element={
              <Page titleId="not-found-title" title="这条小路还没找到" className={styles.missing}>
                <StandaloneLink to="/">回到探索首页</StandaloneLink>
              </Page>
            }
          />
        </Route>
        <Route element={<PlainLayout />}>
          <Route path="/family" element={<FamilyPage art={accountArt} />} />
          <Route path="/family/recover" element={<RecoveryPage art={accountArt} />} />
          <Route path="/family/reset" element={<ResetPasswordPage art={accountArt} />} />
          <Route path="/family/verify" element={<VerifyEmailPage art={accountArt} />} />
        </Route>
        <Route path="/problems/:id/:version?" element={<ProblemPage pages={lessonPages} />} />
      </Routes>
      <ReleaseUpdate />
    </>
  );
}
