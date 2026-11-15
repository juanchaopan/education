import { useState } from 'react';
import { preload } from 'react-dom';
import type { ParentSession } from '@education/contracts';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { signInPath } from '../../../shared/lib/sign-in-path';
import { useArrivalScroll } from '../../../shared/lib/useArrivalScroll';
import { Button } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { AccountNotices } from '../components/AccountNotices';
import { FamilyDeleted } from '../components/FamilyDeleted';
import { ParentShell } from '../components/ParentShell';
import { SessionWaiting } from '../components/SessionWaiting';
import { useFillFamilyTimeZone } from '../data-access/useFamilyTimeZoneSetting';
import { useParentLogout, useParentSession } from '../data-access/useParentSession';
import { OverviewPage } from './OverviewPage';
import { LearningSection, PracticeSection, PrivacySection, ProfileSection } from './ParentSections';
import { VerificationPanel } from './VerificationPanel';

// The signed-in parent and the way out, shared by the verification step and
// the parent space.
type Account = {
  session: ParentSession;
  leaving: boolean;
  error?: string;
  refreshing: boolean;
  onLogout: () => void;
};

// The parents' pages, at every address under /family. Signed out, the parent
// is sent to the parent's sign-in, which comes back to the address asked for;
// a parent who signed out on this page lands on the sign-in itself, since
// the session ends while the logout is still finishing. Signed in before the
// email is verified, it is the verification step; verified, it is the parent
// space. A finished deletion signs the page out and keeps saying so until
// the parent moves on to register a new family. Until the page knows the
// parent is verified, the scene's backdrop is fetched early, while the page
// still asks who is signed in.
export function FamilyPage({ art }: { art: AccountArt }) {
  const [deleted, setDeleted] = useState(false);
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const session = useParentSession();
  const logout = useParentLogout();
  if (session.data?.access !== 'verified')
    preload(art.backdrop, { as: 'image', fetchPriority: 'high' });
  if (deleted)
    return (
      <AccountLayout art={art} titleId="family-deleted-title" title="家庭已删除">
        <FamilyDeleted onRegister={() => void navigate('/signup')} />
      </AccountLayout>
    );
  if (session.isPending) return <SessionWaiting label="正在确认登录状态…" />;
  if (!session.data) {
    const back = logout.isIdle ? pathname + search + hash : undefined;
    return <Navigate to={signInPath('parent', back)} replace />;
  }
  const { csrfToken } = session.data;
  const account: Account = {
    session: session.data,
    leaving: logout.isPending,
    error: logout.error?.message,
    refreshing: session.isError,
    onLogout: () => {
      if (!logout.isPending) logout.mutate(csrfToken);
    },
  };
  if (session.data.access === 'verified')
    return <ParentSpace {...account} onDeleted={() => setDeleted(true)} />;
  return <Unverified art={art} {...account} />;
}

// A parent signed in whose account is not verified yet sees only the
// verification step and the way to sign out. Once the mail link is confirmed,
// the step says so, and signing in again opens the parent space.
function Unverified({
  art,
  session,
  leaving,
  error,
  refreshing,
  onLogout,
}: Account & { art: AccountArt }) {
  return (
    <AccountLayout
      art={art}
      titleId="verification-title"
      title="验证家长邮箱"
      footer={
        <Button variant="text" disabled={leaving} onClick={onLogout}>
          <Icon name="logout" />
          {leaving ? '正在退出…' : '退出账号'}
        </Button>
      }
    >
      <AccountNotices refreshing={refreshing} error={error} />
      <VerificationPanel session={session} />
    </AccountLayout>
  );
}

// The verified parent's space: the overview at /family and a page for each
// part of it. An address under /family that names no part leads back to the
// overview. Each part opens at its top, or at the card its address names
// after a "#", as the overview's links do. A family without a time zone of
// its own takes this device's.
function ParentSpace({
  session,
  leaving,
  error,
  refreshing,
  onLogout,
  onDeleted,
}: Account & { onDeleted: () => void }) {
  useArrivalScroll();
  const csrf = session.csrfToken;
  useFillFamilyTimeZone(csrf);
  return (
    <ParentShell email={session.email} leaving={leaving} onLogout={onLogout}>
      <AccountNotices refreshing={refreshing} error={error} />
      <Routes>
        <Route index element={<OverviewPage key={`overview-${csrf}`} csrf={csrf} />} />
        <Route path="profile" element={<ProfileSection csrf={csrf} />} />
        <Route path="practice" element={<PracticeSection csrf={csrf} />} />
        <Route path="learning" element={<LearningSection csrf={csrf} />} />
        <Route path="privacy" element={<PrivacySection csrf={csrf} onDeleted={onDeleted} />} />
        <Route path="*" element={<Navigate to="/family" replace />} />
      </Routes>
    </ParentShell>
  );
}
