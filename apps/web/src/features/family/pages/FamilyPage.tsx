import { useState } from 'react';
import { preload } from 'react-dom';
import type { ParentSession } from '@education/contracts';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
import { Loading } from '../../../shared/ui/Loading';
import { Notice } from '../../../shared/ui/Notice';
import { StandaloneLink } from '../../../shared/ui/StandaloneLink';
import { AccountLayout, type AccountArt } from '../components/AccountLayout';
import { AccountNotices } from '../components/AccountNotices';
import { FamilyDeleted } from '../components/FamilyDeleted';
import { ParentShell } from '../components/ParentShell';
import { useParentLogout, useParentSession } from '../data-access/useParentSession';
import { LoginPanel } from './LoginPanel';
import { OverviewPage } from './OverviewPage';
import {
  ChildrenSection,
  LearningSection,
  PracticeSection,
  PrivacySection,
} from './ParentSections';
import { RegistrationPanel } from './RegistrationPanel';
import { VerificationPanel } from './VerificationPanel';
import styles from './FamilyPage.module.css';

type Mode = 'register' | 'login';

// The signed-in parent and the way out, shared by the verification step and
// the parent space.
type Account = {
  session: ParentSession;
  leaving: boolean;
  error?: string;
  refreshing: boolean;
  onLogout: () => void;
};

// The parents' entrance, at every address under /family. Signed out, it is
// the sign-up or the sign-in, and signing in opens the address asked for;
// signed in before the email is verified, it is the verification step;
// verified, it is the parent space. A finished deletion signs the page out
// and keeps saying so until the parent moves on to register a new family.
// Until the page knows the parent is verified, the scene's backdrop is
// fetched early, while the page still asks who is signed in.
export function FamilyPage({ art }: { art: AccountArt }) {
  const [mode, setMode] = useState<Mode>('register');
  const [deleted, setDeleted] = useState(false);
  const session = useParentSession();
  const logout = useParentLogout();
  if (session.data?.access !== 'verified')
    preload(art.backdrop, { as: 'image', fetchPriority: 'high' });
  if (deleted)
    return (
      <AccountLayout art={art} titleId="family-deleted-title" title="家庭已删除">
        <FamilyDeleted
          onRegister={() => {
            setDeleted(false);
            setMode('register');
          }}
        />
      </AccountLayout>
    );
  if (session.isPending)
    return (
      <div className={styles.waiting}>
        <Loading label="正在确认登录状态…" />
      </div>
    );
  if (!session.data)
    return <SignedOut art={art} mode={mode} failed={session.isError} onMode={setMode} />;
  const { csrfToken } = session.data;
  const account: Account = {
    session: session.data,
    leaving: logout.isPending,
    error: logout.error?.message,
    refreshing: session.isError,
    onLogout: () => {
      if (logout.isPending) return;
      logout.mutate(csrfToken, {
        onSuccess: () => {
          setMode('login');
          logout.reset();
        },
      });
    },
  };
  if (session.data.access === 'verified')
    return <ParentSpace {...account} onDeleted={() => setDeleted(true)} />;
  return <Unverified art={art} {...account} />;
}

// Sign-up first, since most parents arrive here new; one button switches to
// the sign-in and back. The switch stays the same button in the same place,
// so it keeps the focus. A session that could not be read is said once, in
// turn with the form, since the parent can still sign in.
function SignedOut({
  art,
  mode,
  failed,
  onMode,
}: {
  art: AccountArt;
  mode: Mode;
  failed: boolean;
  onMode: (mode: Mode) => void;
}) {
  const login = mode === 'login';
  return (
    <AccountLayout
      art={art}
      titleId={login ? 'login-title' : 'registration-title'}
      title={login ? '家长登录' : '创建家长账号'}
      footer={
        <>
          {login && (
            <StandaloneLink to="/family/recover">
              <Icon name="lock" />
              忘记密码
            </StandaloneLink>
          )}
          <Button variant="text" onClick={() => onMode(login ? 'register' : 'login')}>
            {login ? '还没有账号？去注册' : '已有账号？去登录'}
          </Button>
        </>
      }
    >
      {failed && <Notice>暂时无法恢复登录状态，请稍后刷新或重新登录。</Notice>}
      {login ? <LoginPanel /> : <RegistrationPanel />}
    </AccountLayout>
  );
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
// overview.
function ParentSpace({
  session,
  leaving,
  error,
  refreshing,
  onLogout,
  onDeleted,
}: Account & { onDeleted: () => void }) {
  const csrf = session.csrfToken;
  return (
    <ParentShell email={session.email} leaving={leaving} onLogout={onLogout}>
      <AccountNotices refreshing={refreshing} error={error} />
      <Routes>
        <Route index element={<OverviewPage key={`overview-${csrf}`} csrf={csrf} />} />
        <Route path="children" element={<ChildrenSection csrf={csrf} />} />
        <Route path="practice" element={<PracticeSection csrf={csrf} />} />
        <Route path="learning" element={<LearningSection csrf={csrf} />} />
        <Route path="privacy" element={<PrivacySection csrf={csrf} onDeleted={onDeleted} />} />
        <Route path="*" element={<Navigate to="/family" replace />} />
      </Routes>
    </ParentShell>
  );
}
