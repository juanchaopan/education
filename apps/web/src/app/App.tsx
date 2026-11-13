import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ChildRegistrationPage } from '../features/family/pages/ChildRegistrationPage';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import { HomePage } from '../features/family/pages/HomePage';
import { RecoveryPage } from '../features/family/pages/RecoveryPage';
import { ResetPasswordPage } from '../features/family/pages/ResetPasswordPage';
import { VerifyEmailPage } from '../features/family/pages/VerifyEmailPage';
import { ProblemPage } from '../features/library/pages/ProblemPage';
import { useFamilyTimeZone } from '../shared/lib/useFamilyTimeZone';
import { Page } from '../shared/ui/Page';
import { StandaloneLink } from '../shared/ui/StandaloneLink';
import { accountArt, childHomeArt } from './account-art';
import { lessonPages } from './lesson-pages';
import { PlainLayout } from './PlainLayout';
import { ReleaseUpdate } from './release/ReleaseUpdate';
import { SiteLayout } from './SiteLayout';
import { useDayNightTheme } from './theme/useDayNightTheme';
import styles from './App.module.css';

// Links to /child lead to the home page and keep the problem they were on
// the way to.
function ToHome() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

// Three layouts: the pages that bring their own frame across the screen —
// the home page, which is the sign-in or the signed-in child's books, and
// the parents' pages with their scene or their own navigation; the few other
// pages under the site's brand; and a problem's page, which fills the screen
// on its own with a back button. The update notice lies over all of them.
// Every page keeps to the day and night of the family's clock.
export function App() {
  useDayNightTheme(useFamilyTimeZone());
  return (
    <>
      <Routes>
        <Route element={<PlainLayout />}>
          <Route path="/" element={<HomePage art={accountArt} childArt={childHomeArt} />} />
          <Route path="/child" element={<ToHome />} />
          <Route path="/family/recover" element={<RecoveryPage art={accountArt} />} />
          <Route path="/family/reset" element={<ResetPasswordPage art={accountArt} />} />
          <Route path="/family/verify" element={<VerifyEmailPage art={accountArt} />} />
          <Route path="/family/*" element={<FamilyPage art={accountArt} />} />
        </Route>
        <Route element={<SiteLayout />}>
          <Route path="/join" element={<ChildRegistrationPage />} />
          <Route
            path="*"
            element={
              <Page titleId="not-found-title" title="这条小路还没找到" className={styles.missing}>
                <StandaloneLink to="/">回到首页</StandaloneLink>
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
