import { Route, Routes } from 'react-router-dom';
import { BooksPage } from '../features/family/pages/BooksPage';
import { ChildRegistrationPage } from '../features/family/pages/ChildRegistrationPage';
import { FamilyPage } from '../features/family/pages/FamilyPage';
import { HomePage } from '../features/family/pages/HomePage';
import { RecoveryPage } from '../features/family/pages/RecoveryPage';
import { ResetPasswordPage } from '../features/family/pages/ResetPasswordPage';
import { SignInPage } from '../features/family/pages/SignInPage';
import { SignUpPage } from '../features/family/pages/SignUpPage';
import { VerifyEmailPage } from '../features/family/pages/VerifyEmailPage';
import { useFamilyTimeZone } from '../shared/lib/useFamilyTimeZone';
import { accountArt, childHomeArt } from './account-art';
import { NotFoundPage } from './NotFoundPage';
import { PlainLayout } from './PlainLayout';
import { ProblemRoute } from './ProblemRoute';
import { ReleaseUpdate } from './release/ReleaseUpdate';
import { SiteLayout } from './SiteLayout';
import { useDayNightTheme } from './theme/useDayNightTheme';

// Every page has its own address. The home address only leads on, to the
// child's bookshelf, the parent space or the sign-in. Three layouts: the
// pages that bring their own frame across the screen — the account pages
// with their scene, the child's bookshelf and the parent space with its own
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
          <Route path="/" element={<HomePage />} />
          <Route path="/login/child" element={<SignInPage art={accountArt} tab="child" />} />
          <Route path="/login/parent" element={<SignInPage art={accountArt} tab="parent" />} />
          <Route path="/signup" element={<SignUpPage art={accountArt} />} />
          <Route path="/join" element={<ChildRegistrationPage art={accountArt} />} />
          <Route path="/password/forgot" element={<RecoveryPage art={accountArt} />} />
          <Route path="/password/reset" element={<ResetPasswordPage art={accountArt} />} />
          <Route path="/email/verify" element={<VerifyEmailPage art={accountArt} />} />
          <Route path="/books" element={<BooksPage art={childHomeArt} />} />
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
