import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ChildRegistrationPage } from '../features/family/pages/ChildRegistrationPage';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import { HomePage } from '../features/family/pages/HomePage';
import { RecoveryPage } from '../features/family/pages/RecoveryPage';
import { ResetPasswordPage } from '../features/family/pages/ResetPasswordPage';
import { VerifyEmailPage } from '../features/family/pages/VerifyEmailPage';
import { useFamilyTimeZone } from '../shared/lib/useFamilyTimeZone';
import { accountArt, childHomeArt } from './account-art';
import { NotFoundPage } from './NotFoundPage';
import { PlainLayout } from './PlainLayout';
import { ProblemRoute } from './ProblemRoute';
import { ReleaseUpdate } from './release/ReleaseUpdate';
import { SiteLayout } from './SiteLayout';
import { useDayNightTheme } from './theme/useDayNightTheme';

// Links to /child lead to the home page and keep the problem they were on
// the way to.
function ToHome() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

// Three layouts: the pages that bring their own frame across the screen —
// the home page, which is the sign-in or the signed-in child's books, the
// account pages with their scene, and the parents' pages with their own
// navigation; the page for a path that leads nowhere, under the site's
// brand; and a problem's page, which fills the screen on its own with a back
// button. The update notice lies over all of them. Every page keeps to the
// day and night of the family's clock.
export function App() {
  useDayNightTheme(useFamilyTimeZone());
  return (
    <>
      <Routes>
        <Route element={<PlainLayout />}>
          <Route path="/" element={<HomePage art={accountArt} childArt={childHomeArt} />} />
          <Route path="/child" element={<ToHome />} />
          <Route path="/join" element={<ChildRegistrationPage art={accountArt} />} />
          <Route path="/family/recover" element={<RecoveryPage art={accountArt} />} />
          <Route path="/family/reset" element={<ResetPasswordPage art={accountArt} />} />
          <Route path="/family/verify" element={<VerifyEmailPage art={accountArt} />} />
          <Route path="/family/*" element={<FamilyPage art={accountArt} />} />
        </Route>
        <Route element={<SiteLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/problems/:id/:version?" element={<ProblemRoute />} />
      </Routes>
      <ReleaseUpdate />
    </>
  );
}
